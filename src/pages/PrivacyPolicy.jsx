import React from "react";

// Public privacy policy — required for TikTok / Meta app review. Reachable at
// /privacy with no login so reviewers can open it directly.
export default function PrivacyPolicy() {
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", padding: "32px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", lineHeight: 1.9, fontFamily: "Tajawal, system-ui, sans-serif" }}>
        <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 800 }}>سياسة الخصوصية — هوفيرا (Hovera)</h1>
        <p style={{ color: "#94a3b8" }}>آخر تحديث: مايو 2026</p>

        <p>تطبيق <b>هوفيرا (Hovera)</b> لإدارة وجدولة محتوى السوشيال ميديا يساعد أصحاب الصالونات والأعمال على تصميم المنشورات وجدولتها ونشرها على حساباتهم في منصات التواصل. توضّح هذه السياسة البيانات التي نصل إليها وكيف نستخدمها.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>١. البيانات التي نصل إليها</h2>
        <p>عند ربطك لحساباتك على <b>انستقرام / فيسبوك / تيك توك</b> عبر تسجيل الدخول الرسمي (OAuth)، نطلب صلاحيات محدّدة لـ:</p>
        <ul>
          <li>قراءة معلوماتك العامة الأساسية (اسم الحساب/الصفحة).</li>
          <li>قائمة الصفحات وحسابات الأعمال المرتبطة.</li>
          <li>نشر المحتوى الذي تنشئه أنت (صور/منشورات/قصص) نيابةً عنك.</li>
        </ul>
        <p>لا نصل إلى رسائلك الخاصة ولا كلمات مرورك إطلاقاً.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٢. كيف نستخدم البيانات</h2>
        <ul>
          <li>تُستخدم رموز الوصول (Access Tokens) فقط لتنفيذ النشر والجدولة التي تطلبها أنت.</li>
          <li>لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض إعلانية.</li>
          <li>الصور والتصاميم تُخزّن لعرضها في مكتبتك ونشرها عند الطلب.</li>
        </ul>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٣. تخزين البيانات وحمايتها</h2>
        <p>تُخزّن البيانات في خوادم آمنة، وكل صالون معزول ببياناته الخاصة. رموز الوصول تُحفظ بشكل آمن وتُستخدم فقط لتنفيذ طلباتك.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٤. حذف البيانات وإلغاء الربط</h2>
        <p>تستطيع في أي وقت فصل أي حساب من صفحة «ربط الحسابات» داخل التطبيق، ممّا يحذف رموز الوصول الخاصة به. لطلب حذف كامل لبياناتك، تواصل معنا على البريد أدناه وسنحذفها خلال مدة معقولة.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٥. التواصل</h2>
        <p>لأي استفسار حول الخصوصية أو طلب حذف بيانات:</p>
        <p>📧 <b>info@hovera.sa</b></p>

        <hr style={{ borderColor: "#334155", margin: "28px 0" }} />
        <h2 style={{ color: "#fff" }}>Privacy Policy (English summary)</h2>
        <p style={{ direction: "ltr", textAlign: "left" }}>
          Hovera is a social media management tool for salons and businesses. When you connect your Instagram,
          Facebook, or TikTok account via official OAuth, we request permission only to read your basic public
          profile, list your pages/business accounts, and publish the content you create on your behalf. We do not
          access private messages or passwords, we never sell your data, and access tokens are used solely to perform
          the publishing/scheduling you request. You can disconnect any account anytime from the “Connected Accounts”
          page (which deletes its tokens), or email <b>info@hovera.sa</b> to request full deletion.
        </p>
      </div>
    </div>
  );
}
