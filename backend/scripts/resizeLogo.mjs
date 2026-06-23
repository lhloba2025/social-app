// يحوّل لوقو هوفيرا (صورة المصدر) إلى أيقونات PWA بكل المقاسات.
// المصدر الافتراضي: public/hovera-logo-src.(png|jpg) أو وسيط أول.
// التشغيل: npm i jimp@0.22 --no-save ثم node backend/scripts/resizeLogo.mjs [مسار_الصورة]
import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(__dirname, '..', '..', 'public');

// إيجاد ملف المصدر
const candidates = [
  process.argv[2],
  path.join(PUB, 'hovera-logo-src.png'),
  path.join(PUB, 'hovera-logo-src.jpg'),
  path.join(PUB, 'hovera-logo.png'),
  path.join(PUB, 'hovera-logo.jpg'),
].filter(Boolean);
const SRC = candidates.find((p) => fs.existsSync(p));
if (!SRC) { console.error('❌ لم أجد ملف اللوقو. ضعه في public/hovera-logo.png'); process.exit(1); }
console.log('المصدر:', SRC);

const BG = 0xffffffff; // خلفية بيضاء عشان اللوقو يبان نظيفاً كأيقونة (iOS لا يدعم الشفافية)
const img = await Jimp.read(SRC);
// نلائمه داخل مربّع أبيض بدون اقتصاص (contain) مع هامش بسيط.
for (const S of [180, 192, 512]) {
  const canvas = new Jimp({ width: S, height: S, color: BG });
  const pad = Math.round(S * 0.12);
  const fitted = img.clone().contain({ w: S - pad * 2, h: S - pad * 2 });
  canvas.composite(fitted, Math.round((S - fitted.bitmap.width) / 2), Math.round((S - fitted.bitmap.height) / 2));
  await canvas.write(path.join(PUB, `hovera-icon-${S}.png`));
  console.log(`✅ hovera-icon-${S}.png`);
}
// شعار الترويسة (مربّع 256، خلفية بيضاء — يظهر كبلاطة أنيقة على الترويسة الداكنة)
const headerCanvas = new Jimp({ width: 256, height: 256, color: BG });
const hf = img.clone().contain({ w: 210, h: 210 });
headerCanvas.composite(hf, Math.round((256 - hf.bitmap.width) / 2), Math.round((256 - hf.bitmap.height) / 2));
await headerCanvas.write(path.join(PUB, 'hovera-logo.png'));
console.log('✅ hovera-logo.png');
console.log('🎉 تم. اعمل build + نشر.');
