// ── مستقبِل ويبهوك واتساب كلاود API ────────────────────────────────────────────
//
// نقطة عامة (بدون مصادقة) تستقبل من ميتا:
//   • ردود العملاء الواردة (value.messages)
//   • تحديثات حالة الرسائل الصادرة (value.statuses): sent/delivered/read/failed
//
// نقبل فقط أحداث رقم النظام (أو قائمة WA_ALLOWED_PHONE_IDS) ونتجاهل باقي أرقام
// نفس التوكن. المعالجة تتم بعد الرد بـ 200 فوراً، ودائماً نبتلع الأخطاء حتى لا
// يعيد ميتا الإرسال بلا نهاية.
//
// جداول البيانات تُنشأ هنا وتُقرأ من صفحة الإدارة عبر مسارات /api/sales/wa/*.

import express from 'express';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { waCloudPhoneId } from './waCloud.js';

const nowIso = () => new Date().toISOString();

// أرقام النظام المسموح استقبال ردودها. نفس التوكن (WABA) قد يحمل أكثر من رقم،
// وميتا ترسل أحداث كل الأرقام — فنقبل فقط رقم النظام (أو قائمة عبر
// WA_ALLOWED_PHONE_IDS) ونتجاهل باقي الأرقام حتى لا تختلط محادثاتها بالنظام.
const ALLOWED_PHONE_IDS = (process.env.WA_ALLOWED_PHONE_IDS || waCloudPhoneId() || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

// كلمات إيقاف الإرسال (opt-out) — أهمّها «إيقاف».
const OPT_OUT = new Set(['إيقاف', 'ايقاف', 'الغاء', 'إلغاء', 'stop', 'unsubscribe']);
const digitsOnly = (v) => String(v ?? '').replace(/\D/g, '');

// الرياض = UTC+3 ثابتة (بلا توقيت صيفي). نشتق اليوم المحلي من طابع زمني unix.
function riyadhDay(tsSec) {
  const ms = (Number(tsSec) || Math.floor(Date.now() / 1000)) * 1000 + 3 * 3600 * 1000;
  return new Date(ms).toISOString().slice(0, 10); // YYYY-MM-DD
}

// ينشئ جداول الوارد/الحالات إن لم تكن موجودة.
export function initWhatsappSchema(run) {
  run(`
    CREATE TABLE IF NOT EXISTS wa_inbound (
      id              TEXT PRIMARY KEY,
      wamid           TEXT UNIQUE,
      from_number     TEXT,
      profile_name    TEXT,
      msg_type        TEXT,
      body            TEXT,
      wa_timestamp    INTEGER,
      phone_number_id TEXT,
      received_at     TEXT,
      handled         INTEGER DEFAULT 0
    );
  `);
  // آخر حالة معروفة لكل رسالة صادرة.
  run(`
    CREATE TABLE IF NOT EXISTS wa_status (
      wamid           TEXT PRIMARY KEY,
      status          TEXT,
      recipient       TEXT,
      error_code      TEXT,
      error_detail    TEXT,
      wa_timestamp    INTEGER,
      phone_number_id TEXT,
      day             TEXT,
      updated_at      TEXT
    );
  `);
  // حدث حالة فريد لكل (رسالة، حالة) — يمنع العدّ المزدوج عند إعادة إرسال ميتا،
  // وهو مصدر الحقيقة لبطاقات الإحصائيات ضمن أي مدى زمني.
  run(`
    CREATE TABLE IF NOT EXISTS wa_status_event (
      wamid        TEXT,
      status       TEXT,
      day          TEXT,
      error_code   TEXT,
      wa_timestamp INTEGER,
      PRIMARY KEY (wamid, status)
    );
  `);
  // وسائط الرسائل الواردة (صورة/فيديو…): معرّف الوسائط ونوعها لعرضها لاحقاً.
  try { run(`ALTER TABLE wa_inbound ADD COLUMN media_id TEXT`); } catch { /* موجود */ }
  try { run(`ALTER TABLE wa_inbound ADD COLUMN media_mime TEXT`); } catch { /* موجود */ }
}

// يستخرج من كائن وسائط التعليق والمعرّف والنوع (صورة/فيديو/مستند…).
function parseMediaObj(obj) {
  return {
    body: obj?.caption || '',
    media_id: obj?.id || null,
    media_mime: obj?.mime_type || null,
  };
}

// يركّب المسار العام /api/whatsapp/webhook (GET تحقّق + POST استقبال).
export function mountWhatsappWebhook(app, ctx) {
  const { run, queryOne, queryAll } = ctx;
  initWhatsappSchema(run);

  // ترحيل لمرّة واحدة: رسائل وسائط قديمة خُزّن فيها كائن الوسائط JSON خام داخل body
  // (قبل إصلاح التحليل) فتظهر كنص JSON بدل الصورة — نعيد تحليلها لاستخراج
  // التعليق ومعرّف الوسائط ونوعها حتى تُعرض الصورة عرضاً سليماً.
  try {
    const legacy = queryAll(
      `SELECT id, body FROM wa_inbound WHERE (media_id IS NULL OR media_id = '') AND body LIKE '{%"id"%'`
    );
    let fixed = 0;
    for (const row of legacy) {
      try {
        const obj = JSON.parse(row.body);
        if (obj && obj.id) {
          run(`UPDATE wa_inbound SET body = ?, media_id = ?, media_mime = ? WHERE id = ?`,
            [obj.caption || '', String(obj.id), obj.mime_type || null, row.id]);
          fixed++;
        }
      } catch { /* ليس JSON صالحاً — نتركه كما هو */ }
    }
    if (fixed) console.log(`[wa-webhook] ✅ أُعيد تحليل ${fixed} رسالة وسائط قديمة (كانت تظهر JSON).`);
  } catch (e) { console.warn('[wa-webhook] media backfill skipped:', e?.message || e); }

  const router = express.Router();
  const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || 'hovera123';
  const APP_SECRET = process.env.WA_APP_SECRET || '';

  // ── تحقّق ميتا (Verification) ────────────────────────────────────────────────
  // ميتا ترسل المفاتيح حرفياً: hub.mode / hub.verify_token / hub.challenge.
  router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).type('text/plain').send(String(challenge ?? ''));
    }
    return res.sendStatus(403);
  });

  // ── استقبال الأحداث ──────────────────────────────────────────────────────────
  router.post('/webhook', (req, res) => {
    // تحقّق توقيع اختياري — يُسجّل فقط ولا يمنع الاستقبال (لا نُسقط أي رد).
    if (APP_SECRET) {
      try {
        const sig = req.get('x-hub-signature-256') || '';
        const expected = 'sha256=' + createHmac('sha256', APP_SECRET)
          .update(req.rawBody || Buffer.from(JSON.stringify(req.body || {}))).digest('hex');
        const a = Buffer.from(sig), b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          console.warn('[wa-webhook] ⚠ توقيع X-Hub-Signature-256 غير مطابق (لم يُمنع الاستقبال).');
        }
      } catch (e) { console.warn('[wa-webhook] signature check error:', e?.message || e); }
    }

    // نرد فوراً بـ 200 ثم نعالج بشكل متزامن.
    res.sendStatus(200);
    try {
      const body = req.body || {};
      for (const entry of (Array.isArray(body.entry) ? body.entry : [])) {
        for (const change of (Array.isArray(entry.changes) ? entry.changes : [])) {
          const value = change?.value || {};
          const phoneNumberId = value?.metadata?.phone_number_id || null;
          const profileName = value?.contacts?.[0]?.profile?.name || null;

          // نتجاهل أحداث الأرقام الأخرى تحت نفس التوكن (WABA): نقبل فقط رقم النظام.
          // إن لم نتمكّن من تحديد الرقم (لا قائمة أو لا معرّف) نقبل — سلوك آمن للخلف.
          if (phoneNumberId && ALLOWED_PHONE_IDS.length && !ALLOWED_PHONE_IDS.includes(phoneNumberId)) {
            continue;
          }

          for (const m of (Array.isArray(value.messages) ? value.messages : [])) {
            storeInbound(run, m, profileName, phoneNumberId);
            syncSalonOnInbound(run, queryOne, queryAll, m);
          }
          for (const s of (Array.isArray(value.statuses) ? value.statuses : [])) {
            storeStatus(run, queryOne, s, phoneNumberId);
          }
        }
      }
    } catch (err) {
      console.error('[wa-webhook] processing error:', err?.stack || err?.message || err);
    }
  });

  app.use('/api/whatsapp', router);
  console.log(`[wa-webhook] ✅ مستقبِل ويبهوك واتساب جاهز على /api/whatsapp/webhook (verify token ${VERIFY_TOKEN ? 'مضبوط' : 'غير مضبوط'})`);
}

