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

// Normalize an Arabic word for matching: drop tashkeel (diacritics), tatweel,
// and surrounding punctuation. This is why a highlight like "صالونك" now matches
// "صالونكِ،" in the hook (previously it didn't, so the color wasn't applied).
function normAr(s) {
  return String(s || "").replace(/[^\p{L}\p{N}]/gu, "")  /* keep letters+digits only */
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[؟?.!،,؛:"'()«»‏‎]/g, "")
    .trim();
}

function drawHook(ctx, W, H, hook, highlights, kit, font, layout = {}) {
  const main = kit.mainColor || "#09007C";
  const hi = kit.highlightColor || "#EF43DC";
  // Word highlights (letters/digits — punctuation-insensitive) AND symbol
  // highlights (e.g. "|", "•") which normAr would empty out, so we match those
  // literally. This keeps "صالونك" matching "صالونك!!" while still letting a
  // separator like "|" be highlighted.
  const hlNorm = (highlights || []).map(normAr).filter(Boolean);
  const hlSym = (highlights || []).map((s) => String(s || "").trim()).filter((s) => s && !normAr(s));
  const isHi = (w) => {
    const nw = normAr(w);
    if (nw && hlNorm.some((h) => nw === h || nw.includes(h))) return true;
    const raw = String(w);
    return hlSym.some((sym) => raw.includes(sym));
  };
  const scale = layout.hookScale ?? 1;
  const maxWidth = W * 0.86;
  // Honor EXPLICIT line breaks (Enter), then word-wrap each segment.
  const segments = hook.split(/\r?\n/);
  const allWords = segments.flatMap((s) => s.split(/\s+/).filter(Boolean));
  ctx.textBaseline = "middle";
  const setFont = (s) => { ctx.font = `800 ${s}px "${font}", "Tajawal", sans-serif`; };
  // Each wrapped line remembers which ORIGINAL segment (Enter-separated line) it
  // came from, so per-line alignment can target the line the user is editing.
  const wrap = () => segments.flatMap((seg, si) => {
    const ws = seg.split(/\s+/).filter(Boolean);
    const wl = ws.length ? wrapWords(ctx, ws, maxWidth) : [[]];
    return wl.map((lineWords) => ({ lineWords, seg: si }));
  });
  // 1) Pick a comfortable BASE size (default look) that fits within ~3 lines.
  let base = Math.round(W * 0.075);
  setFont(base);
  let lines = wrap();
  while (lines.length > 3 && base > 22) { base = Math.round(base * 0.92); setFont(base); lines = wrap(); }
  // 2) Apply the user's scale ON TOP of that base — enlarging truly enlarges the
  //    glyphs (it is NOT re-capped by line count, which used to neutralise it).
  let size = Math.max(12, Math.round(base * scale));
  setFont(size);
  lines = wrap();
  // 3) Only shrink to stop a SINGLE word from spilling past the width.
  while (size > 14 && allWords.some((w) => ctx.measureText(w).width > maxWidth)) {
    size = Math.round(size * 0.94); setFont(size); lines = wrap();
  }
  // Measure the inter-word space at the FINAL size (so spacing matches glyphs).
  const space = ctx.measureText(" ").width;
  const lineH = size * 1.35;
  // place block starting below the logo area (adjustable)
  const startY = H * (layout.hookY ?? 0.26);

  // Alignment (like Word): a global default (center) plus an optional PER-LINE
  // override (layout.hookAligns[segmentIndex]) so the user can center one line
  // and right-align the rest, etc.
  const align = layout.hookAlign || "center";
  const perLine = Array.isArray(layout.hookAligns) ? layout.hookAligns : [];
  const margin = W * 0.07;
  const cx = W * (layout.hookX ?? 0.5);
  // Pre-compute each line's geometry so we can (1) draw an optional background
  // panel behind the whole block and (2) place each line per its alignment.
  const meta = lines.map(({ lineWords, seg }) => {
    const a = perLine[seg] || align;
    const widths = lineWords.map((w) => ctx.measureText(w).width);
    const lineW = widths.reduce((a, b) => a + b, 0) + space * Math.max(0, lineWords.length - 1);
    let rightX;                                   // x of the line's RIGHT edge
    if (a === "left") rightX = margin + lineW;
    else if (a === "right") rightX = W - margin;
    else rightX = cx + lineW / 2;                 // center (original behavior)
    return { lineWords, widths, lineW, rightX };
  });

  // Optional text background panel (a soft rounded plate behind the hook).
  if (layout.hookBg && meta.some((m) => m.lineW > 0)) {
    let minX = Infinity, maxX = -Infinity;
    for (const m of meta) { if (m.lineW > 0) { minX = Math.min(minX, m.rightX - m.lineW); maxX = Math.max(maxX, m.rightX); } }
    const half = size * 0.62;
    const top = startY - half;
    const bottom = startY + (lines.length - 1) * lineH + half;
    const padX = size * 0.5, padY = size * 0.3;
    const bx = minX - padX, by = top - padY;
    const bw = (maxX - minX) + padX * 2, bh = (bottom - top) + padY * 2;
    ctx.save();
    ctx.globalAlpha = layout.hookBgAlpha ?? 0.72;
    ctx.fillStyle = layout.hookBgColor || "#FFFFFF";
    roundRect(ctx, bx, by, bw, bh, Math.min(bh * 0.3, size * 0.55));
    ctx.fill();
    ctx.restore();
  }

  ctx.textAlign = "right";
  ctx.direction = "rtl";
  meta.forEach((m, li) => {
    const y = startY + li * lineH;
    let x = m.rightX;
    m.lineWords.forEach((w, i) => {
      ctx.fillStyle = isHi(w) ? hi : main;
      ctx.fillText(w, x, y);
      x -= m.widths[i] + space;
    });
  });
}

function drawContactBar(ctx, W, H, contacts, kit, iconImgs, layout = {}) {
  const cScale = layout.contactScale ?? 1;       // resize the whole bar
  const cShift = layout.contactY ?? 0;           // move UP from the bottom (fraction of H)
  const bg = kit.contactBg || "#0F172A";
  const tx = kit.contactText || "#FFFFFF";
  const pill = kit.contactShape === "pill";
  const vertical = kit.contactLayout === "vertical";
  const fs = Math.round(W * (vertical ? 0.03 : 0.026) * cScale);
  const iconSize = Math.round(fs * 1.25);
  const iconGap = W * 0.006;
  ctx.font = `600 ${fs}px "Tajawal", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  const items = contacts.map((c, i) => {
    const tw = ctx.measureText(c.v).width;
    const hasIcon = !!iconImgs[i];
    return { img: iconImgs[i], v: c.v, w: (hasIcon ? iconSize + iconGap : 0) + tw };
  });

  if (vertical) {
    const lineH = Math.max(iconSize, fs) * 1.7;
    const maxW = Math.max(...items.map((it) => it.w));
    const padX = W * 0.035, padY = lineH * 0.35;
    const panelW = Math.min(W * 0.7, maxW + padX * 2);
    const panelH = items.length * lineH + padY * 2;
    const px = (W - panelW) / 2;
    const py = H - panelH - H * 0.02 - H * cShift;
    ctx.save(); ctx.globalAlpha = 0.82; ctx.fillStyle = bg;
    roundRect(ctx, px, py, panelW, panelH, Math.min(panelW, panelH) * 0.1); ctx.fill(); ctx.restore();
    let y = py + padY + lineH / 2;
    for (const it of items) {
      let x = px + (panelW - it.w) / 2;
      if (it.img) { ctx.drawImage(it.img, x, y - iconSize / 2, iconSize, iconSize); x += iconSize + iconGap; }
      ctx.fillStyle = tx; ctx.fillText(it.v, x, y);
      y += lineH;
    }
    return;
  }

  // horizontal
  const gap = W * 0.028;
  const totalW = items.reduce((a, b) => a + b.w, 0) + gap * (items.length - 1);
  const barH = Math.round(H * 0.075 * cScale);
  const y = H - barH - H * cShift;
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

// Draws an iOS-style NOTIFICATION CARD: a rounded white plate with a soft
// shadow, a small app-icon (the logo) top-right, a bold title beside it, and
// gray body text below — all RTL, right-aligned. Position/size from layout.
function drawCard(ctx, W, H, { title, body, logoImg }, layout = {}, font = "Tajawal") {
  const t = String(title || "").trim();
  const b = String(body || "").trim();
  if (!t && !b) return;

  const cw = W * (layout.cardScale ?? 0.62);
  const pad = cw * 0.06;
  const radius = cw * 0.07;
  const badgeD = cw * 0.135;
  const titleFs = Math.round(cw * 0.072);
  const bodyFs = Math.round(cw * 0.058);
  const innerW = cw - pad * 2;
  const gap = cw * 0.035;

  // Wrap body to up to 3 lines within the inner width.
  ctx.font = `500 ${bodyFs}px "${font}", "Tajawal", sans-serif`;
  ctx.direction = "rtl"; ctx.textAlign = "right";
  const bodyLines = b ? wrapWords(ctx, b.split(/\s+/).filter(Boolean), innerW).slice(0, 3) : [];
  const bodyLineH = bodyFs * 1.42;
  const topH = Math.max(badgeD, titleFs);
  const bodyH = bodyLines.length * bodyLineH;
  const ch = pad + topH + (bodyLines.length ? gap + bodyH : 0) + pad;

  const cardX = W * (layout.cardX ?? 0.5) - cw / 2;
  const cardY = H * (layout.cardY ?? 0.6) - ch / 2;

  // Card plate + shadow.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = cw * 0.05;
  ctx.shadowOffsetY = cw * 0.018;
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  roundRect(ctx, cardX, cardY, cw, ch, radius);
  ctx.fill();
  ctx.restore();

  // App-icon badge (logo) at the TOP-RIGHT (RTL leading edge).
  const badgeX = cardX + cw - pad - badgeD;
  const badgeY = cardY + pad;
  if (logoImg) {
    ctx.save();
    roundRect(ctx, badgeX, badgeY, badgeD, badgeD, badgeD * 0.28);
    ctx.clip();
    const lim = badgeD * 0.84;
    let lw = lim, lh = lim * ((logoImg.naturalHeight || 1) / (logoImg.naturalWidth || 1));
    if (lh > lim) { const s = lim / lh; lw *= s; lh *= s; }
    ctx.drawImage(logoImg, badgeX + (badgeD - lw) / 2, badgeY + (badgeD - lh) / 2, lw, lh);
    ctx.restore();
  }

  // Title — to the LEFT of the badge, right-aligned, vertically centered on badge.
  ctx.textBaseline = "middle";
  ctx.direction = "rtl"; ctx.textAlign = "right";
  const titleRight = (logoImg ? badgeX - cw * 0.025 : cardX + cw - pad);
  const titleY = badgeY + topH / 2;
  ctx.fillStyle = "#16213e";
  ctx.font = `800 ${titleFs}px "${font}", "Tajawal", sans-serif`;
  if (t) ctx.fillText(t, titleRight, titleY);

  // Body — gray, right-aligned, below.
  ctx.textBaseline = "top";
  ctx.fillStyle = "#6b7280";
  ctx.font = `500 ${bodyFs}px "${font}", "Tajawal", sans-serif`;
  let yy = cardY + pad + topH + gap;
  for (const ln of bodyLines) { ctx.fillText(ln.join(" "), cardX + cw - pad, yy); yy += bodyLineH; }
}

// Main entry. Returns a PNG data URL of the composed image.
// When targetW/targetH are given (the REAL platform pixel size), the canvas is
// forced to that exact size and the AI background is drawn "cover" (scaled to
// fill, center-cropped). This guarantees the output truly matches the platform
// aspect/size so publishing never crops the logo or text.
export async function composeBranded({ bgUrl, logoUrl, hook, highlight, kit, contacts, layout = {}, targetW, targetH }) {
  const bg = await loadImg(bgUrl);
  const bw = bg.naturalWidth || bg.width, bh = bg.naturalHeight || bg.height;
  const W = targetW || bw, H = targetH || bh;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high"; // best resampling when scaling the logo up
  // Cover-fit: scale the background to fully cover the exact target, centered.
  // A subtle contrast/saturation boost (ONLY on the photo) so AI scenes don't
  // look washed-out/faded. Text + logo are drawn AFTER with the filter off, so
  // they keep their exact colors.
  const scale = Math.max(W / bw, H / bh);
  const dw = bw * scale, dh = bh * scale;
  try { ctx.filter = "contrast(1.06) saturate(1.12)"; } catch { /* unsupported */ }
  ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
  try { ctx.filter = "none"; } catch { /* unsupported */ }

  const font = kit.font || "Tajawal";
  // Pass the actual Arabic text as the sample so Google Fonts downloads the
  // ARABIC subset of the chosen family (not just Latin). Without this the
  // selected font silently fell back to Tajawal — i.e. "the font never changed".
  const sample = `${hook || ""} ${(contacts || []).map((c) => c.v).join(" ")} أبجد هوز يكلمن`;
  try {
    await document.fonts.load(`800 ${Math.round(W * 0.075)}px "${font}"`, sample);
    await document.fonts.load(`600 ${Math.round(W * 0.026)}px "Tajawal"`, sample);
    await document.fonts.ready;
  } catch { /* fonts best-effort */ }

  if (logoUrl) {
    try {
      const lg = await loadImg(logoUrl);
      const lw = W * 0.26 * (layout.logoScale ?? 1); // bigger default logo (was 0.20)
      const lh = lw * ((lg.naturalHeight || 1) / (lg.naturalWidth || 1));
      const lx = W * (layout.logoX ?? 0.5) - lw / 2;
      const ly = H * (layout.logoY ?? 0.04);
      if (kit.changeLogoColor && kit.logoColor) {
        // Tint the logo at its NATIVE resolution, then resample ONCE to the
        // display size (high quality) — avoids the double-resample blur.
        const off = document.createElement("canvas");
        off.width = Math.max(1, lg.naturalWidth || Math.round(lw));
        off.height = Math.max(1, lg.naturalHeight || Math.round(lh));
        const octx = off.getContext("2d");
        octx.drawImage(lg, 0, 0);
        octx.globalCompositeOperation = "source-in";
        octx.fillStyle = kit.logoColor;
        octx.fillRect(0, 0, off.width, off.height);
        ctx.drawImage(off, lx, ly, lw, lh);
      } else {
        ctx.drawImage(lg, lx, ly, lw, lh);
      }
    } catch { /* logo optional */ }
  }

  if (hook && hook.trim()) {
    const hl = (highlight || "").split(/[,،]/).map((s) => s.trim()).filter(Boolean);
    drawHook(ctx, W, H, hook.trim(), hl, kit, font, layout);
  }

  if (contacts && contacts.length) {
    const iconImgs = await Promise.all(contacts.map((cc) => loadIcon(cc.p, kit.contactText || "#FFFFFF")));
    drawContactBar(ctx, W, H, contacts, kit, iconImgs, layout);
  }

  // Optional notification CARD (logo + title + body) drawn on top.
  if (layout.cardOn && (layout.cardTitle || layout.cardBody)) {
    let cardLogo = null;
    if (logoUrl) { try { cardLogo = await loadImg(logoUrl); } catch { /* no badge */ } }
    drawCard(ctx, W, H, { title: layout.cardTitle, body: layout.cardBody, logoImg: cardLogo }, layout, font);
  }

  return c.toDataURL("image/png");
}
