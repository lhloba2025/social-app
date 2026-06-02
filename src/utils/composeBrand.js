// composeBrand.js — composites the brand elements onto an AI-generated
// BACKGROUND so they are pixel-exact: the real logo (PNG), the hook text in the
// REAL Arabic font (with highlighted words), and a contact footer bar. The AI
// only paints the scene; everything brand-critical is drawn here, guaranteed.

import { siInstagram, siTiktok, siSnapchat, siWhatsapp, siFacebook, siX, siYoutube } from "simple-icons";

const ICONS = {
  instagram: siInstagram, tiktok: siTiktok, snapchat: siSnapchat, whatsapp: siWhatsapp,
  facebook: siFacebook, twitter: siX, x: siX, youtube: siYoutube,
};
function platformKey(p) {
  const s = (p || "").toLowerCase();
  if (s.includes("insta")) return "instagram";
  if (s.includes("tik")) return "tiktok";
  if (s.includes("snap")) return "snapchat";
  if (s.includes("whats")) return "whatsapp";
  if (s.includes("face")) return "facebook";
  if (s.includes("link")) return "linkedin";
  if (s.includes("you")) return "youtube";
  if (s.includes("x") || s.includes("twit")) return "twitter";
  return "website";
}
function iconSvgUrl(icon, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="${icon.path}"/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
async function loadIcon(p, color) {
  const icon = ICONS[platformKey(p)];
  if (!icon) return null;
  try { return await loadImg(iconSvgUrl(icon, color)); } catch { return null; }
}

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

function drawHook(ctx, W, H, hook, highlights, kit, font, layout = {}) {
  const main = kit.mainColor || "#09007C";
  const hi = kit.highlightColor || "#EF43DC";
  const hlSet = new Set(highlights);
  let size = Math.round(W * 0.075 * (layout.hookScale ?? 1));
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
  // place block starting below the logo area (adjustable)
  const startY = H * (layout.hookY ?? 0.26);
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

function drawContactBar(ctx, W, H, contacts, kit, iconImgs) {
  const bg = kit.contactBg || "#0F172A";
  const tx = kit.contactText || "#FFFFFF";
  const pill = kit.contactShape === "pill";
  const fs = Math.round(W * 0.026);
  const iconSize = Math.round(fs * 1.25);
  const iconGap = W * 0.006;
  const gap = W * 0.028;
  ctx.font = `600 ${fs}px "Tajawal", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  // measure each item (icon + handle)
  const items = contacts.map((c, i) => {
    const tw = ctx.measureText(c.v).width;
    const hasIcon = !!iconImgs[i];
    return { img: iconImgs[i], v: c.v, w: (hasIcon ? iconSize + iconGap : 0) + tw };
  });
  const totalW = items.reduce((a, b) => a + b.w, 0) + gap * (items.length - 1);
  const barH = Math.round(H * 0.075);
  const y = H - barH;
  // bar background
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = bg;
  if (pill) {
    const padX = W * 0.03, padY = barH * 0.18;
    const bw = Math.min(W * 0.94, totalW + padX * 2);
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
    if (it.img) {
      ctx.drawImage(it.img, x, cy - iconSize / 2, iconSize, iconSize);
      x += iconSize + iconGap;
    }
    ctx.fillStyle = tx;
    ctx.fillText(it.v, x, cy);
    x += ctx.measureText(it.v).width + gap;
  }
}

// Main entry. Returns a PNG data URL of the composed image.
export async function composeBranded({ bgUrl, logoUrl, hook, highlight, kit, contacts, layout = {} }) {
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
      const lw = W * 0.20 * (layout.logoScale ?? 1);
      const lh = lw * ((lg.naturalHeight || 1) / (lg.naturalWidth || 1));
      ctx.drawImage(lg, (W - lw) / 2, H * (layout.logoY ?? 0.04), lw, lh);
    } catch { /* logo optional */ }
  }

  if (hook && hook.trim()) {
    const hl = (highlight || "").split(/[,،]/).map((s) => s.trim()).filter(Boolean);
    drawHook(ctx, W, H, hook.trim(), hl, kit, font, layout);
  }

  if (contacts && contacts.length) {
    const iconImgs = await Promise.all(contacts.map((cc) => loadIcon(cc.p, kit.contactText || "#FFFFFF")));
    drawContactBar(ctx, W, H, contacts, kit, iconImgs);
  }

  return c.toDataURL("image/png");
}
