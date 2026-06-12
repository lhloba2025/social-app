// composeLetterhead.js — builds an official LETTERHEAD STRIP (ترويسة).
// A simple horizontal strip: the logo can sit in the CENTER, on the RIGHT, or
// on the LEFT; the Arabic name/subtitle/CR go on the right, the English on the
// left. Everything (logo size/position/recolor + text size) is adjustable, and
// each text block is clamped to its own zone so it never overlaps the logo.
// Optional: a solid/transparent background, an accent border line, and a
// bottom CONTACT BAR with real platform icons (same simple-icons as the AI
// composer).

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

// Fit a single text row into maxW by shrinking the font if needed.
function fitFont(ctx, text, weight, px, font, maxW) {
  ctx.font = `${weight} ${px}px "${font}", "Tajawal", sans-serif`;
  const w = ctx.measureText(text).width;
  if (w > maxW && w > 0) {
    px = Math.max(8, Math.floor(px * (maxW / w)));
    ctx.font = `${weight} ${px}px "${font}", "Tajawal", sans-serif`;
  }
  return px;
}

export async function composeLetterhead({ width = 1654, height = 280, kit = {}, logoUrl = "", fields = {}, style = {}, layout = {}, contacts = [], ar = true }) {
  const W = width, H = height;
  const nameColor   = style.headerColor || kit.mainColor || "#0F172A";
  const accentColor = style.accentColor || kit.highlightColor || "#8DB600";
  const font = kit.font || "Tajawal";

  const orient = layout.orientation || "center";  // "center" | "right" | "left"
  const logoScale = layout.logoScale ?? 1;
  const logoDy = layout.logoDy ?? 0;               // vertical nudge (fraction of H)
  const textScale = layout.textScale ?? 1;

  try {
    await document.fonts.load(`800 ${Math.round(H * 0.26)}px "${font}"`);
    await document.fonts.ready;
  } catch { /* best-effort */ }

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  // ── Background ────────────────────────────────────────────────────────
  // Solid color by default; transparent when asked (good for overlaying in
  // Word). The chosen bgColor lets the user give the strip a tinted band.
  if (!style.transparent) {
    ctx.fillStyle = style.bgColor || "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
  }

  const marginX = W * 0.03;

  // ── Contact bar (optional) — a bottom band with real platform icons. ──
  const contactList = (contacts || []).filter((c) => c && c.v);
  const bandH = contactList.length ? Math.round(H * 0.22) : 0;
  // The logo + text center within the area ABOVE the contact band.
  const contentH = H - bandH;
  const midY = contentH / 2;

  // ── Logo ─────────────────────────────────────────────────────────────
  let logoBox = { x: W / 2, w: 0 }; // center x of the logo + its half footprint
  if (logoUrl) {
    try {
      const lg = await loadImg(logoUrl);
      let lh = contentH * 0.82 * logoScale;
      let lw = lh * ((lg.naturalWidth || 1) / (lg.naturalHeight || 1));
      const maxLw = W * 0.26;
      if (lw > maxLw) { const s = maxLw / lw; lw *= s; lh *= s; }
      let cxLogo;
      if (orient === "right") cxLogo = W - marginX - lw / 2;
      else if (orient === "left") cxLogo = marginX + lw / 2;
      else cxLogo = W / 2;
      // Free horizontal nudge on top of the preset position (so the logo can be
      // moved smoothly anywhere, not just the 3 presets). The text zones below
      // clamp around logoBox.x, so they adjust automatically.
      cxLogo += W * (layout.logoDx ?? 0);
      const lx = cxLogo - lw / 2;
      const ly = (contentH - lh) / 2 + H * logoDy;
      if (kit.changeLogoColor && kit.logoColor) {
        const off = document.createElement("canvas");
        off.width = Math.max(1, Math.round(lw)); off.height = Math.max(1, Math.round(lh));
        const octx = off.getContext("2d");
        octx.drawImage(lg, 0, 0, off.width, off.height);
        octx.globalCompositeOperation = "source-in";
        octx.fillStyle = kit.logoColor;
        octx.fillRect(0, 0, off.width, off.height);
        ctx.drawImage(off, lx, ly, lw, lh);
      } else {
        ctx.drawImage(lg, lx, ly, lw, lh);
      }
      logoBox = { x: cxLogo, w: lw / 2 + W * 0.025 };
    } catch { /* optional */ }
  }

  const fsName = Math.round(H * 0.26 * textScale);
  const fsSub  = Math.round(H * 0.16 * textScale);
  const fsInfo = Math.round(H * 0.145 * textScale);
  const lineGap = H * 0.06;

  const infoAr = [
    fields.cr  && `س.ت : ${fields.cr}`,
    fields.vat && `الرقم الضريبي : ${fields.vat}`,
    fields.phone && `جوال : ${fields.phone}`,
    fields.website && fields.website,
  ].filter(Boolean).join("   |   ");
  const infoEn = [
    fields.cr  && `C.R. No. : ${fields.cr}`,
    fields.vat && `VAT : ${fields.vat}`,
    fields.phone && `Tel : ${fields.phone}`,
    fields.website && fields.website,
  ].filter(Boolean).join("   |   ");

  // Draw a stacked, vertically-centered block clamped to [maxW].
  function drawBlock({ name, sub, info, align, xEdge, maxW }) {
    const rows = [];
    if (name) rows.push({ t: name, fs: fsName, color: nameColor, weight: 800, gap: lineGap, clamp: true });
    if (sub)  rows.push({ t: sub,  fs: fsSub,  color: accentColor, weight: 700, underline: true, gap: lineGap, clamp: true });

    // INFO line — instead of shrinking one long line until it's microscopic,
    // keep it at a readable size and WRAP it onto as many lines as it needs.
    // The separator between items is "   |   ".
    if (info) {
      const sep = "   |   ";
      const segs = String(info).split(sep).filter(Boolean);
      let ipx = Math.round(H * 0.15 * textScale);          // readable base
      const floor = Math.round(H * 0.125 * textScale);     // never smaller than this
      ctx.font = `600 ${ipx}px "${font}", "Tajawal", sans-serif`;
      const widest = Math.max(1, ...segs.map((s) => ctx.measureText(s).width));
      if (widest > maxW) ipx = Math.max(floor, Math.floor(ipx * (maxW / widest)));
      ctx.font = `600 ${ipx}px "${font}", "Tajawal", sans-serif`;
      // Greedily pack items into lines that fit maxW.
      const infoLines = [];
      let cur = "";
      for (const s of segs) {
        const test = cur ? cur + sep + s : s;
        if (!cur || ctx.measureText(test).width <= maxW) cur = test;
        else { infoLines.push(cur); cur = s; }
      }
      if (cur) infoLines.push(cur);
      infoLines.forEach((t) => rows.push({ t, fs: ipx, color: nameColor, weight: 600, gap: lineGap * 0.45 }));
    }
    if (!rows.length) return;

    // Clamp name/sub to the available width (info is already wrapped to fit).
    for (const r of rows) if (r.clamp) r.fs = fitFont(ctx, r.t, r.weight, r.fs, font, maxW);
    const totalH = rows.reduce((a, r) => a + r.fs, 0) + rows.slice(0, -1).reduce((a, r) => a + r.gap, 0);
    let y = midY - totalH / 2;
    ctx.textAlign = align;
    ctx.direction = align === "right" ? "rtl" : "ltr";
    ctx.textBaseline = "top";
    for (const r of rows) {
      ctx.font = `${r.weight} ${r.fs}px "${font}", "Tajawal", sans-serif`;
      ctx.fillStyle = r.color;
      ctx.fillText(r.t, xEdge, y);
      if (r.underline) {
        const w = Math.min(ctx.measureText(r.t).width, maxW);
        const uy = y + r.fs + lineGap * 0.3;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = Math.max(2, H * 0.012);
        ctx.beginPath();
        if (align === "right") { ctx.moveTo(xEdge, uy); ctx.lineTo(xEdge - w, uy); }
        else { ctx.moveTo(xEdge, uy); ctx.lineTo(xEdge + w, uy); }
        ctx.stroke();
      }
      y += r.fs + r.gap;
    }
  }

  if (orient === "center") {
    const gap = W * 0.015;
    const rightMaxW = (W - marginX) - (logoBox.x + logoBox.w + gap);
    const leftMaxW  = (logoBox.x - logoBox.w - gap) - marginX;
    drawBlock({ name: fields.nameAr, sub: fields.subAr, info: infoAr, align: "right", xEdge: W - marginX, maxW: Math.max(40, rightMaxW) });
    drawBlock({ name: fields.nameEn, sub: fields.subEn, info: infoEn, align: "left",  xEdge: marginX,     maxW: Math.max(40, leftMaxW) });
  } else if (orient === "right") {
    // Logo on the right; text fills the left, right-aligned (Arabic-first).
    const textRightEdge = logoBox.x - logoBox.w - W * 0.02;
    const maxW = textRightEdge - marginX;
    // Merge AR + EN into one right-aligned block.
    drawBlock({
      name: fields.nameAr || fields.nameEn,
      sub: fields.subAr || fields.subEn,
      info: infoAr || infoEn,
      align: "right", xEdge: textRightEdge, maxW: Math.max(40, maxW),
    });
  } else { // left
    const textLeftEdge = logoBox.x + logoBox.w + W * 0.02;
    const maxW = (W - marginX) - textLeftEdge;
    drawBlock({
      name: fields.nameEn || fields.nameAr,
      sub: fields.subEn || fields.subAr,
      info: infoEn || infoAr,
      align: "left", xEdge: textLeftEdge, maxW: Math.max(40, maxW),
    });
  }

  // ── Contact bar band (bottom) ─────────────────────────────────────────
  if (bandH) {
    const bandY = H - bandH;
    const barBg = style.contactBg || nameColor;
    const barTx = style.contactText || "#FFFFFF";
    ctx.fillStyle = barBg;
    ctx.fillRect(0, bandY, W, bandH);

    const fs = Math.round(bandH * 0.42);
    const iconSize = Math.round(fs * 1.2);
    const iconGap = W * 0.005;
    const gap = W * 0.022;
    ctx.font = `600 ${fs}px "${font}", "Tajawal", sans-serif`;
    ctx.textBaseline = "middle";
    ctx.direction = "ltr";
    ctx.textAlign = "left";

    const iconImgs = await Promise.all(contactList.map((c) => loadIcon(c.p, barTx)));
    const items = contactList.map((c, i) => ({ img: iconImgs[i], v: c.v }));
    let totalW = items.reduce((a, it) => a + (it.img ? iconSize + iconGap : 0) + ctx.measureText(it.v).width, 0) + gap * (items.length - 1);
    // Shrink to fit width if the contact line is too long.
    if (totalW > W * 0.96) {
      const s = (W * 0.96) / totalW;
      const fs2 = Math.max(8, Math.round(fs * s));
      ctx.font = `600 ${fs2}px "${font}", "Tajawal", sans-serif`;
      totalW = items.reduce((a, it) => a + (it.img ? iconSize + iconGap : 0) + ctx.measureText(it.v).width, 0) + gap * (items.length - 1);
    }
    let x = (W - totalW) / 2;
    const cy = bandY + bandH / 2;
    for (const it of items) {
      if (it.img) { ctx.drawImage(it.img, x, cy - iconSize / 2, iconSize, iconSize); x += iconSize + iconGap; }
      ctx.fillStyle = barTx;
      ctx.fillText(it.v, x, cy);
      x += ctx.measureText(it.v).width + gap;
    }
  }

  // ── Accent border (optional) — thin line top (and bottom if no band). ──
  if (style.accentBorder) {
    ctx.fillStyle = accentColor;
    const t = Math.max(3, Math.round(H * 0.03));
    ctx.fillRect(0, 0, W, t);
    if (!bandH) ctx.fillRect(0, H - t, W, t);
  }

  return c.toDataURL("image/png");
}
