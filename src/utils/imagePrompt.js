// imagePrompt.js — shared brand-kit + prompt builder for BOTH the custom
// (single) and the bulk (Excel) AI image generators. Keeping it in one place
// means the brand identity and the prompt rules stay identical across tabs.

export const LOGO_KEY = "brand_logo_v1"; // remembered reference logo (data URL)
export const KIT_KEY  = "brand_kit_v1";  // remembered colors/font/logoColor

export const ASPECTS = [
  { id: "4:5",  ar: "منشور 4:5",        en: "Post 4:5" },
  { id: "1:1",  ar: "مربع 1:1",         en: "Square 1:1" },
  { id: "9:16", ar: "ستوري/ريلز 9:16",  en: "Story 9:16" },
  { id: "16:9", ar: "عريض 16:9",        en: "Wide 16:9" },
  { id: "3:4",  ar: "عمودي 3:4",        en: "Portrait 3:4" },
  { id: "4:3",  ar: "أفقي 4:3",         en: "Landscape 4:3" },
];

// Arabic font choices — AI models have no real font files, so we hand them a
// STYLE DESCRIPTION (`s`). For an EXACT font, use the Design Studio.
export const FONTS = [
  { v: "Tajawal",     ar: "تجوال (حديث)",        s: "a modern geometric Arabic sans-serif with even, rounded monoline strokes" },
  { v: "Cairo",       ar: "القاهرة (حديث)",      s: "a clean contemporary Arabic sans-serif" },
  { v: "Almarai",     ar: "المراعي (بسيط)",      s: "a simple, minimal Arabic sans-serif" },
  { v: "Reem Kufi",   ar: "ريم كوفي (كوفي عصري)", s: "a modern geometric Kufic Arabic style with angular, structured letters" },
  { v: "Changa",      ar: "تشانجا (هندسي)",      s: "a bold geometric Arabic display style" },
  { v: "Lalezar",     ar: "لاله‌زار (عريض)",      s: "a thick, bold, rounded Arabic display style" },
  { v: "El Messiri",  ar: "المسيري (أنيق)",      s: "an elegant, semi-rounded modern Arabic style" },
  { v: "Aref Ruqaa",  ar: "عارف رقعة (رقعة)",     s: "traditional Arabic Ruqaa calligraphy — flowing, handwritten cursive" },
  { v: "Amiri",       ar: "أميري (نسخ كلاسيكي)",  s: "classical Arabic Naskh calligraphy — traditional and refined" },
];
export const fontStyle = (v) => (FONTS.find((f) => f.v === v)?.s) || "a modern geometric Arabic sans-serif";

// REAL platform pixel sizes for each aspect. The AI returns only an APPROXIMATE
// aspect (e.g. 9:16 → 768×1344, which is actually 0.571, not 0.5625), so when a
// post is published the platform crops it and brand elements at the edges get
// cut. We therefore composite the final image at these EXACT sizes so the
// output truly matches the platform and nothing is cropped.
export const SIZE_PX = {
  "1:1":  { w: 1080, h: 1080 }, // Instagram square
  "4:5":  { w: 1080, h: 1350 }, // Instagram/Facebook portrait post
  "9:16": { w: 1080, h: 1920 }, // Story / Reels / TikTok / Snapchat
  "16:9": { w: 1920, h: 1080 }, // YouTube / wide
  "3:4":  { w: 1080, h: 1440 }, // portrait
  "4:3":  { w: 1440, h: 1080 }, // landscape
};
export const pxForAspect = (aspect) => SIZE_PX[aspect] || null;

export const DEFAULT_KIT = {
  mainColor: "#09007C",
  highlightColor: "#EF43DC",
  font: "Tajawal",
  changeLogoColor: false,
  logoColor: "#09007C",
  // Contact bar (footer) — fixed like the logo; included only when enabled.
  showContact: false,
  cInstagram: "",
  cTiktok: "",
  cSnapchat: "",
  cTwitter: "",
  cWhatsapp: "",
  cWebsite: "",
  // Contact bar style.
  contactBg: "#0F172A",
  contactText: "#FFFFFF",
  contactShape: "strip", // "strip" (full width) | "pill" (centered rounded)
  contactLayout: "horizontal", // "horizontal" | "vertical"
};

// Build the contact-bar contacts list from the kit (empty when disabled).
export function kitContacts(kit) {
  if (!kit?.showContact) return [];
  const c = [];
  if (kit.cInstagram) c.push({ p: "Instagram", v: kit.cInstagram });
  if (kit.cTiktok)    c.push({ p: "TikTok", v: kit.cTiktok });
  if (kit.cSnapchat)  c.push({ p: "Snapchat", v: kit.cSnapchat });
  if (kit.cTwitter)   c.push({ p: "X (Twitter)", v: kit.cTwitter });
  if (kit.cWhatsapp)  c.push({ p: "WhatsApp", v: kit.cWhatsapp });
  if (kit.cWebsite)   c.push({ p: "Website", v: kit.cWebsite });
  return c;
}

