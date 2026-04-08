import express from 'express';
import initSqlJs from 'sql.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '50mb' }));

// ── Static file serving for uploads ──────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── sql.js setup (pure-JS SQLite, no native compilation needed) ───────────────
const SQL = await initSqlJs();
const dbPath = path.join(__dirname, 'data.db');

const db = fs.existsSync(dbPath)
  ? new SQL.Database(fs.readFileSync(dbPath))
  : new SQL.Database();

// Persist in-memory database to disk after every write
function save() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

// ── Schema ────────────────────────────────────────────────────────────────────
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
    verifiedAt TEXT,
    created_date TEXT DEFAULT (datetime('now'))
  );
`);
save(); // write schema to disk on first run

// ── DB helpers ────────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Generic CRUD factory ──────────────────────────────────────────────────────
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
  });

  router.put('/:id', (req, res) => {
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
  });

  router.delete('/:id', (req, res) => {
    run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  });

  return router;
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/designs', crudRouter('designs'));
app.use('/media', crudRouter('media'));
app.use('/logos', crudRouter('logos', row => ({ ...row, isSvg: boolField(row.isSvg) })));
app.use('/social-accounts', crudRouter('social_accounts', row => ({
  ...row,
  isConnected: boolField(row.isConnected),
})));

// ── File upload endpoint ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/upload', upload.single('file'), (_req, res) => {
  if (!_req.file) return res.status(400).json({ error: 'No file provided' });
  res.json({ file_url: `/api/uploads/${_req.file.filename}` });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
