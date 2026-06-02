// composeLetterhead.js — builds an official LETTERHEAD STRIP (ترويسة).
// A simple horizontal strip (like a printed letterhead band): the logo sits in
// the CENTER, the Arabic name/subtitle/CR on the RIGHT, and the English
// name/subtitle/CR on the LEFT. Every field is optional.

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

// Compose the strip. Returns a PNG data URL.
//  fields: { nameAr, subAr, nameEn, subEn, cr, vat, phone, email, website }
//  style:  { headerColor, accentColor, transparent }
export async function composeLetterhead({ width = 1654, height = 280, kit = {}, logoUrl = "", fields = {}, style = {}, ar = true }) {
  const W = width, H = height;

  const nameColor   = style.headerColor || kit.mainColor || "#0F172A";
  const accentColor = style.accentColor || kit.highlightColor || "#8DB600";
  const font = kit.font || "Tajawal";

  try {
    await document.fonts.load(`800 ${Math.round(H * 0.26)}px "${font}"`);
    await document.fonts.load(`700 ${Math.round(H * 0.16)}px "${font}"`);
    await document.fonts.ready;
  } catch { /* best-effort */ }

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!style.transparent) { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H); }

  const marginX = W * 0.03;
  const midY = H / 2;

  // ── Center logo ──────────────────────────────────────────────────────
  let logoHalf = W * 0.09; // half-width reserved for the logo zone
  if (logoUrl) {
    try {
      const lg = await loadImg(logoUrl);
      let lh = H * 0.82;
      let lw = lh * ((lg.naturalWidth || 1) / (lg.naturalHeight || 1));
      const maxLw = W * 0.2;
      if (lw > maxLw) { const s = maxLw / lw; lw *= s; lh *= s; }
      const lx = (W - lw) / 2, ly = (H - lh) / 2;
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
      logoHalf = lw / 2 + W * 0.02;
    } catch { /* optional */ }
  }

  const fsName = Math.round(H * 0.26);
  const fsSub  = Math.round(H * 0.16);
  const fsInfo = Math.round(H * 0.145);
  const lineGap = H * 0.06;

  // Build the small info line for each side from the available fields.
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

  // Draw a stacked block (name → subtitle → accent underline → info line),
  // vertically centered, aligned to `align` ("right" | "left") at edge `xEdge`.
  function drawBlock({ name, sub, info, align, xEdge }) {
    const rows = [];
    if (name) rows.push({ t: name, fs: fsName, color: nameColor, weight: 800 });
    if (sub)  rows.push({ t: sub,  fs: fsSub,  color: accentColor, weight: 700 });
    if (info) rows.push({ t: info, fs: fsInfo, color: nameColor, weight: 600, info: true });
    if (!rows.length) return;
    const totalH = rows.reduce((a, r) => a + r.fs, 0) + lineGap * (rows.length - 1);
    let y = midY - totalH / 2;
    ctx.textAlign = align;
    ctx.direction = align === "right" ? "rtl" : "ltr";
    ctx.textBaseline = "top";
    for (const r of rows) {
      ctx.font = `${r.weight} ${r.fs}px "${font}", "Tajawal", sans-serif`;
      ctx.fillStyle = r.color;
      ctx.fillText(r.t, xEdge, y);
      // accent underline beneath the subtitle row
      if (r === rows[1] && rows.length > 1) {
        const w = Math.min(ctx.measureText(r.t).width, W * 0.28);
        const uy = y + r.fs + lineGap * 0.35;
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

  // Right = Arabic, Left = English.
  drawBlock({ name: fields.nameAr, sub: fields.subAr, info: infoAr, align: "right", xEdge: W - marginX });
  drawBlock({ name: fields.nameEn, sub: fields.subEn, info: infoEn, align: "left",  xEdge: marginX });

  return c.toDataURL("image/png");
}
