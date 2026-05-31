# دليل رفع المشروع على Railway

هذا الملف يشرح سبب فشل البناء على Railway، التعديلات اللي تمّت لإصلاحه، والخطوات اللي تسوّيها أنت من جهازك عشان يصير الموقع شغّال.

---

## 1. ليش كان البناء يفشل؟

البناء كان يطيح في خطوة `Build image` خلال ~15 ثانية برسالة `Failed to build an image`. السبب الحقيقي:

ملف `package-lock.json` تولّد على ويندوز، فكان يحتوي فقط على نسخة rollup الخاصة بويندوز (`@rollup/rollup-win32-x64-msvc`) وما فيه نسخة لينكس. ولأن Railway يبني على **لينكس** ويشغّل `npm ci` اللي يلتزم حرفياً بالـ lockfile، كان ما يثبّت `@rollup/rollup-linux-x64-gnu`، فيطيح `vite build` بالخطأ:

```
Error: Cannot find module @rollup/rollup-linux-x64-gnu
```

هذي مشكلة معروفة في npm مع الحزم الاختيارية (npm/cli#4828).

**الحل:** أعدنا توليد `package-lock.json` بحيث يحتوي على كل المنصّات (ويندوز + لينكس + ماك). صار الآن فيه `@rollup/rollup-linux-x64-gnu`، وتأكدنا إنه متطابق مع `package.json`. هذا التعديل **تم بالفعل** في ملفاتك.

---

## 2. مشكلة ثانية مهمة جداً: الباك إند مو مرفوع على GitHub

عند الفحص طلع إن عندك شغل كثير على جهازك **ما رُفع على GitHub أبداً**. أهمها:

- مجلد `backend/services/` كامل (scheduler.js, meta.js, tiktok.js, snapchat.js) — وهذي الملفات `server.js` يستوردها، فلو ما رُفعت بيطيح التشغيل.
- `backend/package.json` و `backend/package-lock.json`.
- ملفات صفحات ومكوّنات جديدة في `src/`.

النسخة الموجودة حالياً على GitHub (اللي يبنيها Railway) قديمة وأبسط بكثير من اللي تشتغل عليه محلياً. لازم ترفع **كل** هذا الشغل مع بعض، وإلا البناء بيفشل من جديد.

---

## 3. التعديلات اللي تمّت في ملفاتك

1. **`package-lock.json`** — أُعيد توليده ليدعم كل المنصّات (إصلاح البناء).
2. **`backend/server.js`** — أُضيف له تقديم الواجهة المبنية (الـ `dist`): يقدّم الملفات الثابتة + يرجّع `index.html` لأي مسار غير API عشان التنقّل داخل التطبيق يشتغل. بهذا تصير الواجهة والـ API على نفس الخدمة ونفس الرابط (ما تحتاج CORS ولا proxy، لأن الواجهة تنادي `/api` بمسار نسبي).
3. **`railway.json`** (جديد) — يخبر Railway كيف يبني ويشغّل:
   - البناء: `npm run build && npm install --prefix backend --omit=dev`
   - التشغيل: `node backend/server.js`
4. **`.nvmrc`** (جديد) — يثبّت إصدار Node على 22.

---

## 4. خطوات الرفع (نفّذها من جهازك)

الـ sandbox ما يقدر يسوّي git على مجلدك وما عنده دخول GitHub، فهذي الخطوات تسوّيها أنت في الـ Terminal داخل مجلد المشروع:

```bash
cd "مسار/مجلد/Project Social App"

# تأكد إنك على فرع main
git checkout main

# أضف كل التعديلات والملفات الجديدة (مهم: -A عشان يضيف backend/services وكل الملفات غير المتعقّبة)
git add -A

# راجع وش راح يترفع (تأكد إن backend/services/ والملفات الجديدة ظاهرة)
git status

# سجّل التعديل
git commit -m "fix: cross-platform lockfile + serve frontend from backend + railway config; push full backend"

# ارفع
git push origin main
```

بمجرد ما تسوي `push`، Railway راح يبدأ بناء جديد تلقائياً.

> ملاحظة: `.gitignore` يستثني `node_modules` و `dist` و `.env` تلقائياً، فأسرارك ما راح تترفع — وهذا صحيح.

---

## 5. متغيّرات البيئة المطلوبة في Railway

افتح خدمة `social-app` على Railway → تبويب **Variables** → أضف المتغيّرات. Railway يمرّرها للبناء وللتشغيل، فمتغيّرات `VITE_` تشتغل وقت البناء (Vite يدمجها داخل الواجهة).

| المتغيّر | لمن | القيمة |
|---|---|---|
| `META_APP_ID` | الباك إند | من developers.facebook.com |
| `META_APP_SECRET` | الباك إند | سرّي — من فيسبوك |
| `META_REDIRECT_URI` | الباك إند | `https://<your-app>.up.railway.app/auth/meta/callback` |
| `TIKTOK_CLIENT_KEY` | الباك إند | من developers.tiktok.com |
| `TIKTOK_CLIENT_SECRET` | الباك إند | سرّي — من تيك توك |
| `TIKTOK_REDIRECT_URI` | الباك إند | `https://<your-app>.up.railway.app/auth/tiktok/callback` |
| `FRONTEND_URL` | الباك إند | رابط تطبيقك على Railway نفسه |
| `BASE_URL` | الباك إند | رابط تطبيقك على Railway نفسه |
| `VITE_META_APP_ID` | الواجهة (بناء) | نفس `META_APP_ID` |
| `VITE_TIKTOK_CLIENT_KEY` | الواجهة (بناء) | نفس `TIKTOK_CLIENT_KEY` |
| `VITE_SNAP_CLIENT_ID` | الواجهة (بناء) | من Snapchat (إن استخدمته) |

`PORT` يوفّره Railway تلقائياً — لا تضيفه يدوياً. وبعد ما تعرف رابط تطبيقك النهائي، حدّث روابط الـ redirect في لوحات مطوّري المنصّات (Meta/TikTok/Snap) لنفس الروابط أعلاه.

---

## 6. تنبيه مهم: قاعدة البيانات والملفات المرفوعة

الباك إند يخزّن البيانات في ملف SQLite (`backend/data.db`) والصور في مجلد `backend/uploads/`. نظام ملفات Railway **مؤقّت (ephemeral)** — أي بيانات جديدة (منشورات مجدولة، حسابات مربوطة، صور مرفوعة) **تنمسح مع كل نشر/إعادة تشغيل**.

للحل الدائم: أنشئ **Volume** في Railway واربطه بمسار يحتوي قاعدة البيانات والرفوعات، أو انقل التخزين لخدمة خارجية (مثلاً Postgres على Railway + تخزين صور سحابي). أقدر أعدّل الكود ليستخدم مسار Volume لو حاب — قل لي وأسوّيها.

---

## 7. بعد الرفع: كيف تتأكد إنه اشتغل

1. تابع سجل البناء في Railway — المفروض خطوة `Build image` تعدّي بنجاح هالمرة.
2. افتح رابط التطبيق — المفروض تطلع الواجهة.
3. جرّب `https://<your-app>.up.railway.app/health` — لازم يرجّع `{"ok":true,...}`، وهذا يأكد إن الباك إند شغّال.

لو طاح البناء مرة ثانية، انسخ لي آخر جزء من سجل `View logs` وأنا أشخّصه لك.
