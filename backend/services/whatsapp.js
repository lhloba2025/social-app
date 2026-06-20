// services/whatsapp.js — WhatsApp Cloud API sender. Fully ENV-GATED:
// nothing works until WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set, so the
// app keeps running normally with WhatsApp simply "not configured".
//
//   WHATSAPP_TOKEN            — permanent System User token (whatsapp_business_messaging)
//   WHATSAPP_PHONE_NUMBER_ID  — the Phone Number ID from WhatsApp > API Setup
//   WHATSAPP_API_VERSION      — optional, defaults to v21.0
//
// Cold / first-contact messages MUST use an APPROVED template. Free-form text
// is only delivered inside the 24h window after the customer messages you.

import axios from "axios";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export function isConfigured() {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function endpoint() {
  return `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}
function headers() {
  return { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" };
}

// Send an approved template (with optional image header + body variables).
export async function sendTemplate({ to, template, language = "ar", bodyParams = [], imageUrl }) {
  const components = [];
  if (imageUrl) components.push({ type: "header", parameters: [{ type: "image", image: { link: imageUrl } }] });
  if (bodyParams && bodyParams.length) {
    components.push({ type: "body", parameters: bodyParams.map((t) => ({ type: "text", text: String(t ?? "") })) });
  }
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: { name: template, language: { code: language }, ...(components.length ? { components } : {}) },
  };
  const { data } = await axios.post(endpoint(), body, { headers: headers(), timeout: 20000 });
  return data;
}

// ── Message templates (create / list from inside the app) ──────────────────
// Needs WHATSAPP_WABA_ID + a token with whatsapp_business_management.
function graph(p) { return `https://graph.facebook.com/${API_VERSION}/${p}`; }

export async function listTemplates() {
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!waba) throw new Error("WHATSAPP_WABA_ID غير مضبوط في الخادم");
  const { data } = await axios.get(graph(`${waba}/message_templates`), {
    params: { fields: "name,status,category,language,components", limit: 200 },
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }, timeout: 20000,
  });
  return data?.data || [];
}

// Create a (text) template and submit it for WhatsApp approval.
//   { name, category, language, bodyText, footerText, examples: ["sample for {{1}}", ...] }
export async function createTemplate({ name, category = "MARKETING", language = "ar", bodyText, footerText, examples = [] }) {
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!waba) throw new Error("WHATSAPP_WABA_ID غير مضبوط في الخادم");
  if (!name || !bodyText) throw new Error("الاسم ونص القالب مطلوبان");
  const body = { type: "BODY", text: bodyText };
  if (examples && examples.length) body.example = { body_text: [examples.map((e) => String(e))] };
  const components = [body];
  if (footerText) components.push({ type: "FOOTER", text: footerText });
  const { data } = await axios.post(graph(`${waba}/message_templates`),
    { name: String(name).toLowerCase().replace(/[^a-z0-9_]/g, "_"), category, language, components },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" }, timeout: 20000 });
  return data;
}

// Free-form text — ONLY delivered within the 24h customer-service window.
export async function sendText({ to, text }) {
  const body = { messaging_product: "whatsapp", to, type: "text", text: { body: text, preview_url: true } };
  const { data } = await axios.post(endpoint(), body, { headers: headers(), timeout: 20000 });
  return data;
}
