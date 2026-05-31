import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import initSqlJs from 'sql.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { randomUUID } from 'crypto';
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

// ---- Static file serving for uploads ----
const uploadsDir = path.join(__dirname, 'uploads');
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
const dbPath = path.join(__dirname, 'data.db');

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
    let rows = queryAll(`SELECT * FROM ${table}`);
    if (transform) rows = rows.map(transform);
    rows = applySort(rows, sort);
    if (limit) rows = rows.slice(0, parseInt(limit));
    res.json(rows);
  });

  router.get('/:id', (req, res) => {
    let row = queryOne(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (transform) row = transform(row);
    res.json(row);
  });

  router.post('/', (req, res) => {
    try {
      const id = randomUUID();
      const data = { id, ...req.body };
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
      const existing = queryOne(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const updates = { ...req.body };
      if (table === 'designs') updates.updated_date = new Date().toISOString();
      const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      run(
        `UPDATE ${table} SET ${sets} WHERE id = ?`,
        [...Object.values(updates).map(toSqlVal), req.params.id]
      );
      let row = queryOne(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (transform) row = transform(row);
      res.json(row);
    } catch (err) {
      console.error(`[PUT /${table}/:id] Error:`, err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:id', (req, res) => {
    run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  });

  return router;
}

// ---- CRUD Routes ----
app.use('/designs', crudRouter('designs'));
app.use('/media', crudRouter('media'));
app.use('/logos', crudRouter('logos', row => ({ ...row, isSvg: boolField(row.isSvg) })));
app.use('/social-accounts', crudRouter('social_accounts', row => ({
  ...row,
  isConnected: boolField(row.isConnected),
})));

// ---- Scheduled Posts Routes ----
const postsRouter = express.Router();

postsRouter.get('/', (req, res) => {
  const { status, sort = '-created_at' } = req.query;
  let rows = status
    ? queryAll(`SELECT * FROM scheduled_posts WHERE status = ?`, [status])
    : queryAll(`SELECT * FROM scheduled_posts`);
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
    design_id:      req.body.designId || req.body.design_id || '',
    publish_results:'{}',
  };

  run(`DELETE FROM scheduled_posts WHERE id = ?`, [id]);
  run(
    `INSERT INTO scheduled_posts (${Object.keys(post).join(',')}) VALUES (${Object.keys(post).map(() => '?').join(',')})`,
    Object.values(post)
  );

  res.status(201).json({ ...post, platforms: req.body.platforms || [] });
});

postsRouter.put('/:id', (req, res) => {
  const existing = queryOne(`SELECT * FROM scheduled_posts WHERE id = ?`, [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  const updates = {};
  if (req.body.status)        updates.status = req.body.status;
  if (req.body.caption)       updates.caption = req.body.caption;
  if (req.body.platforms)     updates.platforms = JSON.stringify(req.body.platforms);
  if (req.body.scheduleDate)  updates.schedule_date = req.body.scheduleDate;
  if (req.body.scheduleTime)  updates.schedule_time = req.body.scheduleTime;
  updates.updated_at = new Date().toISOString();

  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  run(`UPDATE scheduled_posts SET ${sets} WHERE id = ?`, [...Object.values(updates), req.params.id]);

  res.json({ success: true });
});

postsRouter.delete('/:id', (req, res) => {
  run(`DELETE FROM scheduled_posts WHERE id = ?`, [req.params.id]);
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
    'business_management',
  ].join(',');

  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID,
    redirect_uri:  process.env.META_REDIRECT_URI,
    scope:         scopes,
    response_type: 'code',
    state:         'meta_oauth',
  });

  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

app.get('/auth/meta/callback', async (req, res) => {
  const { code, error } = req.query;

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

    run(`DELETE FROM social_accounts WHERE platform = ?`, ['meta']);
    run(
      `INSERT INTO social_accounts (id, platform, username, accountName, isConnected, access_token, page_id, ig_user_id, token_expires_at, verifiedAt)
       VALUES (?, 'meta', ?, ?, 1, ?, ?, ?, ?, datetime('now'))`,
      [randomUUID(), accountName, accountName, pageAccessToken, pageId || '', igUserId || '', expiresAt]
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
  const url = tiktokAuthUrl('tiktok_oauth');
  res.redirect(url);
});

app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=tiktok`);
  }

  try {
    const tokenData = await tiktokExchangeCode(code);
    const { access_token, open_id, refresh_token } = tokenData;

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 86400) * 1000).toISOString();

    run(`DELETE FROM social_accounts WHERE platform = ?`, ['tiktok']);
    run(
      `INSERT INTO social_accounts (id, platform, username, accountName, isConnected, access_token, tiktok_open_id, token_expires_at, verifiedAt)
       VALUES (?, 'tiktok', ?, 'TikTok Account', 1, ?, ?, ?, datetime('now'))`,
      [randomUUID(), open_id || 'tiktok_user', access_token, open_id || '', expiresAt]
    );

    console.log('[OAuth] TikTok connected');
    res.redirect(`${FRONTEND}/AccountsPage?oauth=success&platform=tiktok`);
  } catch (err) {
    console.error('[OAuth TikTok]', err.message);
    res.redirect(`${FRONTEND}/AccountsPage?oauth=error&platform=tiktok`);
  }
});

// ---- OAuth: Snapchat ----
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

// ---- Health check ----
app.get('/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

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
