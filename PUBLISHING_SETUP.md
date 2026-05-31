# دليل تشغيل النشر التلقائي على المنصات

> آخر تحديث: 2026-05-31
> الهدف: تشغيل النشر الفعلي على Instagram + Facebook + TikTok بدلاً من الحفظ المحلي فقط.

## نظرة عامة على المعمارية

```
┌─────────────────┐      ┌───────────────────┐      ┌─────────────────┐
│   Frontend      │      │   Backend         │      │  Platforms      │
│   (Vite + React)│──┬──▶│   (Express        │──┬──▶│  Meta Graph     │
│                 │  │   │    + sql.js       │  │   │  TikTok API     │
│ BulkSchedule    │  │   │    + node-cron)   │  │   │  Snapchat API   │
│ ContentCalendar │  │   │                   │  │   └─────────────────┘
│ AccountsPage    │  │   │ Scheduler runs    │  │
└─────────────────┘  │   │ every minute      │  │
                     │   └───────────────────┘  │
                     │           │              │
                     │           ▼              │
                     │   ┌───────────────────┐  │
                     └──▶│  localStorage     │  │
                         │  (fallback when   │  │
                         │   backend is down)│  │
                         └───────────────────┘  │
                                                ▼
                                         OAuth callbacks
```

## ✅ الموجود بالفعل في الكود

- `backend/services/meta.js` — نشر Instagram + Facebook (Graph API v19)
- `backend/services/tiktok.js` — نشر TikTok
- `backend/services/snapchat.js` — OAuth فقط (سناب لا يدعم نشر تلقائي للأفراد)
- `backend/services/scheduler.js` — cron يفحص كل دقيقة
- `backend/server.js` — REST API + OAuth routes
- `src/utils/publishingService.js` — gateway يربط الواجهة بالخادم مع fallback محلي
- `src/pages/AccountsPage.jsx` — صفحة ربط الحسابات

## 🔴 المشكلة الحالية

**Railway backend متعطل** — `https://social-app-production-7cfd.up.railway.app/health` يرجع 404 على كل المسارات. السبب: الـ deployment غير موجود أو منتهي الصلاحية أو معلق.

## 🚀 خيارات التشغيل

### الخيار 1: تشغيل الخادم محلياً (الأسرع للاختبار)

```bash
cd backend
npm install
cp .env.example .env
# عدّل .env وأضف App IDs و Secrets الحقيقية
npm run dev
# الخادم يعمل على http://localhost:3001
```

ثم شغّل الواجهة:

```bash
npm run dev
# الواجهة على http://localhost:5173
```

سيتم توجيه `/api/*` و `/auth/*` تلقائياً إلى `localhost:3001` (موجود في `vite.config.js`).

