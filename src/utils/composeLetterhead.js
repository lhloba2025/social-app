// composeLetterhead.js — builds an official LETTERHEAD STRIP (ترويسة).
// A simple horizontal strip: the logo can sit in the CENTER, on the RIGHT, or
// on the LEFT; the Arabic name/subtitle/CR go on the right, the English on the
// left. Everything (logo size/position/recolor + text size) is adjustable, and
// each text block is clamped to its own zone so it never overlaps the logo.

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

export async function composeLetterhead({ width = 1654, height = 280, kit = {}, logoUrl = "", fields = {}, style = {}, layout = {}, ar = true }) {
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
  if (!style.transparent) { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H); }

  const marginX = W * 0.03;
  const midY = H / 2;

  // ── Logo ─────────────────────────────────────────────────────────────
  let logoBox = { x: W / 2, w: 0 }; // center x of the logo + its half footprint
  if (logoUrl) {
    try {
      const lg = await loadImg(logoUrl);
      let lh = H * 0.82 * logoScale;
      let lw = lh * ((lg.naturalWidth || 1) / (lg.naturalHeight || 1));
      const maxLw = W * 0.26;
      if (lw > maxLw) { const s = maxLw / lw; lw *= s; lh *= s; }
      let cxLogo;
      if (orient === "right") cxLogo = W - marginX - lw / 2;
      else if (orient === "left") cxLogo = marginX + lw / 2;
      else cxLogo = W / 2;
      const lx = cxLogo - lw / 2;
      const ly = (H - lh) / 2 + H * logoDy;
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
    if (name) rows.push({ t: name, fs: fsName, color: nameColor, weight: 800 });
    if (sub)  rows.push({ t: sub,  fs: fsSub,  color: accentColor, weight: 700, underline: true });
    if (info) rows.push({ t: info, fs: fsInfo, color: nameColor, weight: 600 });
    if (!rows.length) return;
    // Clamp each row to the available width.
    for (const r of rows) r.fs = fitFont(ctx, r.t, r.weight, r.fs, font, maxW);
    const totalH = rows.reduce((a, r) => a + r.fs, 0) + lineGap * (rows.length - 1);
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
      y += r.fs + lineGap;
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

  return c.toDataURL("image/png");
}
