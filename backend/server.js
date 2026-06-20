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
import { isConfigured as waConfigured, sendTemplate as waSendTemplate, sendText as waSendText, listTemplates as waListTemplates, createTemplate as waCreateTemplate } from './services/whatsapp.js';
import { buildAuthUrl as linkedinAuthUrl, exchangeCodeForToken as linkedinExchangeCode, getMemberUrn as linkedinGetUrn, getAdminOrg as linkedinGetAdminOrg, isConfigured as linkedinConfigured } from './services/linkedin.js';
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

  -- ── Accounting / المحاسبة ────────────────────────────────────────────────
  -- Every income/expense movement for a salon. VAT (ضريبة القيمة المضافة)
  -- is stored explicitly so KSA tax reports (output vs input tax) are exact.
  CREATE TABLE IF NOT EXISTS fin_transactions (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'income',          -- 'income' | 'expense'
    category TEXT,                       -- service / rent / salaries ... (key)
    description TEXT,
    amount REAL DEFAULT 0,               -- net amount before VAT (الصافي)
    vat_rate REAL DEFAULT 15,            -- % applied
    vat_amount REAL DEFAULT 0,           -- VAT value (قيمة الضريبة)
    total REAL DEFAULT 0,               -- amount + vat_amount (الإجمالي)
    payment_method TEXT DEFAULT 'cash',  -- cash / mada / transfer / applepay / credit
    ref_no TEXT,                         -- invoice / receipt reference (من النظام الأساسي)
    employee_id TEXT,                    -- optional: who performed the service
    employee_name TEXT,
    txn_date TEXT,                       -- the accounting date (YYYY-MM-DD)
    notes TEXT,
    tenant_id TEXT DEFAULT 'default',
    created_date TEXT DEFAULT (datetime('now'))
  );

  -- Salon staff for payroll & commissions (الرواتب والعمولات)
  CREATE TABLE IF NOT EXISTS fin_employees (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,                           -- كوافيرة / مكياج / استقبال ...
    phone TEXT,
    base_salary REAL DEFAULT 0,          -- الراتب الأساسي الشهري
    commission_rate REAL DEFAULT 0,      -- نسبة العمولة %
    active INTEGER DEFAULT 1,
    notes TEXT,
    tenant_id TEXT DEFAULT 'default',
    created_date TEXT DEFAULT (datetime('now'))
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
  // Carousel/album: JSON array of image URLs when a post has more than one image.
  `ALTER TABLE scheduled_posts ADD COLUMN media_items TEXT`,
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
const finTransactionsRouter = () => crudRouter('fin_transactions', row => ({
  ...row,
  amount: Number(row.amount) || 0,
  vat_rate: Number(row.vat_rate) || 0,
  vat_amount: Number(row.vat_amount) || 0,
  total: Number(row.total) || 0,
}));
const finEmployeesRouter = () => crudRouter('fin_employees', row => ({
  ...row,
  base_salary: Number(row.base_salary) || 0,
  commission_rate: Number(row.commission_rate) || 0,
  active: boolField(row.active),
}));
for (const prefix of ['', '/api']) {
  app.use(`${prefix}/designs`, crudRouter('designs'));
  app.use(`${prefix}/media`, crudRouter('media'));
  app.use(`${prefix}/logos`, logosRouter());
  app.use(`${prefix}/social-accounts`, socialAccountsRouter());
  app.use(`${prefix}/fin-transactions`, finTransactionsRouter());
  app.use(`${prefix}/fin-employees`, finEmployeesRouter());
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
    media_items:    JSON.stringify(req.body.media?.items || req.body.media_items || []),
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
  // NOTE: advanced engagement permissions (instagram_manage_comments /
  // instagram_manage_insights / pages_manage_engagement) are parked until the
  // official Hovera + Meta App Review. Keeping only the approved, working set so
  // reconnecting never fails on unavailable scopes.
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',   // نشر على صفحة فيسبوك
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
    // Post on behalf of the user's COMPANY PAGE, not their personal profile.
    // If LINKEDIN_ORG_URN is configured, use it directly (only needs write
    // scope). Otherwise auto-discover the page the user administers.
    let authorUrn, pageName;
    if (process.env.LINKEDIN_ORG_URN) {
      authorUrn = process.env.LINKEDIN_ORG_URN;
      pageName = process.env.LINKEDIN_ORG_NAME || 'LinkedIn Page';
    } else {
      const org = await linkedinGetAdminOrg(accessToken);
      authorUrn = org.urn; pageName = org.name;
    }
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 5184000) * 1000).toISOString();

    run(`DELETE FROM social_accounts WHERE platform = ? AND tenant_id = ?`, ['linkedin', tenantId]);
    run(
      `INSERT INTO social_accounts (id, platform, username, accountName, isConnected, access_token, page_id, token_expires_at, verifiedAt, tenant_id)
       VALUES (?, 'linkedin', ?, ?, 1, ?, ?, ?, datetime('now'), ?)`,
      [randomUUID(), pageName, pageName, accessToken, authorUrn, expiresAt, tenantId]
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

// ---- Engagement inbox (your own posts + comments) ----
// Lets the owner browse their connected Page/IG posts, read comments, and
// reply — for THEIR OWN accounts only (no public-feed browsing; platforms
// don't allow that). Reading FB comments needs pages_read_engagement (already
// granted). Replying / reading IG comments needs pages_manage_engagement /
// instagram_manage_comments — if not granted yet, we surface a clear message.
const GRAPH = 'https://graph.facebook.com/v19.0';
function metaAccount(tenantId) {
  return queryOne(
    `SELECT * FROM social_accounts WHERE platform='meta' AND tenant_id=? AND isConnected=1 LIMIT 1`,
    [tenantId]
  );
}

app.get('/api/engagement/feed', async (req, res) => {
  try {
    const acc = metaAccount(req.tenantId);
    if (!acc) return res.json({ posts: [], connected: false });
    const token = acc.access_token;
    const out = [];
    const debug = { hasPage: !!acc.page_id, hasIg: !!acc.ig_user_id, fbError: null, igError: null, igInsightsError: null };
    if (acc.page_id) {
      try {
        const r = await axios.get(`${GRAPH}/${acc.page_id}/posts`, {
          params: { fields: 'id,message,created_time,full_picture,permalink_url,comments.summary(true).limit(0),reactions.summary(true).limit(0),shares', limit: 25, access_token: token },
          timeout: 20000,
        });
        for (const p of r.data?.data || []) out.push({
          platform: 'facebook', id: p.id, message: p.message || '', image: p.full_picture || null,
          created: p.created_time, commentsCount: p.comments?.summary?.total_count || 0,
          likesCount: p.reactions?.summary?.total_count || 0, sharesCount: p.shares?.count || 0,
          permalink: p.permalink_url || null,
        });
      } catch (e) { debug.fbError = e.response?.data?.error?.message || e.message; }
    }
    if (acc.ig_user_id) {
      try {
        const r = await axios.get(`${GRAPH}/${acc.ig_user_id}/media`, {
          params: { fields: 'id,caption,media_url,thumbnail_url,timestamp,permalink,comments_count,like_count', limit: 25, access_token: token },
          timeout: 20000,
        });
        const igPosts = (r.data?.data || []).map((p) => ({
          platform: 'instagram', id: p.id, message: p.caption || '', image: p.media_url || p.thumbnail_url || null,
          created: p.timestamp, commentsCount: p.comments_count || 0, likesCount: p.like_count || 0, sharesCount: 0,
          viewsCount: 0, permalink: p.permalink || null,
        }));
        // Views per media (best-effort; needs instagram_manage_insights). IG
        // unified "views" covers all post types; fall back to reach.
        await Promise.all(igPosts.map(async (p) => {
          for (const metric of ['views', 'reach']) {
            try {
              const ins = await axios.get(`${GRAPH}/${p.id}/insights`, { params: { metric, access_token: token }, timeout: 15000 });
              const d = ins.data?.data?.[0];
              const v = d?.total_value?.value ?? d?.values?.[0]?.value;
              if (v != null) { p.viewsCount = v; break; }
            } catch (ie) { if (!debug.igInsightsError) debug.igInsightsError = ie.response?.data?.error?.message || ie.message; }
          }
        }));
        for (const p of igPosts) out.push(p);
      } catch (e) { debug.igError = e.response?.data?.error?.message || e.message; }
    }
    out.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    res.json({ posts: out, connected: true, debug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/engagement/comments', async (req, res) => {
  try {
    const acc = metaAccount(req.tenantId);
    if (!acc) return res.json({ comments: [] });
    const token = acc.access_token;
    const { platform, postId } = req.query;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    let comments = [];
    if (platform === 'instagram') {
      const r = await axios.get(`${GRAPH}/${postId}/comments`, {
        params: { fields: 'id,text,username,timestamp,replies{id,text,username,timestamp}', access_token: token }, timeout: 20000,
      });
      comments = (r.data?.data || []).map((c) => ({
        id: c.id, from: c.username || '', text: c.text || '', created: c.timestamp,
        replies: (c.replies?.data || []).map((rp) => ({ id: rp.id, from: rp.username || '', text: rp.text || '', created: rp.timestamp })),
      }));
    } else {
      const r = await axios.get(`${GRAPH}/${postId}/comments`, {
        params: { fields: 'id,message,from,created_time,comments{id,message,from,created_time}', access_token: token }, timeout: 20000,
      });
      comments = (r.data?.data || []).map((c) => ({
        id: c.id, from: c.from?.name || '', text: c.message || '', created: c.created_time,
        replies: (c.comments?.data || []).map((rp) => ({ id: rp.id, from: rp.from?.name || '', text: rp.message || '', created: rp.created_time })),
      }));
    }
    res.json({ comments });
  } catch (err) {
    res.status(502).json({ error: err.response?.data?.error?.message || err.message });
  }
});

app.post('/api/engagement/reply', async (req, res) => {
  try {
    const acc = metaAccount(req.tenantId);
    if (!acc) return res.status(400).json({ error: 'لا يوجد حساب مرتبط' });
    const token = acc.access_token;
    const { platform, commentId, message } = req.body || {};
    if (!commentId || !message?.trim()) return res.status(400).json({ error: 'الرد مطلوب' });
    if (platform === 'instagram') {
      await axios.post(`${GRAPH}/${commentId}/replies`, null, { params: { message, access_token: token }, timeout: 20000 });
    } else {
      await axios.post(`${GRAPH}/${commentId}/comments`, null, { params: { message, access_token: token }, timeout: 20000 });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err.response?.data?.error?.message || err.message });
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
    // Default to the cheaper Nano Banana (2.5 Flash Image, ~$0.039/img). In
    // high-precision mode the AI only paints the SCENE (we composite text/logo
    // ourselves), so the pricier Pro model's text quality isn't needed. Override
    // with GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview for max quality.
    const model = (typeof modelOverride === 'string' && modelOverride.trim())
      || process.env.GEMINI_IMAGE_MODEL
      || 'gemini-2.5-flash-image';

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

// ---- Team links ----
// Generate an ISOLATED tenant link so a colleague can test the app in their own
// private workspace (their own designs/library/accounts; they never see the
// owner's data). Protected by ADMIN_KEY so nobody else can mint tokens. Tenant
// ids are namespaced "team_*" so a generated link can NEVER reach a real salon.
function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
app.get('/api/team-link', (req, res) => {
  const adminKey = process.env.ADMIN_KEY || '';
  const provided = req.query.key || req.headers['x-admin-key'] || '';
  if (!adminKey) return res.status(503).json({ error: 'لم يتم ضبط ADMIN_KEY في الخادم بعد.' });
  if (provided !== adminKey) return res.status(403).json({ error: 'مفتاح الإدارة غير صحيح.' });
  const secret = process.env.SOCIAL_JWT_SECRET || '';
  if (!secret) return res.status(503).json({ error: 'لم يتم ضبط SOCIAL_JWT_SECRET في الخادم.' });
  const raw = String(req.query.tenant || '').trim();
  if (!raw) return res.status(400).json({ error: 'اسم/معرّف الزميل مطلوب.' });
  // Namespace + sanitise so test tenants never collide with real salon ids.
  const tenant = 'team_' + raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const header  = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = b64urlJson({ salon_id: tenant, iat: Math.floor(Date.now() / 1000) });
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const token = `${header}.${payload}.${sig}`;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
  res.json({ tenant, token, url: `${proto}://${req.get('host')}/?t=${token}` });
});

// ---- WhatsApp Cloud API (env-gated) ----
app.get('/api/whatsapp/status', (_, res) => res.json({ configured: waConfigured() }));
app.post('/api/whatsapp/send', async (req, res) => {
  if (!waConfigured()) return res.status(503).json({ error: 'واتساب API غير مفعّل بعد (لم تُضبط المفاتيح في الخادم).' });
  try {
    const { to, mode, template, language, bodyParams, imageUrl, text } = req.body || {};
    if (!to) return res.status(400).json({ error: 'رقم المستلم مطلوب' });
    const data = mode === 'text'
      ? await waSendText({ to, text })
      : await waSendTemplate({ to, template, language, bodyParams, imageUrl });
    res.json({ success: true, data });
  } catch (err) {
    const detail = err?.response?.data?.error?.message || err?.message || 'فشل الإرسال';
    res.status(502).json({ success: false, error: detail });
  }
});

app.get('/api/whatsapp/templates', async (_, res) => {
  if (!waConfigured()) return res.status(503).json({ error: 'واتساب API غير مفعّل بعد.' });
  try { res.json({ templates: await waListTemplates() }); }
  catch (err) { res.status(502).json({ error: err?.response?.data?.error?.message || err?.message || 'تعذّر جلب القوالب' }); }
});
app.post('/api/whatsapp/templates', async (req, res) => {
  if (!waConfigured()) return res.status(503).json({ error: 'واتساب API غير مفعّل بعد.' });
  try { res.json({ success: true, data: await waCreateTemplate(req.body || {}) }); }
  catch (err) { res.status(502).json({ error: err?.response?.data?.error?.message || err?.message || 'تعذّر إنشاء القالب' }); }
});

// ---- Health check ----
app.get('/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---- TikTok URL-prefix verification ----
// TikTok checks for this exact file at the domain root to confirm ownership.
// Also overridable via env if TikTok rotates the token.
app.get('/tiktok82i5AkjFeMrzi1Al4f4pAomO3OKLvYDB.txt', (_, res) => {
  res.type('text/plain').send('tiktok-developers-site-verification=82i5AkjFeMrzi1Al4f4pAomO3OKLvYDB');
});
app.get('/tiktokhF2R39Z0wFNWyGt50ZzukglpJTaRywtK.txt', (_, res) => {
  res.type('text/plain').send('tiktok-developers-site-verification=hF2R39Z0wFNWyGt50ZzukglpJTaRywtK');
});
if (process.env.TIKTOK_VERIFY_FILE && process.env.TIKTOK_VERIFY_CONTENT) {
  app.get(`/${process.env.TIKTOK_VERIFY_FILE}`, (_, res) =>
    res.type('text/plain').send(process.env.TIKTOK_VERIFY_CONTENT));
}

// ---- Serve the built frontend (production / single Railway service) ----
// ---- Static legal / website pages ----
// Served as REAL server-rendered HTML (NOT the React SPA shell) so crawlers and
// reviewers (e.g. TikTok) see the actual content without running JavaScript.
function legalPage(title, bodyHtml) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title} — Hovera</title>
<style>
  body{font-family:-apple-system,Segoe UI,Tahoma,Arial,sans-serif;line-height:1.8;color:#1f2937;background:#f7f7fb;margin:0;padding:0}
  .wrap{max-width:820px;margin:0 auto;padding:32px 20px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px 32px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
  h1{color:#4f46e5;font-size:28px;margin:0 0 4px}
  h2{color:#111827;font-size:18px;margin:24px 0 6px}
  .sub{color:#6b7280;font-size:13px;margin-bottom:20px}
  a{color:#4f46e5}
  ul{padding-inline-start:20px}
  .en{direction:ltr;text-align:left}
  .foot{margin-top:28px;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;padding-top:14px}
</style></head><body><div class="wrap"><div class="card">${bodyHtml}
<div class="foot">Hovera — <a href="/about">about</a> · <a href="/privacy">privacy</a> · <a href="/terms">terms</a><br/>تواصل / Contact: <a href="mailto:info.lhloba@gmail.com">info.lhloba@gmail.com</a></div>
</div></div></body></html>`;
}

app.get('/privacy', (_, res) => {
  res.type('html').send(legalPage('سياسة الخصوصية / Privacy Policy', `
  <h1>سياسة الخصوصية</h1>
  <div class="sub">Privacy Policy · آخر تحديث: يونيو 2026 / Last updated: June 2026</div>
  <p>Hovera هو نظام لتصميم وجدولة ونشر محتوى وسائل التواصل الاجتماعي، يساعد الأنشطة التجارية على إنشاء المنشورات ونشرها على حساباتها الخاصة.</p>
  <p class="en"><strong>Hovera</strong> is a social media content design and scheduling tool that helps businesses create posts and publish them to their own connected social accounts.</p>

  <h2>المعلومات التي نجمعها / Information we collect</h2>
  <ul class="en">
    <li><strong>Account connection data:</strong> when you connect a social account (Facebook, Instagram, TikTok, LinkedIn, Snapchat) we receive and store the access tokens and basic account identifiers that platform provides, solely to publish on your behalf. We never receive your password.</li>
    <li><strong>Content you create:</strong> the designs, images, captions and schedules you make inside the app.</li>
  </ul>

  <h2>كيف نستخدمها / How we use it</h2>
  <ul class="en">
    <li>To provide the service: design, schedule and publish content to the accounts you authorize.</li>
    <li><strong>TikTok:</strong> we use TikTok Login Kit (<code>user.info.basic</code>) to identify your connected account, and the Content Posting API (<code>video.publish</code>, <code>video.upload</code>) to publish the videos and images you create and schedule to your authorized TikTok account.</li>
  </ul>

  <h2>المشاركة / Sharing</h2>
  <p class="en">We do not sell your data. We do not share personal data with third parties, except the social platforms you explicitly choose to publish to.</p>

  <h2>الاحتفاظ والحذف / Retention &amp; deletion</h2>
  <p class="en">You can disconnect any account at any time, which deletes its stored tokens. To delete all your data, contact us at info.lhloba@gmail.com.</p>

  <h2>الأمان / Security</h2>
  <p class="en">Tokens are stored securely and all traffic is served over HTTPS.</p>
  `));
});

app.get('/terms', (_, res) => {
  res.type('html').send(legalPage('شروط الاستخدام / Terms of Service', `
  <h1>شروط الاستخدام</h1>
  <div class="sub">Terms of Service · آخر تحديث: يونيو 2026 / Last updated: June 2026</div>
  <p class="en">By using <strong>Hovera</strong> you agree to these terms.</p>
  <h2>الخدمة / The service</h2>
  <p class="en">Hovera provides tools to design, schedule and publish social media content to the accounts you connect.</p>
  <h2>مسؤوليتك / Your responsibilities</h2>
  <ul class="en">
    <li>You are responsible for the content you create and publish, and for complying with the rules of each social platform you use.</li>
    <li>You must own, or be authorized to manage, the social accounts you connect.</li>
    <li>You must not use the service for unlawful, deceptive, or abusive content.</li>
  </ul>
  <h2>إخلاء المسؤولية / Disclaimer</h2>
  <p class="en">The service is provided "as is" without warranties. We may suspend access for misuse. Third-party platforms (Meta, TikTok, LinkedIn, Snapchat) are governed by their own terms.</p>
  `));
});

app.get('/about', (_, res) => {
  res.type('html').send(legalPage('عن Hovera / About', `
  <h1>Hovera</h1>
  <div class="sub">إدارة وسائل التواصل ببساطة للأنشطة التجارية / Social media made simple for businesses</div>
  <p>Hovera يساعد الأنشطة على تصميم منشورات احترافية، توليد صور بالذكاء الاصطناعي، إنشاء بطاقات تهنئة وقوائم خدمات، وجدولة ونشر المحتوى على حساباتها.</p>
  <p class="en"><strong>Hovera</strong> lets businesses design professional posts, generate images with AI, build greeting cards and service menus, and schedule &amp; publish content to Facebook, Instagram, TikTok, LinkedIn and Snapchat — all from one place.</p>
  <h2>المميزات / Features</h2>
  <ul class="en">
    <li>Design studio for social posts and stories</li>
    <li>AI image generation</li>
    <li>Greeting-card and service-menu builders</li>
    <li>Scheduling and one-click publishing to connected accounts</li>
  </ul>
  <p class="en">Read our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.</p>
  `));
});

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
