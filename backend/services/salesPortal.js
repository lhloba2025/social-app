// ── بوابة فريق المبيعات «هوفيرا» ───────────────────────────────────────────────
//
// وحدة مستقلة تركّب على تطبيق Express القائم كل ما يخص البوابة:
//   • جداول قاعدة البيانات (مستخدمو البوابة، الجلسات، الصوالين، سجل التواصل،
//     قوالب الواتساب) — لا تمسّ أي جدول قائم في النظام.
//   • مصادقة بالأدوار (super_admin / admin / agent) مع تحقّق على الخادم.
//   • كل مسارات الـ API تحت /api/sales.
//
// تُستدعى مرة واحدة من server.js عبر mountSalesPortal(app, { queryAll, queryOne, run }).

import express from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import {
  waCloudConfigured, listApprovedTemplates, uploadMedia, sendTemplateMessage,
  buildComponents, templateHasImageHeader,
} from './waCloud.js';

// ترتيب الأدوار — كل دور يرث صلاحيات ما دونه.
const ROLE_RANK = { agent: 1, admin: 2, super_admin: 3 };

// ── كلمات المرور (تجزئة بـ scrypt المدمج، بدون اعتماديات خارجية) ───────────────
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const a = Buffer.from(hash);
  const b = Buffer.from(expectedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// تنظيف رقم الجوال لاكتشاف التكرار: أرقام فقط.
function phoneKeyOf(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

const nowIso = () => new Date().toISOString();

// قوالب واتساب جاهزة للمبيعات — {me} يُستبدل تلقائياً باسم العضو. كلها قابلة
// للتعديل والحذف من صفحة الإدارة بعد إضافتها.
const DEFAULT_WA_TEMPLATES = [
  'السلام عليكم ورحمة الله، معك {me} من هوفيرا 🌿\nنوفّر لكم منصة حجوزات إلكترونية تنظّم مواعيد صالونكم وتزيد عملاءكم. حابة أعرض عليكم التفاصيل، متى يناسبكم؟',
  'مرحباً، معك {me} من هوفيرا 🌸\nتواصلت معكم سابقاً بخصوص منصة الحجوزات، حبيت أتأكد وصلتكم رسالتي؟ يسعدني خدمتكم في أي وقت.',
  'أهلاً وسهلاً، معك {me} من هوفيرا ✨\nعندنا الآن عرض خاص على اشتراك المنصة لفترة محدودة. تحبون أرسل لكم التفاصيل والأسعار؟',
  'تمام، معك {me} من هوفيرا ✅\nتم تحديد موعد زيارتنا لكم بإذن الله. أي استفسار قبل الموعد أنا بخدمتكم.',
  'شكراً لثقتكم بهوفيرا 💜\nمعك {me}، وأي مساعدة بخصوص المنصة لا تترددون بالتواصل. نتمنى لكم التوفيق والمزيد من العملاء.',
  'مساء الخير، معك {me} من هوفيرا 🌷\nحبيت أذكّركم بعرض منصة الحجوزات، لا يفوتكم. جاهزة لأي سؤال.',
  // قالب الميزات الكامل (بروشور)
  '🌟 هوفيرا — نظام متكامل يدير صالونك من مكان واحد. معك {me}:\n\n📅 الحجوزات:\n• صفحة حجز برابط تحطّينه في البايو 🔗\n• حجز إلكتروني ٢٤ ساعة + تذكير تلقائي\n• تفعيل عربون لتأكيد الحجز ويقلّل عدم الحضور\n\n👩‍💼 الموظفات:\n• حضور وانصراف، رواتب، إجازات\n• إنذارات، خصميات، لوائح وتعليمات\n• كل موظفة تشوف خدماتها ومواعيدها\n\n🧾 المحاسبة والتسعير:\n• دخل ومصروفات، ضريبة القيمة المضافة، تقارير أرباح\n• تسعير دقيق لخدماتك ومنتجاتك\n\n📦 المخزون الذكي: متابعة منتجاتك ومستلزماتك تلقائياً\n🔔 تنبيه المستندات: إشعار قبل انتهاء السجلات والرخص الرسمية\n📣 التسويق: تصميم وجدولة ونشر منشوراتك على السوشيال ميديا\n🏠 الخدمات المنزلية: إدارة طلبات الخدمة في البيت\n\nكل هذا في منصة واحدة! حابة عرض سريع؟ 💜',
  // قالب الميزات المختصر (أول تواصل)
  'معك {me} من هوفيرا 🌿 منصة واحدة تدير صالونك كامل: حجوزات (برابط بايو وعربون) + موظفات + محاسبة + تسعير + مخزون + تسويق + خدمات منزلية. حابة عرض سريع؟ 💜',
];

export function mountSalesPortal(app, ctx) {
  const { queryAll, queryOne, run, uploadsDir } = ctx;
  // مجلد ملفات القوالب (صور/PDF) — يُقدَّم عبر /uploads/sales/*.
  const tplDir = uploadsDir ? path.join(uploadsDir, 'sales') : null;
  if (tplDir) { try { fs.mkdirSync(tplDir, { recursive: true }); } catch { /* موجود */ } }
  const removeTplFile = (fileUrl) => {
    if (!fileUrl || !uploadsDir) return;
    try { fs.unlinkSync(path.join(uploadsDir, fileUrl.replace(/^\/uploads\//, ''))); } catch { /* تجاهل */ }
  };

  // ── المخطط ────────────────────────────────────────────────────────────────
  run(`
    CREATE TABLE IF NOT EXISTS sales_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      password_salt TEXT,
      display_name TEXT,
      role TEXT DEFAULT 'agent',
      created_date TEXT DEFAULT (datetime('now'))
    );
  `);
  run(`
    CREATE TABLE IF NOT EXISTS sales_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT,
      created_date TEXT DEFAULT (datetime('now'))
    );
  `);
  run(`
    CREATE TABLE IF NOT EXISTS salons (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      phone_key TEXT,
      city TEXT,
      district TEXT,
      address TEXT,
      rating REAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      type TEXT DEFAULT 'opportunity',
      platform TEXT,
      lat REAL,
      lng REAL,
      tags TEXT,
      owner_id TEXT,
      owner_name TEXT,
      status TEXT DEFAULT 'new',
      visit_result TEXT,
      subscription_type TEXT,
      follow_up TEXT,
      priority TEXT DEFAULT 'normal',
      note TEXT,
      last_contact_date TEXT,
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );
  `);
  run(`
    CREATE TABLE IF NOT EXISTS contact_log (
      id TEXT PRIMARY KEY,
      salon_id TEXT,
      user_id TEXT,
      user_name TEXT,
      status TEXT,
      note TEXT,
      created_date TEXT DEFAULT (datetime('now'))
    );
  `);
  run(`
    CREATE TABLE IF NOT EXISTS wa_templates (
      id TEXT PRIMARY KEY,
      body TEXT,
      created_date TEXT DEFAULT (datetime('now'))
    );
  `);
  // مرفقات القوالب (صورة/PDF) — إضافة الأعمدة للتركيبات القديمة.
  for (const col of ['file_url TEXT', 'file_name TEXT', 'file_type TEXT']) {
    try { run(`ALTER TABLE wa_templates ADD COLUMN ${col}`); } catch { /* العمود موجود */ }
  }

  // ── المرحلة ٢: حملات الواتساب + منع الإرسال (opt-out) ────────────────────────
  // علم «لا ترسل» على الصالون — يُستثنى تلقائياً من كل الحملات المستقبلية.
  try { run(`ALTER TABLE salons ADD COLUMN do_not_send INTEGER DEFAULT 0`); } catch { /* موجود */ }

  run(`
    CREATE TABLE IF NOT EXISTS wa_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT,
      template_name TEXT,
      template_lang TEXT,
      media_id TEXT,
      status TEXT DEFAULT 'draft',        -- draft/sending/paused/done/cancelled
      filters TEXT,                       -- لقطة JSON من معايير الاختيار
      total INTEGER DEFAULT 0,
      created_by TEXT,
      created_by_name TEXT,
      note TEXT,
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );
  `);
  run(`
    CREATE TABLE IF NOT EXISTS wa_campaign_recipients (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      salon_id TEXT,
      to_number TEXT,
      wamid TEXT,
      send_status TEXT DEFAULT 'pending', -- pending/sent/failed
      error TEXT,
      sent_at TEXT
    );
  `);

  // ── زرع حساب السوبر أدمن من متغيّرات البيئة (Railway) ────────────────────────
  const seedUser = process.env.SALES_ADMIN_USER;
  const seedPass = process.env.SALES_ADMIN_PASS;
  if (seedUser && seedPass) {
    const existing = queryOne(`SELECT * FROM sales_users WHERE username = ?`, [seedUser]);
    if (!existing) {
      const { hash, salt } = hashPassword(seedPass);
      run(
        `INSERT INTO sales_users (id, username, password_hash, password_salt, display_name, role)
         VALUES (?, ?, ?, ?, ?, 'super_admin')`,
        [randomUUID(), seedUser, hash, salt, 'المدير العام']
      );
      console.log(`[Sales] ✅ تم إنشاء حساب السوبر أدمن: ${seedUser}`);
    }
  } else {
    console.warn('[Sales] ⚠ لم تُضبط SALES_ADMIN_USER / SALES_ADMIN_PASS — لن يُزرع حساب مدير.');
  }

  // زرع قالب واتساب افتراضي لو لا توجد قوالب.
  if ((queryOne(`SELECT COUNT(*) AS c FROM wa_templates`)?.c ?? 0) === 0) {
    for (const body of DEFAULT_WA_TEMPLATES) {
      run(`INSERT INTO wa_templates (id, body) VALUES (?, ?)`, [randomUUID(), body]);
    }
  }

  // ── أدوات مساعدة للمصادقة ───────────────────────────────────────────────────
  function userFromToken(token) {
    if (!token) return null;
    const session = queryOne(`SELECT * FROM sales_sessions WHERE token = ?`, [token]);
    if (!session) return null;
    const user = queryOne(`SELECT * FROM sales_users WHERE id = ?`, [session.user_id]);
    if (!user) return null;
    return { id: user.id, username: user.username, name: user.display_name, role: user.role };
  }

  // middleware: يتطلّب جلسة صالحة بدور لا يقل عن minRole.
  function requireRole(minRole) {
    return (req, res, next) => {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      const user = userFromToken(token);
      if (!user) return res.status(401).json({ error: 'الرجاء تسجيل الدخول' });
      if ((ROLE_RANK[user.role] || 0) < (ROLE_RANK[minRole] || 99)) {
        return res.status(403).json({ error: 'ليست لديك صلاحية للوصول لهذه الصفحة' });
      }
      req.salesUser = user;
      next();
    };
  }

  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

  // ── المصادقة ────────────────────────────────────────────────────────────────
  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'أدخل اسم المستخدم وكلمة المرور' });
    const user = queryOne(`SELECT * FROM sales_users WHERE username = ?`, [username]);
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    run(`INSERT INTO sales_sessions (token, user_id) VALUES (?, ?)`, [token, user.id]);
    res.json({ token, user: { id: user.id, username: user.username, name: user.display_name, role: user.role } });
  });

  router.get('/me', requireRole('agent'), (req, res) => {
    res.json(req.salesUser);
  });

  router.post('/logout', requireRole('agent'), (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) run(`DELETE FROM sales_sessions WHERE token = ?`, [token]);
    res.json({ success: true });
  });

  // ── الصوالين (العملاء) — للعضو فأعلى ────────────────────────────────────────
  function parseSalon(row) {
    return { ...row, tags: row.tags ? tryParseArr(row.tags) : [] };
  }

  router.get('/salons', requireRole('agent'), (req, res) => {
    const { search, city, district, type, owner, owner_id, status, sort, limit, offset } = req.query;
    const me = req.salesUser.id;
    let rows = queryAll(`SELECT * FROM salons`).map(parseSalon);

    if (search) {
      const q = String(search).trim().toLowerCase();
      rows = rows.filter((r) =>
        [r.name, r.phone, r.city, r.district]
          .some((v) => String(v ?? '').toLowerCase().includes(q))
      );
    }
    if (city)     rows = rows.filter((r) => r.city === city);
    if (district) rows = rows.filter((r) => r.district === district);
    if (type)     rows = rows.filter((r) => r.type === type);
    if (status)   rows = rows.filter((r) => (r.status || 'new') === status);
    if (owner === 'mine') rows = rows.filter((r) => r.owner_id === me);
    if (owner === 'none') rows = rows.filter((r) => !r.owner_id);
    if (owner_id)         rows = rows.filter((r) => r.owner_id === owner_id);

    // الترتيب
    const sorters = {
      '-updated_date': (a, b) => String(b.updated_date || '').localeCompare(String(a.updated_date || '')),
      '-rating':       (a, b) => (b.rating || 0) - (a.rating || 0),
      '-reviews_count':(a, b) => (b.reviews_count || 0) - (a.reviews_count || 0),
      'name':          (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'),
    };
    rows.sort(sorters[sort] || sorters['-updated_date']);

    // ترقيم الصفحات: نرسل دفعة محدودة فقط (limit/offset) لتفادي تحميل آلاف
    // الصوالين دفعة واحدة على الجوال. بدون limit نرجّع الكل (توافق رجعي).
    const lim = Math.min(parseInt(limit, 10) || 0, 1000);
    const off = Math.max(parseInt(offset, 10) || 0, 0);
    res.json(lim > 0 ? rows.slice(off, off + lim) : rows);
  });

  router.get('/salons/stats', requireRole('agent'), (req, res) => {
    const me = req.salesUser.id;
    const rows = queryAll(`SELECT status, owner_id, subscription_type FROM salons`);
    const stats = {
      total:      rows.length,
      contacted:  rows.filter((r) => r.status && r.status !== 'new').length,
      mine:       rows.filter((r) => r.owner_id === me).length,
      interested: rows.filter((r) => r.status === 'interested').length,
      subscribed: rows.filter((r) => r.status === 'subscribed').length,
    };
    res.json(stats);
  });

  // قوائم الفلاتر (مدن/أحياء فريدة) لتعبئة القوائم المنسدلة في الواجهة.
  router.get('/salons/filters', requireRole('agent'), (req, res) => {
    const rows = queryAll(`SELECT DISTINCT city, district FROM salons`);
    const cities = [...new Set(rows.map((r) => r.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
    const districts = [...new Set(rows.map((r) => r.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
    // أحياء كل مدينة على حدة — لتقييد قائمة الأحياء بالمدينة المختارة في الواجهة.
    const districtsByCity = {};
    for (const r of rows) {
      if (!r.city || !r.district) continue;
      (districtsByCity[r.city] ||= []).push(r.district);
    }
    for (const c of Object.keys(districtsByCity)) {
      districtsByCity[c] = [...new Set(districtsByCity[c])].sort((a, b) => a.localeCompare(b, 'ar'));
    }
    res.json({ cities, districts, districtsByCity });
  });

  // إضافة صالون واحد يدوياً (للمدير فأعلى) — مع منع تكرار رقم الجوال.
  router.post('/salons', requireRole('admin'), (req, res) => {
    const b = req.body || {};
    if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'اسم الصالون مطلوب' });
    const key = phoneKeyOf(b.phone);
    if (key) {
      const dup = queryOne(`SELECT name FROM salons WHERE phone_key = ?`, [key]);
      if (dup) return res.status(409).json({ error: `رقم الجوال مسجّل مسبقاً للصالون: ${dup.name || '—'}` });
    }
    const id = randomUUID();
    insertSalon(run, {
      id,
      name: String(b.name).trim(),
      phone: b.phone || '',
      phone_key: key,
      city: b.city || '',
      district: b.district || '',
      address: b.address || '',
      type: b.type === 'booking_platform' ? 'booking_platform' : 'opportunity',
      rating: parseFloat(b.rating) || 0,
      reviews_count: parseInt(b.reviews_count, 10) || 0,
      note: b.note || null,
      status: 'new',
    });
    res.status(201).json(parseSalon(queryOne(`SELECT * FROM salons WHERE id = ?`, [id])));
  });

  // تثبيت التواصل: بمجرد ما يتواصل المندوب (واتساب/اتصال) يصير الصالون باسمه
  // (إن لم يكن له مالك)، ويُحدَّث آخر تواصل + يُسجَّل في السجل.
  router.post('/salons/:id/contact', requireRole('agent'), (req, res) => {
    const salon = queryOne(`SELECT * FROM salons WHERE id = ?`, [req.params.id]);
    if (!salon) return res.status(404).json({ error: 'العميل غير موجود' });
    const me = req.salesUser;
    const channel = (req.body && req.body.channel) || '';
    const updates = { last_contact_date: nowIso(), updated_date: nowIso() };
    if (!salon.owner_id) { updates.owner_id = me.id; updates.owner_name = me.name; }
    if ((salon.status || 'new') === 'new') updates.status = 'contacted';
    const sets = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    run(`UPDATE salons SET ${sets} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    const note = channel === 'call' ? 'اتصال هاتفي' : channel === 'whatsapp' ? 'تواصل واتساب' : 'تواصل';
    run(
      `INSERT INTO contact_log (id, salon_id, user_id, user_name, status, note) VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), req.params.id, me.id, me.name, updates.status || salon.status || '', note]
    );
    res.json(parseSalon(queryOne(`SELECT * FROM salons WHERE id = ?`, [req.params.id])));
  });

  // تحديث حالة عميل + تسجيل في سجل التواصل + تثبيت الملكية لأول متواصل.
  router.put('/salons/:id', requireRole('agent'), (req, res) => {
    const salon = queryOne(`SELECT * FROM salons WHERE id = ?`, [req.params.id]);
    if (!salon) return res.status(404).json({ error: 'العميل غير موجود' });

    const me = req.salesUser;
    const allowed = ['status', 'visit_result', 'subscription_type', 'follow_up', 'priority', 'note'];
    const updates = {};
    for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];

    updates.last_contact_date = nowIso();
    updates.updated_date = nowIso();

    // أول من يتواصل يصير المالك، وتبقى الملكية له (تنبيه فقط، لا قفل).
    if (!salon.owner_id) {
      updates.owner_id = me.id;
      updates.owner_name = me.name;
    }

    const sets = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    run(`UPDATE salons SET ${sets} WHERE id = ?`, [...Object.values(updates), req.params.id]);

    // سجل التواصل دائماً.
    run(
      `INSERT INTO contact_log (id, salon_id, user_id, user_name, status, note) VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), req.params.id, me.id, me.name, updates.status || salon.status || '', updates.note || '']
    );

    res.json(parseSalon(queryOne(`SELECT * FROM salons WHERE id = ?`, [req.params.id])));
  });

  // سجل تواصل عميل واحد.
  router.get('/salons/:id/log', requireRole('agent'), (req, res) => {
    const rows = queryAll(
      `SELECT * FROM contact_log WHERE salon_id = ? ORDER BY created_date DESC`,
      [req.params.id]
    );
    res.json(rows);
  });

  // حذف صالون نهائياً (للمدير فأعلى) — يحذف سجلّ تواصله المرتبط أيضاً.
  router.delete('/salons/:id', requireRole('admin'), (req, res) => {
    const salon = queryOne(`SELECT id FROM salons WHERE id = ?`, [req.params.id]);
    if (!salon) return res.status(404).json({ error: 'العميل غير موجود' });
    run(`DELETE FROM salons WHERE id = ?`, [req.params.id]);
    run(`DELETE FROM contact_log WHERE salon_id = ?`, [req.params.id]);
    res.json({ success: true });
  });

  // ── لوحة متابعة الفريق — للمدير فأعلى ────────────────────────────────────────
  // تكشف: مين تأخّر في التواصل، أي عميلة مهملة، ومتابعات فائتة. تُحسب من جدول
  // الصوالين (last_contact_date / follow_up / owner). لا تتضمّن نص محادثات
  // الواتساب — تلك تبقى داخل تطبيق واتساب على جوال المندوب.
  router.get('/oversight', requireRole('admin'), (req, res) => {
    const STALE_DAYS = 3;                 // عميلة نشطة بلا تواصل ≥ ٣ أيام = مهملة
    const CLOSED = new Set(['subscribed', 'not_interested']); // حالات لا تحتاج متابعة
    const now = Date.now();
    const todayStr = nowIso().slice(0, 10);
    const daysSince = (d) => {
      if (!d) return null;
      const t = new Date(String(d).replace(' ', 'T')).getTime();
      return isNaN(t) ? null : Math.floor((now - t) / 86400000);
    };

    const owned = queryAll(`SELECT * FROM salons WHERE owner_id IS NOT NULL AND owner_id != ''`).map(parseSalon);
    const active = owned.filter((s) => !CLOSED.has(s.status || 'new'));

    // العملاء النشطون مرتّبون من الأقدم تواصلاً (الأكثر إهمالاً أولاً).
    const neglected = active
      .map((s) => ({
        id: s.id, name: s.name, owner_id: s.owner_id, owner_name: s.owner_name,
        status: s.status, last_contact_date: s.last_contact_date, follow_up: s.follow_up,
        days_since: daysSince(s.last_contact_date || s.created_date),
        follow_up_overdue: Boolean(s.follow_up && s.follow_up < todayStr),
      }))
      .sort((a, b) => (b.days_since ?? 0) - (a.days_since ?? 0));

    // تجميع لكل عضو فريق.
    const members = queryAll(`SELECT id, display_name, role FROM sales_users ORDER BY display_name`);
    const byMember = members.map((m) => {
      const mine = active.filter((s) => s.owner_id === m.id);
      const lastActivity = mine.reduce((acc, s) => {
        const d = s.last_contact_date || '';
        return d > acc ? d : acc;
      }, '');
      return {
        user_id: m.id, name: m.display_name, role: m.role,
        active: mine.length,
        stale: mine.filter((s) => (daysSince(s.last_contact_date || s.created_date) ?? 0) >= STALE_DAYS).length,
        overdue: mine.filter((s) => s.follow_up && s.follow_up < todayStr).length,
        last_activity: lastActivity || null,
      };
    });

    res.json({
      stale_days: STALE_DAYS,
      neglected: neglected.slice(0, 200),
      by_member: byMember,
    });
  });

  // ── أعضاء الفريق — للمدير فأعلى ──────────────────────────────────────────────
  router.get('/members', requireRole('admin'), (req, res) => {
    const users = queryAll(`SELECT id, username, display_name, role, created_date FROM sales_users ORDER BY created_date`);
    const members = users.map((u) => {
      const clients = queryOne(`SELECT COUNT(*) AS c FROM salons WHERE owner_id = ?`, [u.id])?.c ?? 0;
      const today = queryOne(
        `SELECT COUNT(*) AS c FROM contact_log WHERE user_id = ? AND date(created_date) = date('now')`,
        [u.id]
      )?.c ?? 0;
      const month = queryOne(
        `SELECT COUNT(*) AS c FROM contact_log WHERE user_id = ? AND strftime('%Y-%m', created_date) = strftime('%Y-%m','now')`,
        [u.id]
      )?.c ?? 0;
      return { ...u, stats: { clients, today, month } };
    });
    res.json(members);
  });

  router.post('/members', requireRole('admin'), (req, res) => {
    const { username, password, display_name, role } = req.body || {};
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' });
    }
    const wantedRole = ['agent', 'admin', 'super_admin'].includes(role) ? role : 'agent';
    // أدمن عادي لا يستطيع إنشاء سوبر أدمن.
    if (wantedRole === 'super_admin' && req.salesUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'لا يمكنك إنشاء حساب سوبر أدمن' });
    }
    if (queryOne(`SELECT id FROM sales_users WHERE username = ?`, [username])) {
      return res.status(409).json({ error: 'اسم المستخدم موجود مسبقاً' });
    }
    const { hash, salt } = hashPassword(password);
    const id = randomUUID();
    run(
      `INSERT INTO sales_users (id, username, password_hash, password_salt, display_name, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, username, hash, salt, display_name, wantedRole]
    );
    res.status(201).json({ id, username, display_name, role: wantedRole });
  });

  router.delete('/members/:id', requireRole('admin'), (req, res) => {
    if (req.params.id === req.salesUser.id) {
      return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
    }
    const target = queryOne(`SELECT * FROM sales_users WHERE id = ?`, [req.params.id]);
    if (!target) return res.status(404).json({ error: 'العضو غير موجود' });
    if (target.role === 'super_admin' && req.salesUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'لا يمكنك حذف سوبر أدمن' });
    }
    run(`DELETE FROM sales_users WHERE id = ?`, [req.params.id]);
    run(`DELETE FROM sales_sessions WHERE user_id = ?`, [req.params.id]);
    res.json({ success: true });
  });

  // ── قوالب الواتساب ──────────────────────────────────────────────────────────
  router.get('/templates', requireRole('agent'), (req, res) => {
    res.json(queryAll(`SELECT * FROM wa_templates ORDER BY created_date`));
  });

  router.post('/templates', requireRole('admin'), (req, res) => {
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'نص القالب مطلوب' });
    const id = randomUUID();
    run(`INSERT INTO wa_templates (id, body) VALUES (?, ?)`, [id, body.trim()]);
    res.status(201).json({ id, body: body.trim() });
  });

  // تعديل نص قالب موجود.
  router.put('/templates/:id', requireRole('admin'), (req, res) => {
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'نص القالب مطلوب' });
    const existing = queryOne(`SELECT id FROM wa_templates WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'القالب غير موجود' });
    run(`UPDATE wa_templates SET body = ? WHERE id = ?`, [body.trim(), req.params.id]);
    res.json({ id: req.params.id, body: body.trim() });
  });

  router.delete('/templates/:id', requireRole('admin'), (req, res) => {
    const tpl = queryOne(`SELECT file_url FROM wa_templates WHERE id = ?`, [req.params.id]);
    removeTplFile(tpl?.file_url);
    run(`DELETE FROM wa_templates WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  });

  // رفع/استبدال ملف القالب (صورة أو PDF أو HTML) — للمدير فأعلى.
  router.post('/templates/:id/file', requireRole('admin'), upload.single('file'), (req, res) => {
    if (!tplDir) return res.status(500).json({ error: 'تخزين الملفات غير مهيّأ' });
    const tpl = queryOne(`SELECT * FROM wa_templates WHERE id = ?`, [req.params.id]);
    if (!tpl) return res.status(404).json({ error: 'القالب غير موجود' });
    if (!req.file) return res.status(400).json({ error: 'لم يُرفع ملف' });
    const mime = req.file.mimetype || '';
    const name = (req.file.originalname || '').toLowerCase();
    const isImage = mime.startsWith('image/');
    const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
    const isHtml = mime === 'text/html' || name.endsWith('.html') || name.endsWith('.htm');
    if (!isImage && !isPdf && !isHtml) return res.status(400).json({ error: 'يُسمح بصورة أو PDF أو HTML فقط' });
    removeTplFile(tpl.file_url);
    const fileType = isPdf ? 'pdf' : isHtml ? 'html' : 'image';
    const ext = isPdf ? 'pdf' : isHtml ? 'html' : (mime.split('/')[1] || 'img').replace(/[^a-z0-9]/gi, '');
    const fname = `tpl-${req.params.id}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(tplDir, fname), req.file.buffer);
    const fileUrl = `/uploads/sales/${fname}`;
    run(`UPDATE wa_templates SET file_url = ?, file_name = ?, file_type = ? WHERE id = ?`,
      [fileUrl, req.file.originalname || fname, fileType, req.params.id]);
    res.json(queryOne(`SELECT * FROM wa_templates WHERE id = ?`, [req.params.id]));
  });

  // حذف ملف القالب.
  router.delete('/templates/:id/file', requireRole('admin'), (req, res) => {
    const tpl = queryOne(`SELECT file_url FROM wa_templates WHERE id = ?`, [req.params.id]);
    if (!tpl) return res.status(404).json({ error: 'القالب غير موجود' });
    removeTplFile(tpl.file_url);
    run(`UPDATE wa_templates SET file_url = NULL, file_name = NULL, file_type = NULL WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  });

  // إضافة القوالب الجاهزة (لا تُكرّر قالباً موجوداً بنفس النص). للتركيبات القديمة
  // التي زُرعت قبل توسيع المجموعة الافتراضية.
  router.post('/templates/seed-defaults', requireRole('admin'), (req, res) => {
    const existing = new Set(queryAll(`SELECT body FROM wa_templates`).map((r) => r.body));
    let added = 0;
    for (const body of DEFAULT_WA_TEMPLATES) {
      if (!existing.has(body)) {
        run(`INSERT INTO wa_templates (id, body) VALUES (?, ?)`, [randomUUID(), body]);
        added++;
      }
    }
    res.json({ added });
  });

  // ── البيانات والنُّسخ — للسوبر أدمن فقط ──────────────────────────────────────
  // نسخة احتياطية (تنزيل JSON).
  router.get('/backup', requireRole('super_admin'), (req, res) => {
    const backup = {
      version: 1,
      exported_at: nowIso(),
      salons: queryAll(`SELECT * FROM salons`),
      contact_log: queryAll(`SELECT * FROM contact_log`),
      wa_templates: queryAll(`SELECT * FROM wa_templates`),
      // المستخدمون بدون تجزئة كلمة المرور (لا تُصدَّر في النسخة).
      members: queryAll(`SELECT id, username, display_name, role, created_date FROM sales_users`),
    };
    res.setHeader('Content-Disposition', `attachment; filename="hovera-backup.json"`);
    res.json(backup);
  });

  // استيراد نسخة: دمج يحدّث الأحدث فقط ولا يمسح شيئاً.
  router.post('/import', requireRole('super_admin'), (req, res) => {
    const data = req.body || {};
    let added = 0, updated = 0, skipped = 0;
    for (const incoming of (data.salons || [])) {
      const existing = incoming.id ? queryOne(`SELECT * FROM salons WHERE id = ?`, [incoming.id]) : null;
      if (!existing) {
        insertSalon(run, incoming);
        added++;
      } else {
        // يحدّث فقط لو الوارد أحدث.
        if (String(incoming.updated_date || '') > String(existing.updated_date || '')) {
          const fields = ['name', 'phone', 'phone_key', 'city', 'district', 'address', 'rating',
            'reviews_count', 'type', 'platform', 'lat', 'lng', 'tags', 'owner_id', 'owner_name',
            'status', 'visit_result', 'subscription_type', 'follow_up', 'priority', 'note',
            'last_contact_date', 'updated_date'];
          const present = fields.filter((f) => f in incoming);
          if (present.length) {
            const sets = present.map((f) => `${f} = ?`).join(', ');
            run(`UPDATE salons SET ${sets} WHERE id = ?`, [...present.map((f) => incoming[f]), incoming.id]);
            updated++;
          }
        } else {
          skipped++;
        }
      }
    }
    // قوالب الواتساب: تُضاف الجديدة فقط.
    for (const t of (data.wa_templates || [])) {
      if (t.id && !queryOne(`SELECT id FROM wa_templates WHERE id = ?`, [t.id])) {
        run(`INSERT INTO wa_templates (id, body, created_date) VALUES (?, ?, ?)`,
          [t.id, t.body || '', t.created_date || nowIso()]);
      }
    }
    res.json({ added, updated, skipped });
  });

  // تصدير إكسل للصوالين.
  router.get('/export', requireRole('super_admin'), (req, res) => {
    // خرائط للنص العربي حتى يطلع الإكسل مفهوماً بدل الأكواد الإنجليزية.
    const STATUS_AR = {
      new: 'جديد', sent: 'تم الإرسال', replied: 'ردت - بانتظار متابعة',
      contacted: 'تم التواصل', no_answer: 'لا يرد',
      interested: 'مهتم', not_interested: 'غير مهتم',
      scheduled_visit: 'موعد زيارة', subscribed: 'مشترك', do_not_send: 'لا ترسل',
    };
    const PRIORITY_AR = { low: 'منخفضة', normal: 'عادية', high: 'عالية' };
    const dateOnly = (v) => (v ? String(v).split(/[ T]/)[0] : '');
    const rows = queryAll(`SELECT * FROM salons`).map((r) => {
      // صالون «تم التواصل معه» إذا له تاريخ تواصل أو حالته تجاوزت «جديد».
      const contacted = Boolean(r.last_contact_date) || (!!r.status && r.status !== 'new');
      // الوسوم مخزّنة كـ JSON — نحوّلها لنص مفصول بفواصل.
      let tags = '';
      try { const t = r.tags ? JSON.parse(r.tags) : []; tags = Array.isArray(t) ? t.join('، ') : String(r.tags || ''); }
      catch { tags = String(r.tags || ''); }
      // رابط خرائط قوقل: بالإحداثيات إن وُجدت، وإلا بحث بالاسم والحي والمدينة.
      const mapsUrl = (r.lat != null && r.lng != null)
        ? `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([r.name, r.district, r.city].filter(Boolean).join(' '))}`;
      return {
        'الاسم': r.name,
        'الجوال': r.phone,
        'المدينة': r.city,
        'الحي': r.district,
        'العنوان': r.address,
        'التقييم': r.rating,
        'عدد المراجعات': r.reviews_count,
        'النوع': r.type === 'booking_platform' ? 'منصة حجز' : 'فرصة',
        'المنصة': r.platform,
        'الإحداثيات': r.lat != null && r.lng != null ? `${r.lat},${r.lng}` : '',
        'رابط الموقع في قوقل': mapsUrl,
        'الوسوم': tags,
        'تم التواصل؟': contacted ? 'نعم' : 'لا',
        'الحالة': STATUS_AR[r.status] || (r.status || 'جديد'),
        'نتيجة الزيارة': r.visit_result || '',
        'نوع الاشتراك': r.subscription_type || '',
        'المندوب المسؤول': r.owner_name || '',
        'آخر تواصل': dateOnly(r.last_contact_date),
        'موعد المتابعة': dateOnly(r.follow_up),
        'الأولوية': PRIORITY_AR[r.priority] || '',
        'ملاحظات': r.note || '',
        'تاريخ الإضافة': dateOnly(r.created_date),
        'آخر تحديث': dateOnly(r.updated_date),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الصوالين');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="hovera-salons.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  });

  // رفع إكسل صوالين جديدة: يضيف الجديد، يمنع تكرار الأرقام، يرجّع ملخّصاً.
  router.post('/upload-excel', requireRole('super_admin'), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'لم يُرفع أي ملف' });
    try {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // مجموعة الأرقام الموجودة مسبقاً (لاكتشاف التكرار).
      const existingKeys = new Set(
        queryAll(`SELECT phone_key FROM salons WHERE phone_key IS NOT NULL AND phone_key != ''`)
          .map((r) => r.phone_key)
      );

      let added = 0, skipped = 0;
      for (const row of rows) {
        const name    = pick(row, ['الاسم', 'الإسم', 'الاسم التجاري', 'name']);
        const phone   = pick(row, ['الجوال', 'الهاتف', 'رقم الجوال', 'phone', 'mobile']);
        const key = phoneKeyOf(phone);

        // منع التكرار: رقم موجود مسبقاً أو تكرّر داخل نفس الملف.
        if (key && existingKeys.has(key)) { skipped++; continue; }

        const coords = pick(row, ['الإحداثيات', 'الاحداثيات', 'coordinates', 'location']);
        let lat = null, lng = null;
        if (coords) {
          const m = String(coords).match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
          if (m) { lat = parseFloat(m[1]); lng = parseFloat(m[2]); }
        }
        const typeRaw = pick(row, ['النوع', 'نوع العميل', 'type']);
        const type = /منصة|حجز|booking/i.test(typeRaw) ? 'booking_platform' : 'opportunity';

        insertSalon(run, {
          id: randomUUID(),
          name,
          phone,
          phone_key: key,
          city:     pick(row, ['المدينة', 'city']),
          district: pick(row, ['الحي', 'الحى', 'district', 'neighborhood']),
          address:  pick(row, ['العنوان', 'address']),
          rating:   parseFloat(pick(row, ['التقييم', 'rating'])) || 0,
          reviews_count: parseInt(pick(row, ['عدد المراجعات', 'المراجعات', 'reviews', 'reviews_count'])) || 0,
          type,
          platform: pick(row, ['المنصة', 'platform']),
          lat, lng,
          status: 'new',
        });

        if (key) existingKeys.add(key);
        added++;
      }

      res.json({ added, skipped, total: rows.length });
    } catch (err) {
      console.error('[Sales upload-excel]', err.message);
      res.status(500).json({ error: 'تعذّرت قراءة الملف. تأكد أنه ملف إكسل صالح.' });
    }
  });

  // تحديد التواصل عبر حملة ميتا: يرفع المدير ملف أرقام الحملة، فنطابقها مع
  // الصوالين ونضع عليها وسم «حملة ميتا»، ونحدّث حالتها لـ«تم التواصل» إن كانت
  // ما زالت «جديد» (لا نُنزّل حالة متقدّمة كـ«مهتم» أو «مشترك»).
  router.post('/mark-campaign', requireRole('admin'), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'لم يُرفع أي ملف' });
    const me = req.salesUser;
    const TAG = 'حملة ميتا';
    try {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      // نجمع كل رقم من كل خلية في كل الأوراق — يدعم ملف عمود واحد أو عدة أعمدة،
      // بترويسة أو بدونها. نطابق بآخر ٩ أرقام لتجاهل صيغة المفتاح (+966 / 05 / 966).
      const campaignTails = new Set();
      for (const sheetName of wb.SheetNames) {
        const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
        for (const row of grid) {
          for (const cell of row) {
            const digits = String(cell ?? '').replace(/\D/g, '');
            if (digits.length >= 9) campaignTails.add(digits.slice(-9));
          }
        }
      }
      if (campaignTails.size === 0) {
        return res.status(400).json({ error: 'لم يُعثر على أي أرقام في الملف.' });
      }

      const salons = queryAll(`SELECT * FROM salons`);
      const matchedTails = new Set();
      let matched = 0, newlyContacted = 0;
      for (const s of salons) {
        const key = s.phone_key || phoneKeyOf(s.phone);
        if (!key || key.length < 9) continue;
        const tail = key.slice(-9);
        if (!campaignTails.has(tail)) continue;
        matchedTails.add(tail);

        const tags = tryParseArr(s.tags);
        if (!tags.includes(TAG)) tags.push(TAG);
        const updates = { tags: JSON.stringify(tags), last_contact_date: nowIso(), updated_date: nowIso() };
        if ((s.status || 'new') === 'new') { updates.status = 'contacted'; newlyContacted++; }
        const sets = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
        run(`UPDATE salons SET ${sets} WHERE id = ?`, [...Object.values(updates), s.id]);
        run(
          `INSERT INTO contact_log (id, salon_id, user_id, user_name, status, note) VALUES (?, ?, ?, ?, ?, ?)`,
          [randomUUID(), s.id, me.id, 'حملة ميتا', updates.status || s.status || '', 'تواصل عبر حملة ميتا 📣']
        );
        matched++;
      }
      res.json({
        numbers: campaignTails.size,
        matched,
        newlyContacted,
        notFound: campaignTails.size - matchedTails.size,
      });
    } catch (err) {
      console.error('[Sales mark-campaign]', err.message);
      res.status(500).json({ error: 'تعذّرت قراءة الملف. تأكد أنه ملف إكسل/CSV صالح.' });
    }
  });

  // ── وارد ردود واتساب (يقرأ جداول الويبهوك العامة) ─────────────────────────────
  const riyadhDay = (tsSec) => {
    const ms = (Number(tsSec) || 0) * 1000 + 3 * 3600 * 1000;
    return tsSec ? new Date(ms).toISOString().slice(0, 10) : '';
  };

  // قائمة الردود الواردة (الأحدث أولاً) مع مطابقة الصالون بآخر ٩ أرقام.
  router.get('/wa/replies', requireRole('admin'), (req, res) => {
    const { search = '', from = '', to = '', handled = '' } = req.query;
    let rows = queryAll(`SELECT * FROM wa_inbound ORDER BY wa_timestamp DESC, received_at DESC`);

    // خريطة الصوالين: آخر ٩ أرقام → { id, name, city, owner_name, status }.
    const salonByTail = new Map();
    for (const s of queryAll(`SELECT id, name, city, phone, phone_key, owner_id, owner_name, status FROM salons`)) {
      const key = s.phone_key || phoneKeyOf(s.phone);
      if (key && key.length >= 9) salonByTail.set(key.slice(-9), s);
    }
    // خريطة اسم الحملة لكل صالون (آخر حملة أُرسل إليها فيها).
    const campBySalon = new Map();
    for (const r of queryAll(
      `SELECT r.salon_id, c.name AS cname FROM wa_campaign_recipients r
       JOIN wa_campaigns c ON c.id = r.campaign_id
       WHERE r.salon_id IS NOT NULL AND r.salon_id != '' ORDER BY r.sent_at`
    )) { campBySalon.set(r.salon_id, r.cname); }

    const q = String(search).trim().toLowerCase();
    const out = [];
    for (const r of rows) {
      // فلترة الحالة (تمّت معالجته؟).
      if (handled === 'true' && !r.handled) continue;
      if (handled === 'false' && r.handled) continue;
      // فلترة التاريخ (بيوم الرياض).
      const day = riyadhDay(r.wa_timestamp) || (r.received_at || '').slice(0, 10);
      if (from && day && day < from) continue;
      if (to && day && day > to) continue;

      const digits = phoneKeyOf(r.from_number);
      const salon = digits.length >= 9 ? salonByTail.get(digits.slice(-9)) : null;

      // بحث بالرقم/الاسم/النص/اسم الصالون.
      if (q) {
        const hay = `${r.from_number} ${r.profile_name || ''} ${r.body || ''} ${salon?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      out.push({
        ...r, handled: !!r.handled,
        salon_id: salon?.id || null,
        salon_name: salon?.name || null,
        salon_city: salon?.city || null,
        salon_status: salon?.status || null,
        assigned_to: salon?.owner_name || null,
        campaign_name: salon ? (campBySalon.get(salon.id) || null) : null,
      });
      if (out.length >= 500) break;
    }
    res.json(out);
  });

  // تبديل حالة «تمّت معالجته».
  router.post('/wa/replies/:id/handled', requireRole('admin'), (req, res) => {
    const row = queryOne(`SELECT id FROM wa_inbound WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'الرد غير موجود' });
    const handled = req.body && req.body.handled ? 1 : 0;
    run(`UPDATE wa_inbound SET handled = ? WHERE id = ?`, [handled, req.params.id]);
    res.json({ id: req.params.id, handled: !!handled });
  });

  // إحصائيات حالات الإرسال ضمن مدى زمني (بيوم الرياض) من جدول الأحداث الفريدة.
  router.get('/wa/stats', requireRole('admin'), (req, res) => {
    const from = req.query.from || '0000-00-00';
    const to = req.query.to || '9999-99-99';
    const counts = { sent: 0, delivered: 0, read: 0, failed: 0 };
    for (const r of queryAll(
      `SELECT status, COUNT(*) AS c FROM wa_status_event WHERE day >= ? AND day <= ? GROUP BY status`,
      [from, to]
    )) {
      if (r.status in counts) counts[r.status] = r.c;
    }
    const errors = queryAll(
      `SELECT error_code, COUNT(*) AS count FROM wa_status_event
       WHERE status = 'failed' AND error_code IS NOT NULL AND error_code != '' AND day >= ? AND day <= ?
       GROUP BY error_code ORDER BY count DESC LIMIT 10`,
      [from, to]
    );
    res.json({ ...counts, errors });
  });

  // ════════════════════════════════════════════════════════════════════════════
  //  المرحلة ٢: حملات الواتساب الأصلية + متابعة الفريق
  // ════════════════════════════════════════════════════════════════════════════
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // تطبيع الرقم لصيغة واتساب (السعودية افتراضاً) — أرقام فقط بدون +.
  const normalizeMsisdn = (phone) => {
    let d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = '966' + d.slice(1);
    else if (d.startsWith('5') && d.length === 9) d = '966' + d;
    return d;
  };

  // عدد الرسائل المُرسَلة فعلياً خلال ٢٤ ساعة متحرّكة (لحدّ ميتا اليومي).
  const sent24hCount = () => {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    return queryOne(
      `SELECT COUNT(*) AS c FROM wa_campaign_recipients WHERE send_status = 'sent' AND sent_at >= ?`,
      [cutoff]
    )?.c ?? 0;
  };

  // مُشغّلات الحملات النشطة في الذاكرة (لمنع تشغيل نفس الحملة مرّتين).
  const runners = new Set();

  // محرّك الإرسال: رسالة/ثانية، قابل للاستئناف، يحترم الإلغاء/الإيقاف والحدّ اليومي.
  async function runCampaign(campaignId) {
    if (runners.has(campaignId)) return;
    runners.add(campaignId);
    try {
      for (;;) {
        const camp = queryOne(`SELECT * FROM wa_campaigns WHERE id = ?`, [campaignId]);
        if (!camp || camp.status !== 'sending') break;

        if (sent24hCount() >= 2000) {
          run(`UPDATE wa_campaigns SET status = 'paused', note = ?, updated_date = ? WHERE id = ?`,
            ['بلغت ٢٠٠٠ رسالة خلال ٢٤ ساعة — أُوقفت مؤقتاً، تُستأنف تلقائياً لاحقاً', nowIso(), campaignId]);
          break;
        }

        const next = queryOne(
          `SELECT * FROM wa_campaign_recipients WHERE campaign_id = ? AND send_status = 'pending' ORDER BY rowid LIMIT 1`,
          [campaignId]
        );
        if (!next) {
          run(`UPDATE wa_campaigns SET status = 'done', updated_date = ? WHERE id = ?`, [nowIso(), campaignId]);
          break;
        }

        const components = buildComponents({ mediaId: camp.media_id || null });
        try {
          const { wamid } = await sendTemplateMessage({
            to: next.to_number, name: camp.template_name, language: camp.template_lang || 'ar', components,
          });
          run(`UPDATE wa_campaign_recipients SET send_status = 'sent', wamid = ?, sent_at = ?, error = NULL WHERE id = ?`,
            [wamid, nowIso(), next.id]);
          // مزامنة الصالون: تم التواصل = نعم، الحالة = تم الإرسال، آخر تواصل = الآن.
          if (next.salon_id) {
            const salon = queryOne(`SELECT status FROM salons WHERE id = ?`, [next.salon_id]);
            if (salon) {
              // لا نُنزّل حالة متقدّمة (ردت/مهتم/مشترك…) — نرقّي فقط جديد→تم الإرسال.
              const keep = ['replied', 'interested', 'scheduled_visit', 'subscribed'];
              const newStatus = keep.includes(salon.status) ? salon.status : 'sent';
              run(`UPDATE salons SET status = ?, last_contact_date = ?, updated_date = ? WHERE id = ?`,
                [newStatus, nowIso(), nowIso(), next.salon_id]);
              run(`INSERT INTO contact_log (id, salon_id, user_id, user_name, status, note) VALUES (?, ?, ?, ?, ?, ?)`,
                [randomUUID(), next.salon_id, camp.created_by || '', 'حملة واتساب', 'sent', `حملة: ${camp.name}`]);
            }
          }
          // تحذير ناعم فوق ١٨٠٠ (الحدّ ٢٠٠٠) — يُسجَّل في ملاحظة الحملة دون إيقاف.
          if (sent24hCount() >= 1800) {
            run(`UPDATE wa_campaigns SET note = ?, updated_date = ? WHERE id = ?`,
              ['تحذير: تجاوزت ١٨٠٠ رسالة خلال ٢٤ ساعة (الحدّ ٢٠٠٠) — انتبه للسقف', nowIso(), campaignId]);
          }
        } catch (err) {
          run(`UPDATE wa_campaign_recipients SET send_status = 'failed', error = ? WHERE id = ?`,
            [(err.code ? `[${err.code}] ` : '') + (err.message || 'فشل الإرسال'), next.id]);
        }
        await sleep(1000); // ~رسالة واحدة في الثانية
      }
    } catch (err) {
      console.error('[wa-campaign] runner error:', err?.stack || err?.message || err);
    } finally {
      runners.delete(campaignId);
    }
  }

  // إسناد دوري متوازن: أقلّ عضو (agent) تحميلاً بالصوالين النشطة يأخذ التالي.
  function pickRoundRobinAgent() {
    const agents = queryAll(`SELECT id, display_name FROM sales_users WHERE role = 'agent'`);
    if (!agents.length) return null;
    let best = null, bestCount = Infinity;
    for (const a of agents) {
      const c = queryOne(
        `SELECT COUNT(*) AS c FROM salons WHERE owner_id = ? AND status NOT IN ('subscribed','not_interested','do_not_send')`,
        [a.id]
      )?.c ?? 0;
      if (c < bestCount) { bestCount = c; best = a; }
    }
    return best;
  }

  // ── القوالب الحيّة (المعتمدة فقط) من ميتا ─────────────────────────────────────
  router.get('/wa/templates-live', requireRole('admin'), async (req, res) => {
    if (!waCloudConfigured()) return res.status(400).json({ error: 'WA_ACCESS_TOKEN غير مضبوط في الخادم' });
    try {
      const tpls = await listApprovedTemplates();
      res.json(tpls.map((t) => ({
        name: t.name, language: t.language, category: t.category,
        components: t.components, has_image: templateHasImageHeader(t),
      })));
    } catch (err) {
      res.status(502).json({ error: err?.response?.data?.error?.message || err.message || 'تعذّر جلب القوالب' });
    }
  });

  // ── إنشاء حملة (مسودّة) — يحلّ المستلمين ويرفع الصورة مرّة واحدة ─────────────────
  router.post('/wa/campaigns', requireRole('admin'),
    upload.fields([{ name: 'image', maxCount: 1 }, { name: 'numbers', maxCount: 1 }]),
    async (req, res) => {
      if (!waCloudConfigured()) return res.status(400).json({ error: 'WA_ACCESS_TOKEN غير مضبوط في الخادم' });
      const b = req.body || {};
      const name = String(b.name || '').trim();
      const template_name = String(b.template_name || '').trim();
      const template_lang = String(b.template_lang || 'ar').trim();
      if (!name || !template_name) return res.status(400).json({ error: 'اسم الحملة والقالب مطلوبان' });

      // بناء قائمة المستلمين.
      const seen = new Set();
      const recipients = []; // { salon_id, to_number }
      const numbersFile = req.files?.numbers?.[0];
      const allSalons = queryAll(`SELECT id, name, phone, phone_key, city, status, do_not_send FROM salons`);

      if (numbersFile) {
        // من ملف أرقام: نطابق الصوالين بآخر ٩ أرقام، والأرقام غير المطابقة تُرسَل بلا صالون.
        const salonByTail = new Map();
        for (const s of allSalons) {
          if (s.do_not_send) continue;
          const key = s.phone_key || phoneKeyOf(s.phone);
          if (key && key.length >= 9) salonByTail.set(key.slice(-9), s);
        }
        const wb = XLSX.read(numbersFile.buffer, { type: 'buffer' });
        const optedOut = new Set(
          allSalons.filter((s) => s.do_not_send).map((s) => (s.phone_key || phoneKeyOf(s.phone)).slice(-9))
        );
        for (const sheetName of wb.SheetNames) {
          for (const row of XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })) {
            for (const cell of row) {
              const digits = String(cell ?? '').replace(/\D/g, '');
              if (digits.length < 9) continue;
              const tail = digits.slice(-9);
              if (optedOut.has(tail)) continue;          // احترام منع الإرسال
              const msisdn = normalizeMsisdn(digits);
              if (!msisdn || seen.has(msisdn)) continue;
              seen.add(msisdn);
              const salon = salonByTail.get(tail);
              recipients.push({ salon_id: salon?.id || null, to_number: msisdn });
            }
          }
        }
      } else {
        // بالفلاتر: مدينة + حالة (الافتراضي: استثناء «تم التواصل» ⇒ الجدد فقط) + حدّ N.
        const city = String(b.city || '').trim();
        const status = String(b.status || '').trim();
        const limit = Math.max(0, parseInt(b.limit, 10) || 0);
        let list = allSalons.filter((s) => !s.do_not_send && String(s.phone || '').trim());
        if (city) list = list.filter((s) => s.city === city);
        if (status) list = list.filter((s) => (s.status || 'new') === status);
        else list = list.filter((s) => (s.status || 'new') === 'new'); // افتراضي: الجدد فقط
        for (const s of list) {
          const msisdn = normalizeMsisdn(s.phone);
          if (!msisdn || seen.has(msisdn)) continue;
          seen.add(msisdn);
          recipients.push({ salon_id: s.id, to_number: msisdn });
          if (limit && recipients.length >= limit) break;
        }
      }

      if (!recipients.length) return res.status(400).json({ error: 'لا يوجد مستلمون مطابقون بعد استثناء «لا ترسل» والمكرّرات' });

      // رفع صورة الترويسة مرّة واحدة (إن وُجدت).
      let media_id = null;
      const imageFile = req.files?.image?.[0];
      if (imageFile) {
        try { media_id = await uploadMedia(imageFile.buffer, imageFile.originalname, imageFile.mimetype); }
        catch (err) { return res.status(502).json({ error: 'تعذّر رفع الصورة لميتا: ' + (err.message || '') }); }
      }

      const id = randomUUID();
      run(
        `INSERT INTO wa_campaigns (id, name, template_name, template_lang, media_id, status, filters, total, created_by, created_by_name)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
        [id, name, template_name, template_lang, media_id, JSON.stringify(b || {}), recipients.length, req.salesUser.id, req.salesUser.name]
      );
      for (const r of recipients) {
        run(`INSERT INTO wa_campaign_recipients (id, campaign_id, salon_id, to_number, send_status) VALUES (?, ?, ?, ?, 'pending')`,
          [randomUUID(), id, r.salon_id, r.to_number]);
      }
      res.status(201).json({ id, name, total: recipients.length, media_id, status: 'draft', warn24h: sent24hCount() });
    });

  // ── قائمة الحملات مع عدّادات ──────────────────────────────────────────────────
  router.get('/wa/campaigns', requireRole('admin'), (req, res) => {
    const camps = queryAll(`SELECT * FROM wa_campaigns ORDER BY created_date DESC`);
    const out = camps.map((c) => {
      const counts = { pending: 0, sent: 0, failed: 0 };
      for (const r of queryAll(`SELECT send_status, COUNT(*) AS c FROM wa_campaign_recipients WHERE campaign_id = ? GROUP BY send_status`, [c.id])) {
        counts[r.send_status] = r.c;
      }
      return { ...c, counts, running: runners.has(c.id) };
    });
    res.json(out);
  });

  // ── تفاصيل حملة + تفصيل لكل صالون (مع حالة التسليم من الويبهوك) ────────────────
  function campaignDetail(id) {
    const camp = queryOne(`SELECT * FROM wa_campaigns WHERE id = ?`, [id]);
    if (!camp) return null;
    const salonName = new Map();
    for (const s of queryAll(`SELECT id, name, city, owner_name FROM salons`)) salonName.set(s.id, s);
    const recips = queryAll(`SELECT * FROM wa_campaign_recipients WHERE campaign_id = ? ORDER BY rowid`, [id]);
    const totals = { total: recips.length, sent: 0, failed: 0, pending: 0, delivered: 0, read: 0 };
    const rows = recips.map((r) => {
      totals[r.send_status] = (totals[r.send_status] || 0) + 1;
      let delivery = null, error_code = null;
      if (r.wamid) {
        const st = queryOne(`SELECT status, error_code FROM wa_status WHERE wamid = ?`, [r.wamid]);
        if (st) { delivery = st.status; error_code = st.error_code; }
      }
      if (delivery === 'delivered') totals.delivered++;
      if (delivery === 'read') totals.read++;
      const s = r.salon_id ? salonName.get(r.salon_id) : null;
      return {
        id: r.id, salon_id: r.salon_id, to_number: r.to_number,
        salon_name: s?.name || null, salon_city: s?.city || null, assigned_to: s?.owner_name || null,
        send_status: r.send_status, delivery, error: r.error, error_code, sent_at: r.sent_at,
      };
    });
    return { campaign: camp, totals, rows };
  }

  router.get('/wa/campaigns/:id', requireRole('admin'), (req, res) => {
    const d = campaignDetail(req.params.id);
    if (!d) return res.status(404).json({ error: 'الحملة غير موجودة' });
    res.json(d);
  });

  // بدء / إيقاف مؤقت / استئناف / إلغاء.
  router.post('/wa/campaigns/:id/start', requireRole('admin'), (req, res) => {
    const camp = queryOne(`SELECT * FROM wa_campaigns WHERE id = ?`, [req.params.id]);
    if (!camp) return res.status(404).json({ error: 'الحملة غير موجودة' });
    if (['done', 'cancelled'].includes(camp.status)) return res.status(400).json({ error: 'الحملة منتهية' });
    run(`UPDATE wa_campaigns SET status = 'sending', updated_date = ? WHERE id = ?`, [nowIso(), req.params.id]);
    runCampaign(req.params.id);
    res.json({ id: req.params.id, status: 'sending' });
  });
  router.post('/wa/campaigns/:id/pause', requireRole('admin'), (req, res) => {
    run(`UPDATE wa_campaigns SET status = 'paused', updated_date = ? WHERE id = ? AND status = 'sending'`, [nowIso(), req.params.id]);
    res.json({ id: req.params.id, status: 'paused' });
  });
  router.post('/wa/campaigns/:id/cancel', requireRole('admin'), (req, res) => {
    run(`UPDATE wa_campaigns SET status = 'cancelled', updated_date = ? WHERE id = ?`, [nowIso(), req.params.id]);
    res.json({ id: req.params.id, status: 'cancelled' });
  });

  // تصدير تفصيل الحملة إكسل.
  router.get('/wa/campaigns/:id/export', requireRole('admin'), (req, res) => {
    const d = campaignDetail(req.params.id);
    if (!d) return res.status(404).json({ error: 'الحملة غير موجودة' });
    const STATUS_AR = { pending: 'بالانتظار', sent: 'أُرسلت', failed: 'فشلت' };
    const DELIV_AR = { sent: 'أُرسلت', delivered: 'وصلت', read: 'قُرئت', failed: 'فشلت' };
    const rows = d.rows.map((r) => ({
      'الصالون': r.salon_name || '—',
      'المدينة': r.salon_city || '',
      'الرقم': r.to_number,
      'المندوب': r.assigned_to || '',
      'حالة الإرسال': STATUS_AR[r.send_status] || r.send_status,
      'التسليم': DELIV_AR[r.delivery] || (r.delivery || ''),
      'كود الخطأ': r.error_code || '',
      'الخطأ': r.error || '',
      'وقت الإرسال': r.sent_at || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الحملة');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${req.params.id}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  });

  // ── إسناد صالون لمندوب (يدوي) ────────────────────────────────────────────────
  router.post('/salons/:id/assign', requireRole('admin'), (req, res) => {
    const salon = queryOne(`SELECT * FROM salons WHERE id = ?`, [req.params.id]);
    if (!salon) return res.status(404).json({ error: 'الصالون غير موجود' });
    const ownerId = (req.body && req.body.owner_id) || '';
    if (!ownerId) {
      run(`UPDATE salons SET owner_id = NULL, owner_name = NULL, updated_date = ? WHERE id = ?`, [nowIso(), req.params.id]);
      return res.json(parseSalon(queryOne(`SELECT * FROM salons WHERE id = ?`, [req.params.id])));
    }
    const u = queryOne(`SELECT id, display_name FROM sales_users WHERE id = ?`, [ownerId]);
    if (!u) return res.status(404).json({ error: 'العضو غير موجود' });
    run(`UPDATE salons SET owner_id = ?, owner_name = ?, updated_date = ? WHERE id = ?`,
      [u.id, u.display_name, nowIso(), req.params.id]);
    res.json(parseSalon(queryOne(`SELECT * FROM salons WHERE id = ?`, [req.params.id])));
  });

  // ── مهامي: صوالين المندوب مرتّبة (ردّت أولاً، ثم أُرسل ولم يردّ) ─────────────────
  router.get('/salons/my-tasks', requireRole('agent'), (req, res) => {
    const me = req.salesUser.id;
    const mine = queryAll(
      `SELECT * FROM salons WHERE owner_id = ? AND status NOT IN ('subscribed','not_interested','do_not_send')`,
      [me]
    ).map(parseSalon);

    // آخر رسالة واردة لكل صالون (مطابقة بآخر ٩ أرقام).
    const inboundByTail = new Map();
    for (const m of queryAll(`SELECT from_number, body, wa_timestamp FROM wa_inbound ORDER BY wa_timestamp ASC`)) {
      const t = phoneKeyOf(m.from_number);
      if (t.length >= 9) inboundByTail.set(t.slice(-9), m); // آخر واحدة تبقى (ترتيب تصاعدي)
    }
    const enriched = mine.map((s) => {
      const key = (s.phone_key || phoneKeyOf(s.phone));
      const inb = key && key.length >= 9 ? inboundByTail.get(key.slice(-9)) : null;
      return {
        ...s,
        last_inbound: inb?.body || null,
        last_inbound_ts: inb?.wa_timestamp || null,
        has_reply: !!inb || s.status === 'replied',
      };
    });
    // ردّت أولاً (حسب أحدث رسالة)، ثم البقية حسب آخر تواصل.
    enriched.sort((a, b) => {
      if (a.has_reply !== b.has_reply) return a.has_reply ? -1 : 1;
      if (a.has_reply && b.has_reply) return (b.last_inbound_ts || 0) - (a.last_inbound_ts || 0);
      return String(b.last_contact_date || '').localeCompare(String(a.last_contact_date || ''));
    });
    res.json(enriched);
  });

  // ── لوحة الفريق: عدّادات لكل مندوب (للمساءلة) ─────────────────────────────────
  router.get('/wa/team-board', requireRole('admin'), (req, res) => {
    const agents = queryAll(`SELECT id, display_name, role FROM sales_users WHERE role IN ('agent','admin') ORDER BY display_name`);
    const board = agents.map((a) => {
      const rows = queryAll(`SELECT status, last_contact_date FROM salons WHERE owner_id = ?`, [a.id]);
      return {
        user_id: a.id, name: a.display_name, role: a.role,
        assigned: rows.length,
        contacted: rows.filter((r) => r.last_contact_date).length,
        replied: rows.filter((r) => r.status === 'replied').length,
        interested: rows.filter((r) => r.status === 'interested').length,
        subscribed: rows.filter((r) => r.status === 'subscribed').length,
      };
    });
    res.json(board);
  });

  // استئناف الحملات التي بقيت «قيد الإرسال» بعد إعادة تشغيل الخادم.
  for (const c of queryAll(`SELECT id FROM wa_campaigns WHERE status = 'sending'`)) {
    runCampaign(c.id);
  }

  app.use('/api/sales', router);
  console.log('[Sales] ✅ بوابة فريق المبيعات «هوفيرا» جاهزة على /api/sales');
}

// ── أدوات مساعدة عامة ──────────────────────────────────────────────────────────
function tryParseArr(v) {
  try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; }
}

// يلتقط أول قيمة غير فارغة من بين أسماء أعمدة محتملة (عربية/إنجليزية).
function pick(row, keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return '';
}

function insertSalon(run, s) {
  const cols = ['id', 'name', 'phone', 'phone_key', 'city', 'district', 'address', 'rating',
    'reviews_count', 'type', 'platform', 'lat', 'lng', 'tags', 'owner_id', 'owner_name',
    'status', 'visit_result', 'subscription_type', 'follow_up', 'priority', 'note',
    'last_contact_date', 'created_date', 'updated_date'];
  const data = {
    id: s.id || randomUUID(),
    name: s.name || '',
    phone: s.phone || '',
    phone_key: s.phone_key != null ? s.phone_key : phoneKeyOf(s.phone),
    city: s.city || '',
    district: s.district || '',
    address: s.address || '',
    rating: s.rating || 0,
    reviews_count: s.reviews_count || 0,
    type: s.type || 'opportunity',
    platform: s.platform || '',
    lat: s.lat ?? null,
    lng: s.lng ?? null,
    tags: typeof s.tags === 'string' ? s.tags : JSON.stringify(s.tags || []),
    owner_id: s.owner_id || null,
    owner_name: s.owner_name || null,
    status: s.status || 'new',
    visit_result: s.visit_result || null,
    subscription_type: s.subscription_type || null,
    follow_up: s.follow_up || null,
    priority: s.priority || 'normal',
    note: s.note || null,
    last_contact_date: s.last_contact_date || null,
    created_date: s.created_date || nowIso(),
    updated_date: s.updated_date || nowIso(),
  };
  const placeholders = cols.map(() => '?').join(', ');
  run(`INSERT INTO salons (${cols.join(', ')}) VALUES (${placeholders})`, cols.map((c) => data[c]));
}
