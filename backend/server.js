import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import initSqlJs from 'sql.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import cron from 'node-cron';
import axios from 'axios';

import { initScheduler, runScheduler } from './services/scheduler.js';
import {
  exchangeCodeForToken as metaExchangeCode,
  getLongLivedToken,
  getUserPages,
  getIgUserId,
} from './services/meta.js';
import { buildAuthUrl as tiktokAuthUrl, exchangeCodeForToken as tiktokExchangeCode } from './services/tiktok.js';
import { buildAuthUrl as linkedinAuthUrl, exchangeCodeForToken as linkedinExchangeCode, getMemberUrn as linkedinGetUrn, isConfigured as linkedinConfigured } from './services/linkedin.js';
import { buildAuthUrl as snapAuthUrl, exchangeCodeForToken as snapExchangeCode, getUserInfo as snapGetUser } from './services/snapchat.js';

dotenv.config();

// ── Crash diagnostics & resilience ────────────────────────────────────────────
// Keep the process alive through non-fatal errors and print the full reason to
// stdout so it is visible in Railway's Deploy Logs.
console.log(`[boot] starting server — node ${process.version}, cwd ${process.cwd()}, PORT=${process.env.PORT || '(unset)'}`);
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason?.stack || reason);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND  = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: FRONTEND, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// ── Multi-tenant identity ─────────────────────────────────────────────────────
// When embedded inside Hovera, every request carries a short-lived JWT signed by
// Hovera with a shared secret (SOCIAL_JWT_SECRET) containing the salon id. We
// verify it and scope ALL data to that salon. With no/invalid token we fall back
// to the "default" tenant so the standalone app keeps working for the owner.
const JWT_SECRET = process.env.SOCIAL_JWT_SECRET || '';
function b64urlToBuf(s) { return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }
function verifyTenantToken(token) {
  try {
    if (!token || !JWT_SECRET) return null;
    const [h, p, sig] = String(token).split('.');
    if (!h || !p || !sig) return null;
    const expected = createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(b64urlToBuf(p).toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    const id = payload.salon_id ?? payload.salonId ?? payload.tenant_id ?? payload.sub;
    return id != null ? String(id) : null;
  } catch { return null; }
}
app.use((req, _res, next) => {
  const auth = req.headers['authorization'] || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const token = bearer || req.headers['x-social-token'] || req.query.t || '';
  req.tenantId = verifyTenantToken(token) || 'default';
  next();
});

// ---- Persistent data dir ----
// Railway's container filesystem is EPHEMERAL — it resets on every redeploy/
// restart, wiping the SQLite db (designs, media, connected accounts, scheduled
// posts) and uploads. Point DATA_DIR at a mounted Railway Volume (e.g. /data)
// so everything survives. Falls back to the app folder for local dev.
const DATA_DIR = process.env.DATA_DIR || __dirname;
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch { /* ignore */ }
console.log(`[boot] data dir: ${DATA_DIR}${process.env.DATA_DIR ? ' (persistent volume)' : ' (ephemeral — set DATA_DIR to a volume)'}`);

// ---- Static file serving for uploads ----
const uploadsDir = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ---- sql.js setup ----
let SQL;
try {
  SQL = await initSqlJs();
  console.log('[boot] sql.js initialized');
} catch (err) {
  console.error('[boot] FATAL: sql.js failed to initialize:', err?.stack || err);
  throw err;
}
const dbPath = path.join(DATA_DIR, 'data.db');

let db;
try {
  db = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();
  console.log(`[boot] database loaded (${fs.existsSync(dbPath) ? 'from file' : 'fresh'})`);
} catch (err) {
  console.error('[boot] could not open existing data.db, starting fresh:', err?.message || err);
  db = new SQL.Database();
}

function save() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

// ---- Schema ----
db.run(`
  CREATE TABLE IF NOT EXISTS designs (
    id TEXT PRIMARY KEY,
    name TEXT,
    size TEXT,
    textLayers TEXT,
    shapes TEXT,
    images TEXT,
    logos TEXT,
    groups TEXT,
    bg TEXT,
    thumbnail TEXT,
    created_date TEXT DEFAULT (datetime('now')),
    updated_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    name TEXT,
    url TEXT,
    type TEXT,
    platform TEXT,
    size INTEGER,
    caption_title TEXT,
    caption_text  TEXT,
    post_id       TEXT,
    position      INTEGER DEFAULT 0,
    created_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS logos (
    id TEXT PRIMARY KEY,
    name TEXT,
    url TEXT,
    isSvg INTEGER DEFAULT 0,
    svgContent TEXT,
    created_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS social_accounts (
    id TEXT PRIMARY KEY,
    platform TEXT,
    username TEXT,
    accountName TEXT,
    isConnected INTEGER DEFAULT 1,
    access_token TEXT,
    page_id TEXT,
    ig_user_id TEXT,
    tiktok_open_id TEXT,
    token_expires_at TEXT,
    verifiedAt TEXT,
    created_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id TEXT PRIMARY KEY,
    caption TEXT,
    platforms TEXT,
    schedule_date TEXT,
    schedule_time TEXT,
    status TEXT DEFAULT 'scheduled',
    media_url TEXT,
    media_thumbnail TEXT,
    media_type TEXT,
    design_id TEXT,
    publish_results TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

const alterCols = [
  `ALTER TABLE social_accounts ADD COLUMN access_token TEXT`,
  `ALTER TABLE social_accounts ADD COLUMN page_id TEXT`,
  `ALTER TABLE social_accounts ADD COLUMN ig_user_id TEXT`,
  `ALTER TABLE social_accounts ADD COLUMN tiktok_open_id TEXT`,
  `ALTER TABLE social_accounts ADD COLUMN token_expires_at TEXT`,
  `ALTER TABLE designs ADD COLUMN pages TEXT`,
  `ALTER TABLE media ADD COLUMN caption_title TEXT`,
  `ALTER TABLE media ADD COLUMN caption_text  TEXT`,
  `ALTER TABLE media ADD COLUMN post_id       TEXT`,
  `ALTER TABLE media ADD COLUMN position      INTEGER DEFAULT 0`,
  `ALTER TABLE scheduled_posts ADD COLUMN post_type TEXT DEFAULT 'feed'`,
  // Multi-tenant: every row belongs to a salon (tenant). "default" = standalone.
  `ALTER TABLE designs ADD COLUMN tenant_id TEXT DEFAULT 'default'`,
  `ALTER TABLE media ADD COLUMN tenant_id TEXT DEFAULT 'default'`,
  `ALTER TABLE logos ADD COLUMN tenant_id TEXT DEFAULT 'default'`,
  `ALTER TABLE social_accounts ADD COLUMN tenant_id TEXT DEFAULT 'default'`,
  `ALTER TABLE scheduled_posts ADD COLUMN tenant_id TEXT DEFAULT 'default'`,
];
alterCols.forEach((sql) => {
  try { db.run(sql); } catch { /* column already exists */ }
});

save();

// ---- DB helpers ----
function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] ?? null;
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
}

function applySort(rows, sort) {
  if (!sort) return rows;
  const desc = sort.startsWith('-');
  const field = sort.replace(/^-/, '');
  return [...rows].sort((a, b) => {
    const av = String(a[field] ?? '');
    const bv = String(b[field] ?? '');
    return desc ? bv.localeCompare(av) : av.localeCompare(bv);
  });
}

function boolField(val) {
  return val === 1 || val === true || val === 'true';
}

function toSqlVal(v) {
  return typeof v === 'boolean' ? (v ? 1 : 0) : v;
}

// ---- Generic CRUD factory ----
function crudRouter(table, transform) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const { sort, limit } = req.query;
    let rows = queryAll(`SELECT * FROM ${table} WHERE tenant_id = ?`, [req.tenantId]);
    if (transform) rows = rows.map(transform);
    rows = applySort(rows, sort);
    if (limit) rows = rows.slice(0, parseInt(limit));
    res.json(rows);
  });

  router.get('/:id', (req, res) => {
    let row = queryOne(`SELECT * FROM ${table} WHERE id = ? AND tenant_id = ?`, [req.params.id, req.tenantId]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (transform) row = transform(row);
    res.json(row);
  });

  router.post('/', (req, res) => {
    try {
      const id = randomUUID();
      const data = { id, ...req.body, tenant_id: req.tenantId };
      const cols = Object.keys(data);
      const placeholders = cols.map(() => '?').join(', ');
      run(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
        cols.map(c => toSqlVal(data[c]))
      );
      let row = queryOne(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (transform) row = transform(row);
      res.status(201).json(row);
    } catch (err) {
      console.error(`[POST /${table}] Error:`, err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/:id', (req, res) => {
    try {
      const existing = queryOne(`SELECT * FROM ${table} WHERE id = ? AND tenant_id = ?`, [req.params.id, req.tenantId]);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const updates = { ...req.body };
      delete updates.tenant_id; // never let a client move a row to another tenant
      if (table === 'designs') updates.updated_date = new Date().toISOString();
      const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      run(
        `UPDATE ${table} SET ${sets} WHERE id = ? AND tenant_id = ?`,
        [...Object.values(updates).map(toSqlVal), req.params.id, req.tenantId]
      );
      let row = queryOne(`SELECT * FROM ${table} WHERE id = ? AND tenant_id = ?`, [req.params.id, req.tenantId]);
      if (transform) row = transform(row);
      res.json(row);
    } catch (err) {
      console.error(`[PUT /${table}/:id] Error:`, err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:id', (req, res) => {
    run(`DELETE FROM ${table} WHERE id = ? AND tenant_id = ?`, [req.params.id, req.tenantId]);
    res.json({ success: true });
  });

  return router;
}

// ---- CRUD Routes ----
// Mounted under BOTH `/X` and `/api/X`: the dev proxy may or may not strip the
// `/api` prefix, and in production the frontend calls `/api/...` on the same
// origin, so we register both to be safe.
const socialAccountsRouter = () => crudRouter('social_accounts', row => ({
  ...row,
  isConnected: boolField(row.isConnected),
}));
const logosRouter = () => crudRouter('logos', row => ({ ...row, isSvg: boolField(row.isSvg) }));
for (const prefix of ['', '/api']) {
  app.use(`${prefix}/designs`, crudRouter('designs'));
  app.use(`${prefix}/media`, crudRouter('media'));
  app.use(`${prefix}/logos`, logosRouter());
  app.use(`${prefix}/social-accounts`, socialAccountsRouter());
}

// ---- Scheduled Posts Routes ----
const postsRouter = express.Router();

postsRouter.get('/', (req, res) => {
  const { status, sort = '-created_at' } = req.query;
  let rows = status
    ? queryAll(`SELECT * FROM scheduled_posts WHERE status = ? AND tenant_id = ?`, [status, req.tenantId])
    : queryAll(`SELECT * FROM scheduled_posts WHERE tenant_id = ?`, [req.tenantId]);
  rows = applySort(rows, sort);
  rows = rows.map(p => ({
    ...p,
    platforms:       tryParse(p.platforms, []),
    publish_results: tryParse(p.publish_results, {}),
  }));
  res.json(rows);
});

postsRouter.post('/', (req, res) => {
  const id   = req.body.id || randomUUID();
  const post = {
    id,
    caption:        req.body.caption || '',
    platforms:      JSON.stringify(req.body.platforms || []),
    schedule_date:  req.body.scheduleDate || req.body.schedule_date || '',
    schedule_time:  req.body.scheduleTime || req.body.schedule_time || '',
    status:         req.body.status || 'scheduled',
    media_url:      req.body.media?.url || req.body.media_url || '',
    media_thumbnail:req.body.media?.thumbnail || req.body.media_thumbnail || '',
    media_type:     req.body.media?.type || req.body.media_type || 'image',
    post_type:      req.body.postType || req.body.post_type || 'feed',
    design_id:      req.body.designId || req.body.design_id || '',
    publish_results:'{}',
    tenant_id:      req.tenantId,
  };

  run(`DELETE FROM scheduled_posts WHERE id = ? AND tenant_id = ?`, [id, req.tenantId]);
  run(
    `INSERT INTO scheduled_posts (${Object.keys(post).join(',')}) VALUES (${Object.keys(post).map(() => '?').join(',')})`,
    Object.values(post)
  );

  res.status(201).json({ ...post, platforms: req.body.platforms || [] });
});

postsRouter.put('/:id', (req, res) => {
  const existing = queryOne(`SELECT * FROM scheduled_posts WHERE id = ? AND tenant_id = ?`, [req.params.id, req.tenantId]);
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  const updates = {};
  if (req.body.status)        updates.status = req.body.status;
  if (req.body.caption)       updates.caption = req.body.caption;
  if (req.body.platforms)     updates.platforms = JSON.stringify(req.body.platforms);
  if (req.body.scheduleDate)  updates.schedule_date = req.body.scheduleDate;
  if (req.body.scheduleTime)  updates.schedule_time = req.body.scheduleTime;
  updates.updated_at = new Date().toISOString();

  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  run(`UPDATE scheduled_posts SET ${sets} WHERE id = ? AND tenant_id = ?`, [...Object.values(updates), req.params.id, req.tenantId]);

  res.json({ success: true });
});

postsRouter.delete('/:id', (req, res) => {
  run(`DELETE FROM scheduled_posts WHERE id = ? AND tenant_id = ?`, [req.params.id, req.tenantId]);
  res.json({ success: true });
});

app.use('/api/posts', postsRouter);

// ---- OAuth: Meta ----
app.get('/auth/meta', (req, res) => {
  // Exactly the permissions granted by the Instagram API "Manage content on
  // Instagram" use case (Facebook-login setup). Requesting anything outside this
  // set triggers Facebook's "Invalid Scopes" error.
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',   // نشر على صفحة فيسبوك (يتطلب use case "Manage everything on your Page")
    'business_management',
  ].join(',');

  // Carry the tenant (salon) through OAuth via `state`, since the callback is a
  // redirect from Facebook and won't have our token. Format: "meta_oauth.<tenant>".
  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID,
    redirect_uri:  process.env.META_REDIRECT_URI,
    scope:         scopes,
    response_type: 'code',
    state:         `meta_oauth.${encodeURIComponent(req.tenantId)}`,
  });

  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

app.get('/auth/meta/callback', async (req, res) => {
  const { code, error, state } = req.query;
  // Recover the tenant we stashed in `state` ("meta_oauth.<tenant>").
  const tenantId = (typeof state === 'string' && state.includes('.'))
    ? decodeURIComponent(state.split('.').slice(1).join('.')) : 'default';

  if (error || !code) {
    return res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=meta`);
  }

  try {
    const tokenData = await metaExchangeCode(
      code,
      process.env.META_REDIRECT_URI
    );

    const longToken = await getLongLivedToken(tokenData.access_token);
    const accessToken = longToken.access_token || tokenData.access_token;

    const pages = await getUserPages(accessToken);
    // Prefer the page that's linked to an Instagram business account (that's the
    // one we publish to) — avoids picking the wrong page when several exist.
    const page  = pages.find(p => p.instagram_business_account) || pages[0];

    let igUserId = null;
    let pageAccessToken = accessToken;
    let pageId = null;
    let accountName = 'Meta Account';

    if (page) {
      pageId          = page.id;
      pageAccessToken = page.access_token || accessToken;
      accountName     = page.name;
      igUserId        = await getIgUserId(pageId, pageAccessToken);
    }

    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    run(`DELETE FROM social_accounts WHERE platform = ? AND tenant_id = ?`, ['meta', tenantId]);
    run(
      `INSERT INTO social_accounts (id, platform, username, accountName, isConnected, access_token, page_id, ig_user_id, token_expires_at, verifiedAt, tenant_id)
       VALUES (?, 'meta', ?, ?, 1, ?, ?, ?, ?, datetime('now'), ?)`,
      [randomUUID(), accountName, accountName, pageAccessToken, pageId || '', igUserId || '', expiresAt, tenantId]
    );

    console.log(`[OAuth] Meta connected: ${accountName}`);
    res.redirect(`${FRONTEND}/AccountsPage?oauth=success&platform=meta`);
  } catch (err) {
    console.error('[OAuth Meta]', err.message);
    res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=meta`);
  }
});

// ---- OAuth: TikTok ----
app.get('/auth/tiktok', (req, res) => {
  const url = tiktokAuthUrl(`tiktok_oauth.${encodeURIComponent(req.tenantId)}`);
  res.redirect(url);
});

app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, error, state } = req.query;
  const tenantId = (typeof state === 'string' && state.includes('.'))
    ? decodeURIComponent(state.split('.').slice(1).join('.')) : 'default';

  if (error || !code) {
    return res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=tiktok`);
  }

  try {
    const tokenData = await tiktokExchangeCode(code);
    const { access_token, open_id, refresh_token } = tokenData;

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 86400) * 1000).toISOString();

    run(`DELETE FROM social_accounts WHERE platform = ? AND tenant_id = ?`, ['tiktok', tenantId]);
    run(
      `INSERT INTO social_accounts (id, platform, username, accountName, isConnected, access_token, tiktok_open_id, token_expires_at, verifiedAt, tenant_id)
       VALUES (?, 'tiktok', ?, 'TikTok Account', 1, ?, ?, ?, datetime('now'), ?)`,
      [randomUUID(), open_id || 'tiktok_user', access_token, open_id || '', expiresAt, tenantId]
    );

    console.log('[OAuth] TikTok connected');
    res.redirect(`${FRONTEND}/AccountsPage?oauth=success&platform=tiktok`);
  } catch (err) {
    console.error('[OAuth TikTok]', err.message);
    res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=tiktok`);
  }
});

// ---- OAuth: Snapchat ----
// ---- OAuth: LinkedIn ----
app.get('/auth/linkedin', (req, res) => {
  if (!linkedinConfigured()) {
    return res.status(503).send('LinkedIn غير مهيّأ بعد — لم تُضبط مفاتيح LINKEDIN_CLIENT_ID/SECRET/REDIRECT_URI.');
  }
  res.redirect(linkedinAuthUrl(`linkedin_oauth.${encodeURIComponent(req.tenantId)}`));
});

app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, error, state } = req.query;
  const tenantId = (typeof state === 'string' && state.includes('.'))
    ? decodeURIComponent(state.split('.').slice(1).join('.')) : 'default';

  if (error || !code) {
    return res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=linkedin`);
  }
  try {
    const tokenData = await linkedinExchangeCode(code);
    const accessToken = tokenData.access_token;
    const urn = await linkedinGetUrn(accessToken);
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 5184000) * 1000).toISOString();

    run(`DELETE FROM social_accounts WHERE platform = ? AND tenant_id = ?`, ['linkedin', tenantId]);
    run(
      `INSERT INTO social_accounts (id, platform, username, accountName, isConnected, access_token, page_id, token_expires_at, verifiedAt, tenant_id)
       VALUES (?, 'linkedin', ?, 'LinkedIn', 1, ?, ?, ?, datetime('now'), ?)`,
      [randomUUID(), urn, accessToken, urn, expiresAt, tenantId]
    );

    console.log('[OAuth] LinkedIn connected');
    res.redirect(`${FRONTEND}/AccountsPage?oauth=success&platform=linkedin`);
  } catch (err) {
    console.error('[OAuth LinkedIn]', err?.response?.data || err.message);
    res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=linkedin`);
  }
});

app.get('/auth/snapchat', (req, res) => {
  const url = snapAuthUrl('snapchat_oauth');
  res.redirect(url);
});

app.get('/auth/snapchat/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=snapchat`);
  }
  try {
    const tokenData = await snapExchangeCode(code);
    const { access_token, refresh_token, expires_in } = tokenData;
    const userInfo = await snapGetUser(access_token).catch(() => ({ username: 'snapchat_user', accountName: 'Snapchat Account', avatar: null }));
    const expiresAt = new Date(Date.now() + (expires_in || 86400) * 1000).toISOString();

    run(`DELETE FROM social_accounts WHERE platform = ?`, ['snapchat']);
    run(
      `INSERT INTO social_accounts (id, platform, username, accountName, isConnected, access_token, token_expires_at, verifiedAt)
       VALUES (?, 'snapchat', ?, ?, 1, ?, ?, datetime('now'))`,
      [randomUUID(), userInfo.username, userInfo.accountName, access_token, expiresAt]
    );

    console.log('[OAuth] Snapchat connected');
    res.redirect(`${FRONTEND}/AccountsPage?oauth=success&platform=snapchat`);
  } catch (err) {
    console.error('[OAuth Snapchat]', err.message);
    res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=snapchat`);
  }
});

// ---- File upload endpoint ----
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const url = `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;
  res.json({ file_url: url, url });
});