// يخزّن ردّاً واردًا (dedup على wamid). للوسائط: نحفظ التعليق كنص + معرّف الوسائط
// ونوعها لعرض الصورة/الملف لاحقاً (بدل تخزين JSON خام).
function storeInbound(run, m, profileName, phoneNumberId) {
  if (!m?.id) return;
  const type = m.type || 'unknown';
  let body = '', mediaId = null, mediaMime = null;
  if (type === 'text') {
    body = m.text?.body ?? '';
  } else if (type === 'button') {
    body = m.button?.text || '';
  } else if (type === 'interactive') {
    body = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
  } else {
    const obj = parseMediaObj(m[type]);           // image/video/document/audio/sticker
    body = obj.body; mediaId = obj.media_id; mediaMime = obj.media_mime;
  }
  run(
    `INSERT OR IGNORE INTO wa_inbound
       (id, wamid, from_number, profile_name, msg_type, body, media_id, media_mime, wa_timestamp, phone_number_id, received_at, handled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [randomUUID(), m.id, m.from || '', profileName, type, body, mediaId, mediaMime,
     Number(m.timestamp) || null, phoneNumberId, nowIso()]
  );
}

// عند وصول رد وارد: نطابق الصالون (بآخر ٩ أرقام) ونحدّث حالته.
//   • «إيقاف» ⇒ لا ترسل (do_not_send) واستثناء من كل الحملات القادمة.
//   • غير ذلك ⇒ الحالة «ردت - بانتظار متابعة» + إسناد دوري لأقلّ مندوب تحميلاً
//     إن لم يكن للصالون مالك. لا نُنزّل حالة نهائية (مشترك/غير مهتم).
function syncSalonOnInbound(run, queryOne, queryAll, m) {
  try {
    const tail = digitsOnly(m?.from).slice(-9);
    if (!tail || tail.length < 9) return;
    // نطابق بآخر ٩ أرقام من phone_key أو phone.
    const salon = queryAll(
      `SELECT id, status, owner_id, phone, phone_key, personal_handled FROM salons`
    ).find((s) => {
      const key = s.phone_key || digitsOnly(s.phone);
      return key && key.length >= 9 && key.slice(-9) === tail;
    });
    if (!salon) return;

    const text = m?.type === 'text' ? String(m.text?.body || '').trim() : '';
    const isOptOut = text && OPT_OUT.has(text.toLowerCase());

    if (isOptOut) {
      run(`UPDATE salons SET do_not_send = 1, status = 'do_not_send', updated_date = ? WHERE id = ?`, [nowIso(), salon.id]);
      run(`INSERT INTO contact_log (id, salon_id, user_id, user_name, status, note) VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), salon.id, '', 'واتساب', 'do_not_send', 'طلب إيقاف الرسائل (إيقاف)']);
      return;
    }

    // «أُنجزت عبر واتساب الشخصي»: المندوبة نقلت العميلة لجوالها، فلا نُرجِعها كمهمة
    // ولا نغيّر حالتها عند ورود ردّ على رقم النظام (نُسجّل الرسالة فقط في السجلّ).
    const movedToPersonal = salon.personal_handled === 1;

    // حالات نهائية لا نلمسها.
    const cur = salon.status || 'new';
    const updates = { updated_date: nowIso() };
    if (!movedToPersonal && !['subscribed', 'not_interested', 'do_not_send', 'interested', 'scheduled_visit'].includes(cur)) {
      updates.status = 'replied';
    }
    // ردّ وارد ⇒ يصبح مهمة نشِطة (ما لم يكن مغلقاً أو مُنجزاً عبر واتساب الشخصي).
    if (!movedToPersonal && !['subscribed', 'not_interested', 'do_not_send'].includes(cur)) updates.is_task = 1;
    // إسناد دوري متوازن إن كان الصالون بلا مالك (نتخطّاه للمُنجز عبر واتساب الشخصي).
    if (!movedToPersonal && !salon.owner_id) {
      const agents = queryAll(`SELECT id, display_name FROM sales_users WHERE role = 'agent' AND active = 1`);
      if (agents.length) {
        let best = null, bestCount = Infinity;
        for (const a of agents) {
          const c = queryOne(
            `SELECT COUNT(*) AS c FROM salons WHERE owner_id = ? AND is_task = 1 AND status NOT IN ('subscribed','not_interested','do_not_send')`,
            [a.id]
          )?.c ?? 0;
          if (c < bestCount) { bestCount = c; best = a; }
        }
        if (best) { updates.owner_id = best.id; updates.owner_name = best.display_name; }
      }
    }
    const sets = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    run(`UPDATE salons SET ${sets} WHERE id = ?`, [...Object.values(updates), salon.id]);
    const snippet = text ? text.slice(0, 120) : `[${m?.type || 'رسالة'}]`;
    run(`INSERT INTO contact_log (id, salon_id, user_id, user_name, status, note) VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), salon.id, updates.owner_id || salon.owner_id || '', 'رد وارد', updates.status || cur, `رد وارد: ${snippet}`]);
  } catch (err) {
    console.error('[wa-webhook] syncSalonOnInbound error:', err?.message || err);
  }
}

// يخزّن/يحدّث حالة رسالة صادرة + يسجّل حدثاً فريداً لأغراض الإحصاء.
function storeStatus(run, queryOne, s, phoneNumberId) {
  if (!s?.id || !s?.status) return;
  const errCode = s.errors?.[0]?.code != null ? String(s.errors[0].code) : null;
  const errDetail = s.errors?.[0]?.error_data?.details || s.errors?.[0]?.title || null;
  const tsSec = Number(s.timestamp) || Math.floor(Date.now() / 1000);
  const day = riyadhDay(tsSec);

  // آخر حالة لكل wamid — لا نتراجع لحالة أقدم زمنياً.
  const existing = queryOne(`SELECT wa_timestamp FROM wa_status WHERE wamid = ?`, [s.id]);
  if (!existing) {
    run(
      `INSERT INTO wa_status
         (wamid, status, recipient, error_code, error_detail, wa_timestamp, phone_number_id, day, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.status, s.recipient_id || '', errCode, errDetail, tsSec, phoneNumberId, day, nowIso()]
    );
  } else if (tsSec >= (existing.wa_timestamp || 0)) {
    run(
      `UPDATE wa_status SET status = ?, recipient = ?, error_code = ?, error_detail = ?,
         wa_timestamp = ?, phone_number_id = ?, day = ?, updated_at = ? WHERE wamid = ?`,
      [s.status, s.recipient_id || '', errCode, errDetail, tsSec, phoneNumberId, day, nowIso(), s.id]
    );
  }

  // حدث فريد لكل (رسالة، حالة) — يمنع العدّ المزدوج عند إعادة الإرسال.
  const seen = queryOne(`SELECT 1 AS x FROM wa_status_event WHERE wamid = ? AND status = ?`, [s.id, s.status]);
  if (!seen) {
    run(
      `INSERT INTO wa_status_event (wamid, status, day, error_code, wa_timestamp) VALUES (?, ?, ?, ?, ?)`,
      [s.id, s.status, day, errCode, tsSec]
    );
  }
}
