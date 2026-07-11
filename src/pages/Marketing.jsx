// Marketing — a single hub page that gathers every tool as a card, so the whole
// app is reachable from one place (ideal when embedded as one "التسويق" section).

import React from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, Sparkles, MailPlus, BookImage, PenSquare, CalendarDays, ListChecks, Link as LinkIcon, ArrowLeft } from "lucide-react";

const GROUPS = [
  {
    ar: "التصميم والمحتوى", en: "Design & content",
    items: [
      { to: "/DesignStudio", icon: LayoutGrid, ar: "منشئ التصاميم", en: "Design Studio", dAr: "صمّم منشورات وستوري من الصفر", dEn: "Design posts & stories" },
      { to: "/ImageGen", icon: Sparkles, ar: "توليد صورة بالذكاء", en: "AI Image", dAr: "صور احترافية بهويتك بالذكاء", dEn: "On-brand AI images" },
      { to: "/GreetingCards", icon: MailPlus, ar: "بطاقات التهنئة", en: "Greeting Cards", dAr: "بطاقات مخصّصة بأسماء العملاء", dEn: "Personalised cards" },
      { to: "/DesignLibraryPage", icon: BookImage, ar: "مكتبة التصاميم", en: "Library", dAr: "كل تصاميمك ومنشوراتك", dEn: "All your designs" },
    ],
  },
  {
    ar: "النشر والتواصل", en: "Publishing & outreach",
    items: [
      { to: "/PostComposer", icon: PenSquare, ar: "إنشاء منشور", en: "New Post", dAr: "اكتب وجدول منشوراً جديداً", dEn: "Compose & schedule" },
      { to: "/ContentCalendar", icon: CalendarDays, ar: "تقويم المحتوى", en: "Calendar", dAr: "خطّط محتواك على التقويم", dEn: "Plan on a calendar" },
      { to: "/PostsManager", icon: ListChecks, ar: "إدارة المنشورات", en: "Posts", dAr: "تابع وعدّل منشوراتك", dEn: "Manage posts" },
      { to: "/AccountsPage", icon: LinkIcon, ar: "ربط الحسابات", en: "Accounts", dAr: "اربط منصاتك الاجتماعية", dEn: "Connect platforms" },
    ],
  },
];

export default function Marketing() {
  const isRtl = (localStorage.getItem("appLanguage") || "ar") === "ar";

  return (
    <div className="hv-page" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="rounded-2xl p-6 sm:p-8 mb-6 text-white relative overflow-hidden" style={{ background: "var(--hv-grad, linear-gradient(135deg,#4f46e5,#fb7185))" }}>
          <div className="relative z-10">
            <p className="text-xs font-bold opacity-80 mb-1">{isRtl ? "مركز التسويق" : "Marketing hub"}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">{isRtl ? "كل أدوات التسويق في مكان واحد" : "All your marketing in one place"}</h1>
            <p className="text-sm opacity-90">{isRtl ? "صمّم، ولّد، جدول، وتواصل مع عملائك — من صفحة واحدة." : "Design, generate, schedule and reach your customers — from one page."}</p>
          </div>
          <Sparkles className="absolute -bottom-4 -start-4 w-32 h-32 opacity-10" />
        </div>

        {GROUPS.map((g) => (
          <div key={g.ar} className="mb-7">
            <h2 className="hv-overline mb-3">{isRtl ? g.ar : g.en}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <Link key={it.to} to={it.to}
                    className="hv-card hv-card-hover group flex items-center gap-3 p-4 rounded-xl transition">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: "var(--hv-grad, linear-gradient(135deg,#4f46e5,#fb7185))" }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--hv-text)" }}>{isRtl ? it.ar : it.en}</p>
                      <p className="text-[11px] truncate" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? it.dAr : it.dEn}</p>
                    </div>
                    <ArrowLeft className={`w-4 h-4 opacity-30 group-hover:opacity-70 transition ${isRtl ? "" : "rotate-180"}`} style={{ color: "var(--hv-text-soft)" }} />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
