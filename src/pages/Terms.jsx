import React from "react";

// Public Terms of Service — required for TikTok / Meta app review. Reachable at
// /terms with no login.
export default function Terms() {
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", padding: "32px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", lineHeight: 1.9, fontFamily: "Tajawal, system-ui, sans-serif" }}>
        <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 800 }}>شروط الاستخدام — هوفيرا (Hovera)</h1>
        <p style={{ color: "#94a3b8" }}>آخر تحديث: مايو 2026</p>

        <p>باستخدامك تطبيق <b>هوفيرا</b> لإدارة وجدولة محتوى السوشيال ميديا، فإنك توافق على الشروط التالية:</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>١. الخدمة</h2>
        <p>يتيح التطبيق تصميم المنشورات وجدولتها ونشرها على حساباتك في منصات التواصل (انستقرام/فيسبوك/تيك توك) التي تربطها بنفسك.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٢. مسؤوليتك</h2>
        <ul>
          <li>أنت مسؤول عن المحتوى الذي تنشره وعن التزامه بأنظمة المنصات والقوانين المعمول بها.</li>
          <li>تضمن أنك تملك صلاحية النشر على الحسابات التي تربطها.</li>
          <li>يُمنع استخدام التطبيق في نشر محتوى مخالف أو مضلّل أو ينتهك حقوق الآخرين.</li>
        </ul>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٣. الربط مع المنصات</h2>
        <p>الربط يتم عبر تسجيل الدخول الرسمي (OAuth) للمنصات، ويخضع لشروط تلك المنصات. تستطيع إلغاء الربط في أي وقت.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٤. حدود المسؤولية</h2>
        <p>نبذل جهدنا لتشغيل الخدمة بكفاءة، لكن لا نضمن عدم انقطاعها أو خلوها من الأخطاء، ولا نتحمّل مسؤولية أي ضرر ناتج عن سياسات المنصات الخارجية أو تعطّلها.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٥. التواصل</h2>
        <p>📧 <b>info@hovera.sa</b></p>

        <hr style={{ borderColor: "#334155", margin: "28px 0" }} />
        <h2 style={{ color: "#fff" }}>Terms of Service (English summary)</h2>
        <p style={{ direction: "ltr", textAlign: "left" }}>
          By using Hovera, you agree to use it to design, schedule, and publish content to social accounts you
          personally connect. You are responsible for your content and for having the right to post to the connected
          accounts, and you agree not to publish content that violates platform policies or applicable law.
          Connections use official OAuth and are subject to each platform's terms; you may disconnect at any time.
          Contact: <b>info@hovera.sa</b>.
        </p>
      </div>
    </div>
  );
}
