import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, ChevronRight, ChevronLeft, Share2, Languages, BookImage, Link as LinkIcon, Film } from "lucide-react";

const NAV_ITEMS = [
  { path: "/DesignStudio", labelAr: "منشئ التصاميم", labelEn: "Design Studio", icon: LayoutGrid },
  { path: "/VideoEditor", labelAr: "محرر الفيديو", labelEn: "Video Editor", icon: Film },
  { path: "/DesignLibraryPage", labelAr: "مكتبة التصاميم", labelEn: "Design Library", icon: BookImage },
  { path: "/AccountsPage", labelAr: "ربط الحسابات", labelEn: "Accounts", icon: LinkIcon },
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
      className={`flex flex-col bg-slate-900 border-e border-slate-700 h-screen transition-all duration-300 flex-shrink-0 ${collapsed ? "w-14" : "w-56"}`}
    >
      {/* Logo / App Name */}
      <div className={`flex items-center gap-2 px-3 py-4 border-b border-slate-700 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Share2 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight overflow-hidden">
            <span className="font-bold text-white text-xs truncate">
              {isRtl ? "إدارة السوشيال ميديا" : "Social Media Manager"}
            </span>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ path, labelAr, labelEn, icon: Icon }) => {
          const active = location.pathname === path || location.pathname === "/";
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition text-sm font-medium ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              } ${collapsed ? "justify-center" : ""}`}
              title={isRtl ? labelAr : labelEn}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{isRtl ? labelAr : labelEn}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className={`flex items-center gap-2 px-3 py-2.5 border-t border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs ${collapsed ? "justify-center" : ""}`}
        title={isRtl ? "Switch to English" : "تبديل للعربية"}
      >
        <Languages className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span>{isRtl ? "English" : "عربي"}</span>}
      </button>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        className={`flex items-center justify-center py-4 px-3 border-t border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition w-full ${collapsed ? "" : "gap-2"}`}
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-700 hover:bg-indigo-600 transition">
          {isRtl
            ? (collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
            : (collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)
          }
        </div>
        {!collapsed && <span className="text-xs">{isRtl ? "طي القائمة" : "Collapse"}</span>}
      </button>
    </div>
  );
}