// composeLetterhead.js — builds an official A4 LETTERHEAD (ترويسة) header.
// Header-only: the brand sits in the TOP band of the page; the rest stays white
// so it can be placed at the top of a Word document / official paper. Every
// field is optional — only the ones the user fills get drawn.

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function drawCenteredLine(ctx, text, cx, y, color) {
  if (!text) return;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.fillText(text, cx, y);
}

// Compose the letterhead. Returns a PNG data URL (white A4 page + top header).
//  fields: { companyName, tagline, cr, vat, phone, email, website, address }
//  style:  { band: "band"|"line", headerColor, textColor }
export async function composeLetterhead({ width = 1654, height = 2339, kit = {}, logoUrl = "", fields = {}, style = {}, ar = true }) {
  const W = width, H = height;

  const headerColor = style.headerColor || kit.mainColor || "#09007C";
  const textColor   = style.textColor   || kit.mainColor || "#0F172A";
  const font = kit.font || "Tajawal";
  const banded = style.band !== "line"; // default: a soft tinted band

  try {
    await document.fonts.load(`800 ${Math.round(W * 0.04)}px "${font}"`);
    await document.fonts.load(`600 ${Math.round(W * 0.017)}px "Tajawal"`);
    await document.fonts.ready;
  } catch { /* best-effort */ }

  // Content layer (transparent) — drawn on top of the page + optional band.
  const cc = document.createElement("canvas");
  cc.width = W; cc.height = H;
  const ctx = cc.getContext("2d");
  ctx.textBaseline = "alphabetic";

  const marginX = W * 0.08;
  const cx = W / 2;
  let y = H * 0.045;

  // Logo (centered, top)
  if (logoUrl) {
    try {
      const lg = await loadImg(logoUrl);
      let lw = W * 0.17;
      let lh = lw * ((lg.naturalHeight || 1) / (lg.naturalWidth || 1));
      const maxLh = H * 0.08;
      if (lh > maxLh) { const s = maxLh / lh; lw *= s; lh *= s; }
      if (kit.changeLogoColor && kit.logoColor) {
        const off = document.createElement("canvas");
        off.width = Math.max(1, Math.round(lw)); off.height = Math.max(1, Math.round(lh));
        const octx = off.getContext("2d");
        octx.drawImage(lg, 0, 0, off.width, off.height);
        octx.globalCompositeOperation = "source-in";
        octx.fillStyle = kit.logoColor;
        octx.fillRect(0, 0, off.width, off.height);
        ctx.drawImage(off, cx - lw / 2, y, lw, lh);
      } else {
        ctx.drawImage(lg, cx - lw / 2, y, lw, lh);
      }
      y += lh + H * 0.02;
    } catch { /* optional */ }
  }

  // Company name
  if (fields.companyName) {
    const fs = Math.round(W * 0.04);
    ctx.font = `800 ${fs}px "${font}", "Tajawal", sans-serif`;
    y += fs;
    drawCenteredLine(ctx, fields.companyName, cx, y, headerColor);
  }

  // Tagline
  if (fields.tagline) {
    const fs = Math.round(W * 0.019);
    ctx.font = `500 ${fs}px "${font}", "Tajawal", sans-serif`;
    y += fs * 1.9;
    drawCenteredLine(ctx, fields.tagline, cx, y, "#64748B");
  }

  // Accent divider (double rule)
  y += H * 0.022;
  ctx.strokeStyle = headerColor;
  ctx.lineWidth = Math.max(2, W * 0.0022);
  ctx.beginPath(); ctx.moveTo(marginX, y); ctx.lineTo(W - marginX, y); ctx.stroke();
  y += H * 0.006;
  ctx.strokeStyle = headerColor + "55";
  ctx.lineWidth = Math.max(1, W * 0.0009);
  ctx.beginPath(); ctx.moveTo(marginX, y); ctx.lineTo(W - marginX, y); ctx.stroke();

  // Contact / registration lines (centered)
  const fsC = Math.round(W * 0.017);
  ctx.font = `600 ${fsC}px "${font}", "Tajawal", sans-serif`;
  const sep = "   •   ";
  const row1 = [
    fields.phone   && `${ar ? "هاتف" : "Tel"}: ${fields.phone}`,
    fields.email   && `${ar ? "البريد" : "Email"}: ${fields.email}`,
    fields.website && `${ar ? "الموقع" : "Web"}: ${fields.website}`,
  ].filter(Boolean).join(sep);
  const row2 = fields.address ? `${ar ? "العنوان" : "Address"}: ${fields.address}` : "";
  const row3 = [
    fields.cr  && `${ar ? "س.ت" : "CR"}: ${fields.cr}`,
    fields.vat && `${ar ? "الرقم الضريبي" : "VAT"}: ${fields.vat}`,
  ].filter(Boolean).join(sep);

  let yC = y + fsC * 2.1;
  for (const row of [row1, row2, row3]) {
    if (!row) continue;
    drawCenteredLine(ctx, row, cx, yC, textColor);
    yC += fsC * 1.8;
  }
  const bandH = Math.min(H * 0.4, yC + fsC * 0.6);

  // Final page: white → optional tint band → content overlay.
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const fx = c.getContext("2d");
  fx.fillStyle = "#FFFFFF";
  fx.fillRect(0, 0, W, H);
  if (banded) {
    fx.fillStyle = headerColor + "12"; // ~7% tint
    fx.fillRect(0, 0, W, bandH);
  }
  fx.drawImage(cc, 0, 0);
  return c.toDataURL("image/png");
}