**ملاحظة:** OAuth callbacks تحتاج URL public يصل إليه فيسبوك/تيك توك. للاختبار محلياً استخدم [ngrok](https://ngrok.com):

```bash
ngrok http 3001
# انسخ الـ URL (مثلاً https://abc123.ngrok.io)
# عدّل .env:
#   META_REDIRECT_URI=https://abc123.ngrok.io/auth/meta/callback
#   TIKTOK_REDIRECT_URI=https://abc123.ngrok.io/auth/tiktok/callback
```

### الخيار 2: إعادة نشر Railway

1. سجّل دخول إلى [railway.app](https://railway.app)
2. أنشئ مشروع جديد من GitHub repo (أو حدّث المشروع الحالي)
3. اختر `backend/` كـ root directory
4. أضف متغيرات البيئة من القسم التالي
5. Railway يعطيك URL جديد — حدّث `vite.config.js`:
   ```js
   const BACKEND = process.env.VITE_BACKEND_URL || 'https://your-new-app.railway.app'
   ```

### الخيار 3: بدائل أرخص

- **Render** ([render.com](https://render.com)) — free tier متاح
- **Fly.io** — free tier متاح
- **Cloudflare Workers + KV** — يحتاج إعادة كتابة (sql.js → KV/D1)

## 🔑 إنشاء Meta Developer App

### المتطلبات
- حساب Facebook **Business** (مش شخصي)
- صفحة فيسبوك مرتبطة بحساب Instagram **تجاري أو creator**
- رقم جوال أو ID للتحقق

### الخطوات

1. **افتح** [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. **انقر** "Create App" → اختر "Business" → ضع اسم التطبيق
3. **أضف Products**:
   - Facebook Login
   - Instagram Graph API
4. **في Settings > Basic**:
   - انسخ `App ID` → ضعه في `META_APP_ID` (backend) و `VITE_META_APP_ID` (frontend)
   - انسخ `App Secret` → ضعه في `META_APP_SECRET` (backend فقط — لا يذهب للواجهة أبداً)
5. **في Facebook Login > Settings**:
   - أضف Redirect URI:
     - محلياً: `https://YOUR_NGROK_URL/auth/meta/callback`
     - Production: `https://YOUR_BACKEND/auth/meta/callback`
6. **اطلب الصلاحيات (App Review)**:
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`
   - **مهم**: التطبيق في وضع "Development" يعمل فقط مع الحسابات المضافة كـ Test Users. للإنتاج تحتاج App Review (يستغرق أسابيع وتحتاج فيديو يشرح الاستخدام).

### اختبار سريع بدون App Review

في وضع Development، أضف نفسك كـ Test User:
- App Roles > Roles > Add People > Tester

ثم اربط حسابك من `/AccountsPage` في التطبيق.

## 🎵 إنشاء TikTok Developer App

1. **افتح** [developers.tiktok.com](https://developers.tiktok.com)
2. **سجّل دخول** بحساب TikTok Business
3. **My Apps** → Create App
4. **اطلب الصلاحيات**:
   - `user.info.basic`
   - `video.publish`
   - `video.upload`
5. **في App Settings**:
   - انسخ `Client Key` → `TIKTOK_CLIENT_KEY` + `VITE_TIKTOK_CLIENT_KEY`
   - انسخ `Client Secret` → `TIKTOK_CLIENT_SECRET`
   - أضف Redirect URI: `https://YOUR_BACKEND/auth/tiktok/callback`

**ملاحظات TikTok:**
- المنصة تحتاج Business account + موافقة على Content Posting API (يومين-أسبوع)
- النشر التلقائي يدعم فيديوهات فقط (مش صور)
- في sandbox mode، الفيديوهات تُنشر كـ "private" فقط

## 👻 Snapchat (محدود جداً)

سناب شات **لا يدعم النشر التلقائي للأفراد**. الـ Marketing API محصور بشركاء معينين.

في الكود الحالي، Snapchat OAuth يتحقق من الحساب فقط لكن النشر يُحدد كـ `manual: true` في `scheduler.js`. المستخدم يجب أن ينشر يدوياً.

## 📋 ملف .env الكامل للـ Backend

```bash
# Server
PORT=3001
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:3001

# Meta (Facebook + Instagram)
META_APP_ID=1234567890
META_APP_SECRET=abcdef1234567890
META_REDIRECT_URI=http://localhost:3001/auth/meta/callback
# في production استخدم HTTPS:
# META_REDIRECT_URI=https://yourdomain.com/auth/meta/callback

# TikTok
TIKTOK_CLIENT_KEY=awxyz123
TIKTOK_CLIENT_SECRET=secretvalue
TIKTOK_REDIRECT_URI=http://localhost:3001/auth/tiktok/callback

# Snapchat (اختياري)
SNAP_CLIENT_ID=...
SNAP_CLIENT_SECRET=...
SNAP_REDIRECT_URI=http://localhost:3001/auth/snapchat/callback
```

## 📋 ملف .env.local للـ Frontend

```bash
# Public IDs only — لا تضع أبداً secrets هنا
VITE_META_APP_ID=1234567890
VITE_TIKTOK_CLIENT_KEY=awxyz123
VITE_SNAP_CLIENT_ID=...

# عند استخدام backend remote
# VITE_BACKEND_URL=https://your-backend.railway.app
```

## ✅ قائمة التحقق قبل أول نشر فعلي

- [ ] Backend شغّال وreturns 200 على `/health`
- [ ] Meta App ID + Secret في `.env`
- [ ] TikTok Client Key + Secret في `.env` (لو تستخدمه)
- [ ] Redirect URIs مضافة في Meta + TikTok dashboards
- [ ] حساب فيسبوك Business + صفحة + ربط بـ Instagram تجاري
- [ ] فتحت `/AccountsPage` ونجح OAuth (Banner أخضر)
- [ ] صورة المنشور على Cloudinary أو CDN عام (Meta لا يقبل blob: URLs)
- [ ] الكابشن لا يحتوي رموز خارج الـ UTF-8 المدعوم
- [ ] جدولت منشور لوقت > 60 ثانية في المستقبل
- [ ] الـ Scheduler logs تظهر `[Scheduler] ✅ نُشر على ...`

## 🔍 استكشاف الأخطاء

| المشكلة | السبب الأكثر شيوعاً | الحل |
|---|---|---|
| "Backend offline" في الواجهة | الخادم غير شغّال | `cd backend && npm run dev` |
| OAuth callback يرجع `error=access_denied` | المستخدم لم يقبل الصلاحيات | إعادة المحاولة |
| `instagram_business_account: null` | الحساب شخصي مش تجاري | حوّله Business في إعدادات IG |
| `(#10) Application does not have permission` | App في Development + المستخدم ليس Test User | أضفه كـ Tester |
| Image URL not accessible | الصورة على localhost أو blob | ارفعها على Cloudinary أولاً |
| TikTok 401 invalid_grant | refresh_token منتهي | أعد الربط |
| Scheduler ما ينشر | الوقت لم يحن بعد، أو الحساب غير مرتبط | راجع logs |

## 📊 مراقبة الحالة

من الواجهة:
- **رأس صفحة Content Calendar** → pill "الخادم متصل/غير متصل"
- **بطاقات المنشورات** → status badge (مسودة/مجدول/قيد الإرسال/منشور/فشل)
- **زر "انشر الآن"** → فقط لو الخادم متصل والمنشور قابل للنشر

من الـ logs:
```bash
# في terminal الـ backend
[Scheduler] وجدت 3 منشور للنشر
[Scheduler] ✅ نُشر على instagram - المنشور: abc123
[Scheduler] ❌ فشل النشر على tiktok: Invalid access token
[Scheduler] المنشور abc123 → published
```

## 🚨 ملاحظات أمنية

1. **لا تضع `META_APP_SECRET` في `.env.local` أبداً** — هذا الملف يُسرّب للواجهة. السرّ يبقى في backend فقط.
2. **العمل مع HTTPS في Production** — Meta يرفض HTTP callbacks في live mode.
3. **خزّن tokens مشفّرة في DB** — حالياً نخزنها كـ plain text. لإنتاج جدّي استخدم encryption-at-rest.
4. **Rate limits** — Meta = 200 calls/hour/user, TikTok أصرم. الـ scheduler يحترم هذا تلقائياً (دقيقة بين كل دفعة).

---

## الخلاصة: ما تم إنجازه اليوم

✅ `vite.config.js` يشير لـ `localhost:3001` بدل Railway المتعطل
✅ `publishingService.js` — gateway موحّد للـ backend مع fallback محلي
✅ `BulkScheduleModal` يحفظ على الـ backend (مع pill حالة وbanner للأوفلاين)
✅ `ContentCalendar` يدمج backend + localStorage + يعرض زر "انشر الآن" + retry
✅ تتبع حالة كل منشور (مسودة / مجدول / قيد الإرسال / منشور / فشل)

## ما تحتاج فعله أنت

1. شغّل الـ backend محلياً (`cd backend && npm run dev`)
2. أنشئ Meta Developer App + ضع IDs في `.env`
3. اربط حسابك من `/AccountsPage`
4. جدول منشور تجريبي لوقت قريب (3 دقائق من الآن)
5. راقب الـ logs والـ status badge في الواجهة

🎯 **في حال نجاح النشر، الـ status badge سيتحول من "مجدول" إلى "منشور" خلال 60 ثانية من الوقت المحدد.**
