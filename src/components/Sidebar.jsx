import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, ChevronRight, ChevronLeft, Share2, Languages, BookImage, Link as LinkIcon, Home, CalendarDays, PenSquare, ListChecks, MailPlus, Sparkles, MessageCircle, Send } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", labelAr: "التسويق", labelEn: "Marketing", icon: Home, exact: true },
  { path: "/DesignStudio", labelAr: "منشئ التصاميم", labelEn: "Design Studio", icon: LayoutGrid },
  { path: "/ImageGen", labelAr: "توليد صورة بالذكاء", labelEn: "AI Image", icon: Sparkles },
  { path: "/GreetingCards", labelAr: "بطاقات التهنئة", labelEn: "Greeting Cards", icon: MailPlus },
  { path: "/DesignLibraryPage", labelAr: "مكتبة التصاميم", labelEn: "Design Library", icon: BookImage },
  { divider: true, labelAr: "السوشيال ميديا", labelEn: "Social Media" },
  { path: "/PostComposer", labelAr: "إنشاء منشور", labelEn: "New Post", icon: PenSquare },
  { path: "/ContentCalendar", labelAr: "تقويم المحتوى", labelEn: "Calendar", icon: CalendarDays },
  { path: "/PostsManager", labelAr: "إدارة المنشورات", labelEn: "Posts", icon: ListChecks },
  { path: "/Engagement", labelAr: "صندوق التفاعل", labelEn: "Engagement", icon: MessageCircle },
  { path: "/WhatsappOutreach", labelAr: "تواصل واتساب", labelEn: "WhatsApp Outreach", icon: Send },
  { path: "/AccountsPage", labelAr: "ربط الحسابات", labelEn: "Accounts", icon: LinkIcon },
  { path: "/TeamLinks", labelAr: "روابط الفريق", labelEn: "Team Links", icon: Share2 },
];

export default function Sidebar({ language, onLanguageChange }) {
  const isRtl = language === "ar";
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar_collapsed") === "true"
  );

  const toggleCollapse = () => {
    setCollapsed((p) => {
      localStorage.setItem("sidebar_collapsed", String(!p));
      return !p;
    });
  };

  const toggleLanguage = () => {
    const next = isRtl ? "en" : "ar";
    localStorage.setItem("appLanguage", next);
    onLanguageChange(next);
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      style={{ background: "var(--hv-sidebar-grad)" }}
      className={`flex flex-col h-screen transition-all duration-300 flex-shrink-0 text-white ${collapsed ? "w-16" : "w-60"}`}
    >
      {/* Logo / App Name */}
      <div className={`flex items-center gap-2.5 px-3.5 py-5 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 ring-1 ring-white/25">
          <Share2 className="w-[18px] h-[18px] text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight overflow-hidden">
            <span className="font-extrabold text-white text-sm truncate">
              {isRtl ? "استوديو المحتوى" : "Content Studio"}
            </span>
            <span className="text-[10px] text-white/60 truncate">
              {isRtl ? "تصميم ونشر" : "Design & Publish"}
            </span>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2.5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          if (item.divider) {
            return collapsed ? (
              <div key={`div-${idx}`} className="my-2.5 mx-2 border-t border-white/15" />
            ) : (
              <div key={`div-${idx}`} className="pt-4 pb-1.5 px-2.5">
                <p className="text-[10px] font-extrabold text-white/55 uppercase tracking-[0.12em]">
                  {isRtl ? item.labelAr : item.labelEn}
                </p>
              </div>
            );
          }
          const { path, labelAr, labelEn, icon: Icon } = item;
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`group relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all text-sm font-bold ${
                active
                  ? "bg-white text-indigo-700 shadow-[0_6px_18px_rgba(0,0,0,0.16)]"
                  : "text-white/80 hover:text-white hover:bg-white/12"
              } ${collapsed ? "justify-center" : ""}`}
              title={isRtl ? labelAr : labelEn}
            >
              {/* coral active accent bar */}
              {active && !collapsed && (
                <span
                  className="absolute top-1/2 -translate-y-1/2 h-5 w-1 rounded-full"
                  style={{ background: "var(--hv-secondary)", insetInlineStart: "-2px" }}
                />
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-indigo-600" : ""}`} />
              {!collapsed && <span className="truncate">{isRtl ? labelAr : labelEn}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className={`mx-2.5 mt-2 flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-white/75 hover:text-white hover:bg-white/12 transition text-xs font-bold ${collapsed ? "justify-center" : ""}`}
        title={isRtl ? "Switch to English" : "تبديل للعربية"}
      >
        <Languages className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span>{isRtl ? "English" : "عربي"}</span>}
      </button>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        className={`m-2.5 mt-1 flex items-center justify-center py-2.5 rounded-xl text-white/75 hover:text-white hover:bg-white/12 transition ${collapsed ? "" : "gap-2"}`}
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 transition">
          {isRtl
            ? (collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
            : (collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)
          }
        </div>
        {!collapsed && <span className="text-xs font-bold">{isRtl ? "طي القائمة" : "Collapse"}</span>}
      </button>
    </div>
  );
}
