import React, { useEffect } from "react";
import LegalHeader from "../components/LegalHeader";

// Public Terms of Service — required for TikTok / Meta app review. Reachable at
// /terms with no login.
export default function Terms() {
  // TikTok review: browser-tab title must match the app name exactly.
  useEffect(() => { document.title = "Hovera social App"; }, []);
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", padding: "32px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", lineHeight: 1.9, fontFamily: "Tajawal, system-ui, sans-serif" }}>
        <LegalHeader title="شروط الاستخدام" />
        <p style={{ color: "#94a3b8" }}>آخر تحديث: يوليو 2026</p>

        <p>باستخدامك تطبيق <b>Hovera social App</b> لإدارة وجدولة محتوى السوشيال ميديا، فإنك توافق على الشروط التالية. إن لم توافق عليها، فالرجاء عدم استخدام التطبيق.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>١. الخدمة</h2>
        <p>يتيح تطبيق <b>Hovera social App</b> تصميم المنشورات وتوليد الصور وجدولة المحتوى ونشره على حساباتك في منصات التواصل (انستقرام / فيسبوك / تيك توك) التي تربطها بنفسك عبر تسجيل الدخول الرسمي (OAuth).</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٢. الأهلية والحساب</h2>
        <ul>
          <li>يجب أن يكون عمرك ١٨ عاماً فأكثر، وأن تملك صلاحية إدارة الحسابات التي تربطها.</li>
          <li>أنت مسؤول عن الحفاظ على سرّية بيانات دخولك وعن كل نشاط يتم عبر حسابك.</li>
        </ul>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٣. مسؤوليتك عن المحتوى</h2>
        <ul>
          <li>أنت مسؤول عن المحتوى الذي تنشره وعن التزامه بأنظمة المنصات والقوانين المعمول بها.</li>
          <li>تضمن أنك تملك صلاحية النشر على الحسابات التي تربطها.</li>
          <li>يُمنع استخدام التطبيق في نشر محتوى مخالف أو مضلّل أو ينتهك حقوق الآخرين أو حقوق الملكية الفكرية.</li>
        </ul>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٤. الاستخدام المقبول</h2>
        <ul>
          <li>يُمنع محاولة اختراق الخدمة أو الوصول غير المصرّح به لبيانات مستخدمين آخرين.</li>
          <li>يُمنع إساءة استخدام واجهات المنصات (APIs) بما يخالف شروطها أو حدودها.</li>
          <li>يُمنع استخدام الخدمة لإرسال محتوى مزعج (spam) أو احتيالي.</li>
        </ul>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٥. الربط مع المنصات الخارجية</h2>
        <p>الربط يتم عبر تسجيل الدخول الرسمي (OAuth)، ويخضع استخدامك لكل منصة لشروطها هي أيضاً — بما فيها <b>شروط خدمة TikTok</b> وسياسات Meta. نستخدم رموز الوصول فقط لتنفيذ النشر والجدولة التي تطلبها، وتستطيع إلغاء الربط في أي وقت من صفحة «ربط الحسابات».</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٦. الملكية الفكرية</h2>
        <p>يبقى المحتوى الذي تنشئه ملكاً لك. أمّا التطبيق نفسه وواجهاته وشعاره فهي ملك لـ Hovera ولا يجوز نسخها أو إعادة استخدامها دون إذن.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٧. إيقاف الخدمة أو إنهاؤها</h2>
        <p>يحقّ لنا تعليق أو إنهاء وصولك للخدمة إذا خالفت هذه الشروط أو شروط المنصات المرتبطة. وتستطيع أنت إيقاف استخدام الخدمة وحذف بياناتك في أي وقت (انظر سياسة الخصوصية).</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٨. حدود المسؤولية</h2>
        <p>تُقدَّم الخدمة «كما هي». نبذل جهدنا لتشغيلها بكفاءة، لكن لا نضمن عدم انقطاعها أو خلوها من الأخطاء، ولا نتحمّل مسؤولية أي ضرر ناتج عن سياسات المنصات الخارجية أو تعطّلها.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>٩. تعديل الشروط</h2>
        <p>قد نُحدّث هذه الشروط من وقت لآخر، ويسري التحديث فور نشره على هذه الصفحة. استمرارك في استخدام التطبيق بعد التحديث يعني موافقتك على الشروط المعدّلة.</p>

        <h2 style={{ color: "#fff", marginTop: 24 }}>١٠. التواصل</h2>
        <p>📧 <b>info@hovera.sa</b></p>

        <hr style={{ borderColor: "#334155", margin: "28px 0" }} />
        <h2 style={{ color: "#fff" }}>Terms of Service (English)</h2>
        <p style={{ direction: "ltr", textAlign: "left" }}>
          By using <b>Hovera social App</b>, you agree to these Terms. The app lets you design, generate images, schedule,
          and publish content to social accounts you personally connect via official OAuth. You must be 18+ and authorized
          to manage the accounts you connect. You are responsible for your content and for having the right to post it, and
          you agree not to publish content that violates platform policies, applicable law, or others' intellectual property.
          You may not attempt to hack the service, access other users' data, misuse platform APIs, or send spam.
          Connections are also subject to each platform's terms, including the TikTok Terms of Service and Meta policies;
          access tokens are used solely to perform the publishing/scheduling you request, and you may disconnect at any time.
          The service is provided "as is" without warranties, and we are not liable for damages arising from external platform
          policies or outages. We may suspend access for violations, and we may update these Terms by posting changes on this page.
          Contact: <b>info@hovera.sa</b>.
        </p>
      </div>
    </div>
  );
}
