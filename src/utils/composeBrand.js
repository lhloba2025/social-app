// composeBrand.js — composites the brand elements onto an AI-generated
// BACKGROUND so they are pixel-exact: the real logo (PNG), the hook text in the
// REAL Arabic font (with highlighted words), and a contact footer bar. The AI
// only paints the scene; everything brand-critical is drawn here, guaranteed.

const EMOJI = {
  instagram: "📸", facebook: "f", tiktok: "🎵", snapchat: "👻",
  twitter: "𝕏", linkedin: "in", youtube: "▶", whatsapp: "📞", website: "🌐",
};

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Wrap an Arabic phrase into lines that fit maxWidth (returns array of word-arrays).
function wrapWords(ctx, words, maxWidth) {
  const lines = [];
  let cur = [];
  const space = ctx.measureText(" ").width;
  let curW = 0;
  for (const w of words) {
    const ww = ctx.measureText(w).width;
    if (cur.length && curW + space + ww > maxWidth) {
      lines.push(cur); cur = [w]; curW = ww;
    } else {
      curW += (cur.length ? space : 0) + ww; cur.push(w);
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

function drawHook(ctx, W, H, hook, highlights, kit, font) {
  const main = kit.mainColor || "#09007C";
  const hi = kit.highlightColor || "#EF43DC";
  const hlSet = new Set(highlights);
  let size = Math.round(W * 0.075);
  ctx.textBaseline = "middle";
  ctx.font = `800 ${size}px "${font}", "Tajawal", sans-serif`;
  const space = ctx.measureText(" ").width;
  const words = hook.split(/\s+/).filter(Boolean);
  // shrink until at most 2 lines
  let lines = wrapWords(ctx, words, W * 0.86);
  while (lines.length > 2 && size > 24) {
    size = Math.round(size * 0.9);
    ctx.font = `800 ${size}px "${font}", "Tajawal", sans-serif`;
    lines = wrapWords(ctx, words, W * 0.86);
  }
  const lineH = size * 1.35;
  // place block starting below the logo area
  const startY = H * 0.26;
  lines.forEach((lineWords, li) => {
    const widths = lineWords.map((w) => ctx.measureText(w).width);
    const lineW = widths.reduce((a, b) => a + b, 0) + space * (lineWords.length - 1);
    const y = startY + li * lineH;
    // RTL: first word at the RIGHT. Start x at right edge of the centered line.
    let x = W / 2 + lineW / 2;
    ctx.textAlign = "right";
    ctx.direction = "rtl";
    lineWords.forEach((w, i) => {
      ctx.fillStyle = hlSet.has(w.replace(/[؟?.!،,]/g, "")) || hlSet.has(w) ? hi : main;
      // subtle shadow for legibility on light/busy backgrounds
      ctx.shadowColor = "rgba(255,255,255,0.55)"; ctx.shadowBlur = size * 0.12;
      ctx.fillText(w, x, y);
      ctx.shadowBlur = 0;
      x -= widths[i] + space;
    });
  });
}

function drawContactBar(ctx, W, H, contacts, kit) {
  const bg = kit.contactBg || "#0F172A";
  const tx = kit.contactText || "#FFFFFF";
  const pill = kit.contactShape === "pill";
  const fs = Math.round(W * 0.026);
  ctx.font = `600 ${fs}px "Tajawal", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  const gap = W * 0.03;
  const iconGap = W * 0.008;
  // measure
  const items = contacts.map((c) => {
    const icon = EMOJI[(c.p || "").toLowerCase().includes("insta") ? "instagram"
      : (c.p || "").toLowerCase().includes("tik") ? "tiktok"
      : (c.p || "").toLowerCase().includes("snap") ? "snapchat"
      : (c.p || "").toLowerCase().includes("face") ? "facebook"
      : (c.p || "").toLowerCase().includes("whats") ? "whatsapp"
      : (c.p || "").toLowerCase().includes("x") || (c.p || "").toLowerCase().includes("twit") ? "twitter"
      : (c.p || "").toLowerCase().includes("link") ? "linkedin"
      : (c.p || "").toLowerCase().includes("you") ? "youtube" : "website"] || "•";
    const iw = ctx.measureText(icon).width;
    const tw = ctx.measureText(c.v).width;
    return { icon, v: c.v, w: iw + iconGap + tw };
  });
  const totalW = items.reduce((a, b) => a + b.w, 0) + gap * (items.length - 1);
  const barH = Math.round(H * 0.075);
  const y = H - barH;
  // bar background
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = bg;
  if (pill) {
    const padX = W * 0.03, padY = barH * 0.18;
    const bw = Math.min(W * 0.92, totalW + padX * 2);
    roundRect(ctx, (W - bw) / 2, y + padY, bw, barH - padY * 2, (barH - padY * 2) / 2);
    ctx.fill();
  } else {
    ctx.fillRect(0, y, W, barH);
  }
  ctx.restore();
  // items centered
  let x = (W - totalW) / 2;
  const cy = y + barH / 2;
  for (const it of items) {
    ctx.fillStyle = tx;
    ctx.fillText(it.icon, x, cy);
    x += ctx.measureText(it.icon).width + iconGap;
    ctx.fillStyle = tx;
    ctx.fillText(it.v, x, cy);
    x += ctx.measureText(it.v).width + gap;
  }
}

// Main entry. Returns a PNG data URL of the composed image.
export async function composeBranded({ bgUrl, logoUrl, hook, highlight, kit, contacts }) {
  const bg = await loadImg(bgUrl);
  const W = bg.naturalWidth || bg.width, H = bg.naturalHeight || bg.height;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.drawImage(bg, 0, 0, W, H);

  const font = kit.font || "Tajawal";
  try {
    await document.fonts.load(`800 ${Math.round(W * 0.075)}px "${font}"`);
    await document.fonts.load(`600 ${Math.round(W * 0.026)}px "Tajawal"`);
    await document.fonts.ready;
  } catch { /* fonts best-effort */ }

  if (logoUrl) {
    try {
      const lg = await loadImg(logoUrl);
      const lw = W * 0.20;
      const lh = lw * ((lg.naturalHeight || 1) / (lg.naturalWidth || 1));
      ctx.drawImage(lg, (W - lw) / 2, H * 0.04, lw, lh);
    } catch { /* logo optional */ }
  }

  if (hook && hook.trim()) {
    const hl = (highlight || "").split(/[,،]/).map((s) => s.trim()).filter(Boolean);
    drawHook(ctx, W, H, hook.trim(), hl, kit, font);
  }

  if (contacts && contacts.length) drawContactBar(ctx, W, H, contacts, kit);

  return c.toDataURL("image/png");
}