export function loadKit() {
  try { return { ...DEFAULT_KIT, ...JSON.parse(localStorage.getItem(KIT_KEY) || "{}") }; }
  catch { return { ...DEFAULT_KIT }; }
}
export function loadLogo() {
  try { return localStorage.getItem(LOGO_KEY) || ""; } catch { return ""; }
}

// Build the image prompt from the brand kit + this post's content.
export function buildPrompt({ scene, hook, highlight, aspect, kit, bgOnly }) {
  const { mainColor, highlightColor, font, changeLogoColor, logoColor } = kit;
  const hl = (highlight || "").split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  const hlList = hl.map((h) => `"${h}"`).join(", ");

  if (bgOnly) {
    return `${(scene || "").trim()}

COMPOSITION (very important): keep the TOP THIRD of the frame a CLEAN, calm, evenly-lit, uncluttered area — a smooth softly-lit wall, bright window light, or plain surface — with NO objects and NO busy detail there. This empty top space is RESERVED for a logo and a headline to be placed on top afterward, so it must read clean and uniform. Arrange ALL props in the LOWER two-thirds, with a clear focal subject.

LIGHTING & QUALITY: bright, soft, airy natural daylight (light and luminous, never dim or muddy); high-end product / editorial photography look; tack-sharp focus with crisp fine detail and realistic materials & textures; gentle shallow depth-of-field so the background softly blurs while the props stay sharp; high resolution, clean and premium. Light / cream base with a harmonious palette built around ${mainColor} and ${highlightColor}.

Photorealistic. Aspect ratio ${aspect}.

Negative: any text, words, letters, logo, watermark, human faces, clutter at the top, busy/detailed background behind the top logo area, blur on the main props, dark/dim/muddy lighting, harsh yellow tones, plastic or fake-looking objects, low quality.`;
  }

  return `${(scene || "").trim()}

LOGO PLACEMENT (mandatory): Use the ATTACHED logo PNG as reference and place it at the TOP-CENTER, about 10-12% of the image width, with a CLEAR MARGIN below the top edge. The COMPLETE logo (including the small symbol ABOVE the name) must be FULLY visible — never crop, cut, or let any part touch or cross the top/side edges. Place the logo DIRECTLY on the scene with a fully transparent background — NO white box, NO circle, NO frame, NO border, NO badge, NO card or container behind it. Do NOT redraw, distort, rearrange, or duplicate it. ${changeLogoColor ? `Recolor the logo to ${logoColor}.` : "Preserve the logo's ORIGINAL colors exactly."}

ARABIC TEXT ACCURACY (critical): render ALL Arabic with PERFECT, correctly-spelled, properly-connected right-to-left letters — real, readable Arabic, never garbled or disconnected glyphs. Write each word EXACTLY ONCE — never duplicate or repeat a word, and never split a single word across two lines. Render the Arabic in ${fontStyle(font)}, Bold, clean, sharp and legible.

${hook && hook.trim()
  ? `HOOK TEXT overlay BELOW the logo, right-aligned, large and Bold: render the EXACT phrase "${hook.trim()}" — every word present, each word appearing only ONCE, no repeats, no extra words, on one or two balanced lines. Render the text in ${mainColor}.${hl.length ? ` Color ONLY these word(s)/phrase(s) in ${highlightColor}: ${hlList}; keep every other word in ${mainColor}.` : ""}`
  : "No text overlay besides the logo."}

COLOR & STYLE: primary text color ${mainColor}${hl.length ? `, highlight color ${highlightColor}` : ""}, on a clean light/cream background. Premium, harmonious, uncluttered, photorealistic. Aspect ratio ${aspect}. No human faces.
${(() => {
  const cs = kitContacts(kit);
  if (!cs.length) return "";
  const shape = kit.contactShape === "pill" ? "a centered rounded-pill bar (not full width)" : "a slim full-width horizontal bar";
  const bg = kit.contactBg || "#0F172A";
  const tx = kit.contactText || "#FFFFFF";
  return `\nCONTACT FOOTER BAR — THIS IS REQUIRED, ALWAYS DRAW IT: at the very bottom, ${shape} with a ${bg} semi-transparent background, fully INSIDE the frame and clear of the main subject. In one centered row, evenly spaced, show each item as ONLY the correct platform ICON (its recognizable logo glyph) immediately followed by its handle text in ${tx} — do NOT write any platform NAME as words (icons only), and spell each handle EXACTLY as given, never alter/translate/omit it: ${cs.map((c) => `${c.p}-icon "${c.v}"`).join("   ")}. The bar must be clearly visible and legible.\n`;
})()}
Negative: white box / frame / circle / border / badge / card behind the logo, logo on a white sticker outline, distorted logo, redrawn logo, separated logo parts, multiple logos, duplicated word, repeated word, a word written twice, missing words, incomplete or broken Arabic, garbled or disconnected letters, dropped word, blurry, low quality, watermark, cluttered scene, real third-party brand logos, exclamation marks.`;
}

// Call the backend generator. Returns a data URL.
export async function generateImage({ prompt, referenceImage, aspectRatio }) {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, referenceImage: referenceImage || undefined, aspectRatio }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
  return data.dataUrl;
}