app.post('/api/upload-base64', (req, res) => {
  try {
    const { base64, filename } = req.body;
    if (!base64) return res.status(400).json({ error: 'No image' });
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    const ext  = base64.match(/data:image\/(\w+);/)?.[1] || 'png';
    const name = filename || `img_${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, name), Buffer.from(data, 'base64'));
    const url = `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/${name}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Fetch a remote image by URL (server-side, bypasses CORS / hotlink) ----
// Returns a base64 data URL so the frontend can drop it straight onto the canvas
// and it survives export (same-origin / inline data).
app.post('/api/fetch-image', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'رابط غير صالح' });
    }
    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      maxContentLength: 25 * 1024 * 1024,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: url },
    });
    const ct = (resp.headers['content-type'] || 'image/png').split(';')[0].trim();
    if (!ct.startsWith('image/')) {
      return res.status(415).json({ error: 'الرابط لا يشير إلى صورة' });
    }
    const b64 = Buffer.from(resp.data).toString('base64');
    res.json({ dataUrl: `data:${ct};base64,${b64}` });
  } catch (err) {
    res.status(502).json({ error: err?.message || 'تعذّر جلب الصورة' });
  }
});

// ---- AI image generation (Google Gemini "Nano Banana") ----
// Generates a branded image from a text prompt + an optional reference logo
// image, so the whole "write prompt → get image" loop happens inside the app
// (no copy-pasting into an external tool). Needs GEMINI_API_KEY in the env.
// Model is overridable via GEMINI_IMAGE_MODEL (defaults to the stable Nano
// Banana image model).
app.post('/api/generate-image', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'مولّد الصور غير مفعّل بعد — لم يتم ضبط مفتاح Google (GEMINI_API_KEY).' });
    }
    const { prompt, referenceImage, aspectRatio, model: modelOverride } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'النص (البرومبت) مطلوب' });
    }
    const model = (typeof modelOverride === 'string' && modelOverride.trim())
      || process.env.GEMINI_IMAGE_MODEL
      || 'gemini-3-pro-image-preview';

    const parts = [{ text: prompt }];
    // Optional reference image (e.g. the Hovera logo). Accept either a data
    // URL ("data:image/png;base64,…") or bare base64.
    if (referenceImage && typeof referenceImage === 'string') {
      const m = referenceImage.match(/^data:([^;]+);base64,(.*)$/);
      const data = m ? m[2] : referenceImage;
      const mime = m ? m[1] : 'image/png';
      if (data) parts.push({ inline_data: { mime_type: mime, data } });
    }

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await axios.post(url, body, {
      timeout: 120000,
      headers: { 'Content-Type': 'application/json' },
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
    });

    const candParts = resp.data?.candidates?.[0]?.content?.parts || [];
    const imgPart = candParts.find((p) => p.inlineData || p.inline_data);
    const inline = imgPart?.inlineData || imgPart?.inline_data;
    if (!inline?.data) {
      const textPart = candParts.find((p) => p.text)?.text;
      return res.status(502).json({ error: 'لم يُرجع المحرّك صورة. حاول تبسيط الوصف.', detail: textPart || 'no image returned' });
    }
    const mime = inline.mimeType || inline.mime_type || 'image/png';
    res.json({ dataUrl: `data:${mime};base64,${inline.data}` });
  } catch (err) {
    const detail = err?.response?.data?.error?.message || err?.message || 'خطأ غير معروف';
    console.error('[generate-image]', detail);
    res.status(502).json({ error: 'تعذّر توليد الصورة', detail });
  }
});

