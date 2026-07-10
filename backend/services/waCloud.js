// ── WhatsApp Cloud API — الإرسال الأصلي للحملات (المرحلة ٢) ─────────────────────
//
// يستخدم توكن نظام دائم عبر متغيّر البيئة WA_ACCESS_TOKEN (لا يُكشف أبداً للواجهة).
// أرقام الإرسال ثابتة افتراضياً وقابلة للتجاوز عبر البيئة:
//   WA_ACCESS_TOKEN     — توكن مستخدم النظام الدائم (whatsapp_business_messaging + management)
//   WA_PHONE_NUMBER_ID  — افتراضي 1285662864622292  (+966550629242)
//   WA_WABA_ID          — افتراضي 1550464573375195
//   WA_API_VERSION      — افتراضي v23.0
//
// منفصل تماماً عن services/whatsapp.js القديم (سير عمل ملفات bat) حتى يبقى ذاك
// كخطة بديلة دون أي تأثّر.

import axios from 'axios';
import FormData from 'form-data';

const API = () => process.env.WA_API_VERSION || 'v23.0';
const PHONE_ID = () => process.env.WA_PHONE_NUMBER_ID || '1285662864622292';
const WABA_ID = () => process.env.WA_WABA_ID || '1550464573375195';
const TOKEN = () => process.env.WA_ACCESS_TOKEN || '';
// قاعدة Graph — قابلة للتجاوز في الاختبارات فقط (WA_GRAPH_BASE)، افتراضها ميتا.
const BASE = () => process.env.WA_GRAPH_BASE || 'https://graph.facebook.com';

export function waCloudConfigured() { return !!TOKEN(); }
export function waCloudPhoneId() { return PHONE_ID(); }

function authHeader() { return { Authorization: `Bearer ${TOKEN()}` }; }
function graph(p) { return `${BASE()}/${API()}/${p}`; }

// قائمة القوالب المعتمدة فقط (مع مكوّناتها لاكتشاف ترويسة الصورة وأزرار الروابط).
export async function listApprovedTemplates() {
  if (!TOKEN()) throw new Error('WA_ACCESS_TOKEN غير مضبوط في الخادم');
  const { data } = await axios.get(graph(`${WABA_ID()}/message_templates`), {
    params: { fields: 'name,language,status,category,components', limit: 200 },
    headers: authHeader(), timeout: 20000,
  });
  return (data?.data || []).filter((t) => t.status === 'APPROVED');
}

// رفع صورة مرّة واحدة والحصول على media id لإعادة استخدامه في كل الإرسالات.
export async function uploadMedia(buffer, filename, mimetype) {
  if (!TOKEN()) throw new Error('WA_ACCESS_TOKEN غير مضبوط في الخادم');
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', buffer, { filename: filename || 'image.jpg', contentType: mimetype || 'image/jpeg' });
  const { data } = await axios.post(graph(`${PHONE_ID()}/media`), form, {
    headers: { ...authHeader(), ...form.getHeaders() }, timeout: 30000,
    maxContentLength: Infinity, maxBodyLength: Infinity,
  });
  return data?.id;
}

// إرسال رسالة قالب لرقم واحد. components يُبنى من قِبل المُستدعي (ترويسة صورة + جسم…).
// يُعيد { wamid, raw } عند القبول، ويرمي خطأً يحمل رسالة ميتا عند الفشل.
export async function sendTemplateMessage({ to, name, language = 'ar', components = [] }) {
  if (!TOKEN()) throw new Error('WA_ACCESS_TOKEN غير مضبوط في الخادم');
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name, language: { code: language }, ...(components.length ? { components } : {}) },
  };
  try {
    const { data } = await axios.post(graph(`${PHONE_ID()}/messages`), body, {
      headers: { ...authHeader(), 'Content-Type': 'application/json' }, timeout: 20000,
    });
    return { wamid: data?.messages?.[0]?.id || null, raw: data };
  } catch (err) {
    const meta = err?.response?.data?.error;
    const e = new Error(meta?.message || err.message || 'فشل الإرسال');
    e.code = meta?.code != null ? String(meta.code) : null;
    e.raw = err?.response?.data || { message: err.message };
    throw e;
  }
}

// إرسال رسالة نصّية حرّة — تُقبل فقط داخل نافذة ٢٤ ساعة من آخر رسالة للعميلة.
export async function sendTextMessage({ to, body }) {
  if (!TOKEN()) throw new Error('WA_ACCESS_TOKEN غير مضبوط في الخادم');
  const payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body, preview_url: true } };
  try {
    const { data } = await axios.post(graph(`${PHONE_ID()}/messages`), payload, {
      headers: { ...authHeader(), 'Content-Type': 'application/json' }, timeout: 20000,
    });
    return { wamid: data?.messages?.[0]?.id || null, raw: data };
  } catch (err) {
    const meta = err?.response?.data?.error;
    const e = new Error(meta?.message || err.message || 'فشل الإرسال');
    e.code = meta?.code != null ? String(meta.code) : null;
    throw e;
  }
}

// يبني مصفوفة components لقالب: ترويسة صورة (اختيارية) + متغيّرات جسم (اختيارية).
export function buildComponents({ mediaId, bodyParams = [] }) {
  const components = [];
  if (mediaId) components.push({ type: 'header', parameters: [{ type: 'image', image: { id: mediaId } }] });
  if (bodyParams.length) {
    components.push({ type: 'body', parameters: bodyParams.map((t) => ({ type: 'text', text: String(t ?? '') })) });
  }
  return components;
}

// هل القالب يحمل ترويسة صورة؟ (لفحص مكوّنات القالب القادمة من ميتا)
export function templateHasImageHeader(tpl) {
  return (tpl?.components || []).some(
    (c) => c.type === 'HEADER' && String(c.format || '').toUpperCase() === 'IMAGE'
  );
}
