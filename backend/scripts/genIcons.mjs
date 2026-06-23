// يولّد أيقونات PWA لهوفيرا (PNG نقي بدون مكتبات خارجية):
// خلفية متدرّجة نيلي→بنفسجي + حرف H أبيض. يكتبها في public/.
// التشغيل: node backend/scripts/genIcons.mjs
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', '..', 'public');

// ── CRC32 ────────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

function makePng(S) {
  // ألوان التدرّج: نيلي (#6366f1) → بنفسجي (#7c3aed)
  const c1 = [99, 102, 241], c2 = [124, 58, 237];
  // أبعاد حرف H (نسبية)
  const stroke = Math.round(S * 0.11);
  const halfW = Math.round(S * 0.20);
  const halfH = Math.round(S * 0.23);
  const cx = S / 2, cy = S / 2;
  const inH = (x, y) => {
    const vert = y >= cy - halfH && y <= cy + halfH;
    const leftBar = x >= cx - halfW && x < cx - halfW + stroke;
    const rightBar = x > cx + halfW - stroke && x <= cx + halfW;
    if (vert && (leftBar || rightBar)) return true;
    const midV = y >= cy - stroke / 2 && y <= cy + stroke / 2;
    const midH = x >= cx - halfW && x <= cx + halfW;
    return midV && midH;
  };

  const raw = Buffer.alloc((S * 3 + 1) * S);
  let p = 0;
  for (let y = 0; y < S; y++) {
    raw[p++] = 0; // filter byte
    for (let x = 0; x < S; x++) {
      const t = (x + (S - y)) / (2 * S); // قطري
      let r, g, b;
      if (inH(x, y)) { r = g = b = 255; }
      else { r = lerp(c1[0], c2[0], t); g = lerp(c1[1], c2[1], t); b = lerp(c1[2], c2[2], t); }
      raw[p++] = r; raw[p++] = g; raw[p++] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 2; // bitDepth 8, colorType 2 (RGB)
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

for (const S of [180, 192, 512]) {
  const file = path.join(OUT, `hovera-icon-${S}.png`);
  fs.writeFileSync(file, makePng(S));
  console.log(`✅ ${file} (${S}x${S})`);
}
// نسخة باسم اللوقو المستخدم في الواجهة كي يظهر الشعار تلقائياً
fs.writeFileSync(path.join(OUT, 'hovera-logo.png'), makePng(192));
console.log('✅ hovera-logo.png');
console.log('🎉 تم توليد الأيقونات.');