// ---- Health check ----
app.get('/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---- TikTok URL-prefix verification ----
// TikTok checks for this exact file at the domain root to confirm ownership.
// Also overridable via env if TikTok rotates the token.
app.get('/tiktok82i5AkjFeMrzi1Al4f4pAomO3OKLvYDB.txt', (_, res) => {
  res.type('text/plain').send('tiktok-developers-site-verification=82i5AkjFeMrzi1Al4f4pAomO3OKLvYDB');
});
if (process.env.TIKTOK_VERIFY_FILE && process.env.TIKTOK_VERIFY_CONTENT) {
  app.get(`/${process.env.TIKTOK_VERIFY_FILE}`, (_, res) =>
    res.type('text/plain').send(process.env.TIKTOK_VERIFY_CONTENT));
}

// ---- Serve the built frontend (production / single Railway service) ----
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  console.warn('dist/ not found - run "npm run build" before starting in production.');
}

// ---- Scheduler init ----
try {
  initScheduler(() => db, save);
  cron.schedule('* * * * *', () => {
    runScheduler().catch(e => console.error('[Scheduler Error]', e?.stack || e));
  });
} catch (err) {
  console.error('[boot] scheduler setup failed (continuing without it):', err?.stack || err);
}

// ---- Start ----
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Scheduler: every minute');
});
server.on('error', (err) => {
  console.error('[boot] FATAL: server failed to bind:', err?.stack || err);
  process.exit(1);
});
