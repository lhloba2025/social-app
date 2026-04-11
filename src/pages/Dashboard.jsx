import React from "react";
import { useNavigate } from "react-router-dom";

const FEATURES = [
  {
    path: "/DesignStudio",
    titleAr: "منشئ التصاميم",
    titleEn: "Design Studio",
    descAr: "صمم منشوراتك ورسوماتك للسوشيال ميديا",
    descEn: "Design your posts and graphics for social media",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
    ),
    gradient: "from-indigo-500 to-purple-600",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    hover: "hover:border-indigo-500/60",
    textColor: "text-indigo-400",
  },
  {
    path: "/VideoEditor",
    titleAr: "محرر الفيديو",
    titleEn: "Video Editor",
    descAr: "حرّر فيديوهاتك بخطوط متعددة وتأثيرات احترافية",
    descEn: "Edit your videos with multi-track timelines and professional effects",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="2" width="20" height="20" rx="3"/>
        <polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    ),
    gradient: "from-cyan-500 to-blue-600",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    hover: "hover:border-cyan-500/60",
    textColor: "text-cyan-400",
  },
  {
    path: "/DesignLibraryPage",
    titleAr: "مكتبة التصاميم",
    titleEn: "Design Library",
    descAr: "استعرض وعدّل تصاميمك المحفوظة",
    descEn: "Browse and edit your saved designs",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="7" height="9" rx="1"/>
        <rect x="14" y="3" width="7" height="5" rx="1"/>
        <rect x="14" y="12" width="7" height="9" rx="1"/>
        <rect x="3" y="16" width="7" height="5" rx="1"/>
      </svg>
    ),
    gradient: "from-violet-500 to-pink-600",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    hover: "hover:border-violet-500/60",
    textColor: "text-violet-400",
  },
  {
    path: "/AccountsPage",
    titleAr: "ربط الحسابات",
    titleEn: "Connect Accounts",
    descAr: "اربط حساباتك على Facebook وInstagram وTikTok وغيرها",
    descEn: "Connect your Facebook, Instagram, TikTok, and other accounts",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    ),
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    hover: "hover:border-emerald-500/60",
    textColor: "text-emerald-400",
  },
];

const PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube", "Twitter", "Snapchat", "LinkedIn"];

export default function Dashboard({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const navigate = useNavigate();

  return (
    <div dir={ar ? "rtl" : "ltr"} className="h-full overflow-y-auto bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {ar ? "إدارة السوشيال ميديا" : "Social Media Manager"}
              </h1>
              <p className="text-slate-500 text-sm">
                {ar ? "اصنع محتواك واربط حساباتك من مكان واحد" : "Create your content and manage your accounts in one place"}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {FEATURES.map((f) => (
            <button
              key={f.path}
              onClick={() => navigate(f.path)}
              className={`group relative flex items-start gap-4 p-6 rounded-2xl border ${f.bg} ${f.border} ${f.hover} transition-all duration-200 ${ar ? "text-right" : "text-left"} hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40`}
            >
              <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-lg`}>
                {f.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white mb-1">{ar ? f.titleAr : f.titleEn}</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{ar ? f.descAr : f.descEn}</p>
              </div>
              <div className={`absolute ${ar ? "left-5" : "right-5"} top-1/2 -translate-y-1/2 ${f.textColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points={ar ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}/>
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Supported Platforms */}
        <div className="border border-slate-800 rounded-2xl p-6 bg-slate-900/40">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">
            {ar ? "المنصات المدعومة" : "Supported Platforms"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <span key={p} className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                {p}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
