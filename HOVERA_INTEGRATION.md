# دمج تطبيق السوشيال ميديا داخل هوفيرا (Hovera) — تعليمات للمبرمج

> الهدف: كل صالون مسجّل دخوله في هوفيرا، لما يفتح صفحة «التسويق / السوشيال»، يدخل
> تطبيق التصميم والجدولة **مباشرة بمساحته الخاصة المعزولة** — بدون تسجيل دخول ثانٍ.
> العزل بين الصالونات يتم تلقائياً عبر `salon_id` داخل توكن JWT موقّع بكلمة سر مشتركة.

---

## كيف يشتغل الربط (الصورة الكاملة)

```
هوفيرا (لديه تسجيل دخول)                 تطبيق السوشيال (Railway)
─────────────────────────                ─────────────────────────
العميل مسجّل دخوله
        │
يضغط زر «التسويق»
        │
هوفيرا يوقّع JWT يحوي salon_id  ───────►  التطبيق يتحقق من التوكن بنفس كلمة السر
بكلمة السر المشتركة                       ويعزل كل البيانات على هذا الـ salon_id
        │
يفتح التطبيق مع ?t=<JWT>      ◄───────►  كل صالون يشوف تصاميمه/حساباته/جدولته فقط
```

كلمة السر المشتركة (`SOCIAL_JWT_SECRET`) **موجودة أصلاً** في إعدادات تطبيق السوشيال على Railway.
صاحب الحساب سيعطيك نفس القيمة بالضبط — ضعها كما هي في بيئة هوفيرا.

---

## الخطوة ١ — متغيّر البيئة في هوفيرا

أضف نفس كلمة السر المشتركة إلى بيئة هوفيرا (نفس قيمة `SOCIAL_JWT_SECRET` التي على Railway):

```
SOCIAL_JWT_SECRET=<القيمة نفسها التي على Railway — يعطيك إياها صاحب الحساب>
SOCIAL_APP_URL=https://social-app-production-7cfd.up.railway.app
```

⚠️ كلمة السر تبقى في الخادم فقط — لا تُرسل أبداً إلى المتصفح.

---

## الخطوة ٢ — صيغة التوكن التي يتوقعها التطبيق

توكن **JWT قياسي (HS256)**. الـ payload يجب أن يحتوي معرّف الصالون. التطبيق يقبل أيّ من
هذه المفاتيح: `salon_id` أو `salonId` أو `tenant_id` أو `sub`.

```jsonc
// header
{ "alg": "HS256", "typ": "JWT" }
// payload
{
  "salon_id": "123",      // معرّف الصالون الثابت والفريد (مفتاح قاعدة البيانات)
  "exp": 1735680000        // (اختياري) وقت الانتهاء بالثواني — يُنصح به
}
```

> 🔑 **مهم جداً:** يجب أن يكون `salon_id` **ثابتاً ونفسه** لكل صالون في كل مرة، لأنه هو
> المفتاح الذي تُعزل وتُحفظ عليه بياناته. استخدم المعرّف الأساسي للصالون من قاعدة بيانات هوفيرا.
> التطبيق يحوّله إلى نص (string) داخلياً، فلا يهم نوعه (رقم أو نص).

التطبيق يقرأ التوكن من أيّ من: ترويسة `Authorization: Bearer <jwt>`، أو ترويسة
`x-social-token`، أو باراميتر `?t=<jwt>` في الرابط (وهو ما سنستخدمه عند الفتح).

---

## الخطوة ٣ — الكود (Express / Node.js)

### الطريقة الأنظف: باستخدام مكتبة `jsonwebtoken`

```bash
npm install jsonwebtoken
```

```js
const jwt = require('jsonwebtoken');

const SOCIAL_APP_URL = process.env.SOCIAL_APP_URL || 'https://social-app-production-7cfd.up.railway.app';

// مسار محمي بتسجيل الدخول. عدّل requireLogin واستخراج معرّف الصالون
// بما يناسب نظام جلسات هوفيرا لديك (req.session / req.user / ...).
app.get('/marketing', requireLogin, (req, res) => {
  // ⬇️ استبدل هذا بمعرّف الصالون الحقيقي للمستخدم المسجّل دخوله
  const salonId = req.user.salonId;            // أو req.session.salonId ... إلخ

  const token = jwt.sign(
    { salon_id: String(salonId) },
    process.env.SOCIAL_JWT_SECRET,
    { expiresIn: '8h' }
  );

  // يفتح التطبيق محمّلاً بهوية الصالون. التطبيق يلتقط ?t= ويحفظه ويرسله مع كل طلب.
  res.redirect(`${SOCIAL_APP_URL}/?t=${encodeURIComponent(token)}`);
});
```

### بديل بدون أي مكتبة (HMAC يدوي — نفس النتيجة)

```js
const crypto = require('crypto');
const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function signSalonToken(salonId, secret, ttlSeconds = 8 * 3600) {
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    salon_id: String(salonId),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }));
  const sig = b64url(crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

app.get('/marketing', requireLogin, (req, res) => {
  const salonId = req.user.salonId;            // ⬅️ عدّله حسب هوفيرا
  const token = signSalonToken(salonId, process.env.SOCIAL_JWT_SECRET);
  res.redirect(`${process.env.SOCIAL_APP_URL}/?t=${encodeURIComponent(token)}`);
});
```

---

## الخطوة ٤ — إضافة الزر / عنصر القائمة

في قائمة هوفيرا، أضف رابطاً يفتح المسار الجديد:

```html
<!-- يفتح في تبويب جديد -->
<a href="/marketing" target="_blank" rel="noopener">التسويق والسوشيال ميديا</a>
```

### (اختياري) دمجه داخل هوفيرا عبر iframe — ليبقى العميل داخل واجهة هوفيرا

```html
<iframe
  src="/marketing"
  style="width:100%; height:100vh; border:0;"
  allow="clipboard-write"
></iframe>
```

> الـ iframe يتبع التحويل (redirect) تلقائياً، فيشتغل بنفس مسار `/marketing` أعلاه دون أي تغيير.

---

## ملاحظات مهمة

- **العزل:** التطبيق يعزل التصاميم، الوسائط، الشعارات، الحسابات المربوطة، والمنشورات المجدولة —
  كلها على `salon_id`. لا يرى أي صالون بيانات صالون آخر.
- **بدون توكن:** إذا فُتح التطبيق بدون توكن صالح، يقع على مساحة `default` (مساحة المالك للتجربة)
  — لا يتعطّل.
- **الأمان:** كلمة السر في الخادم فقط. التوكن قصير العمر (8 ساعات). جدّده مع كل فتح للصفحة
  (المسار يوقّع توكناً جديداً في كل مرة، فهذا مضمون تلقائياً).
- **انتهاء الصلاحية:** لو انتهت صلاحية التوكن والعميل لا يزال داخل التطبيق، يكفي أن يرجع
  ويضغط زر «التسويق» مرة أخرى ليحصل على توكن جديد.

---

## اختبار سريع بعد التطبيق

1. سجّل دخول بصالون A، افتح «التسويق» → أنشئ تصميماً.
2. سجّل دخول بصالون B → يجب ألّا يرى تصميم صالون A (مساحة فارغة خاصة به).
3. ارجع لصالون A → تصميمه لا يزال موجوداً.

إذا تحقّق ذلك، فالعزل يعمل والربط ناجح ✅
