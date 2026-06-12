import React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, MailPlus, BookImage, Share2, Sparkles, PenSquare, ArrowLeft, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    path: "/DesignStudio",
    titleAr: "منشئ التصاميم",
    titleEn: "Design Studio",
    descAr: "صمّم منشوراتك ورسوماتك للسوشيال ميديا باحترافية",
    descEn: "Design your posts and graphics for social media",
    Icon: LayoutGrid,
    grad: "linear-gradient(135deg,#6366f1,#4338ca)",
  },
  {
    path: "/ImageGen",
    titleAr: "توليد صورة بالذكاء",
    titleEn: "AI Image",
    descAr: "ولّد صوراً احترافية بالذكاء الاصطناعي بهوية علامتك",
    descEn: "Generate professional AI images with your brand",
    Icon: Sparkles,
    grad: "linear-gradient(135deg,#6366f1,#fb7185)",
  },
  {
    path: "/GreetingCards",
    titleAr: "بطاقات التهنئة",
    titleEn: "Greeting Cards",
    descAr: "ارفع قالباً وقائمة أسماء، وأصدِر بطاقات شخصية بالجملة",
    descEn: "Upload a template + names list, generate cards in bulk",
    Icon: MailPlus,
    grad: "linear-gradient(135deg,#fb7185,#f43f5e)",
  },
  {
    path: "/DesignLibraryPage",
    titleAr: "مكتبة التصاميم",
    titleEn: "Design Library",
    descAr: "استعرض وعدّل تصاميمك المحفوظة في أي وقت",
    descEn: "Browse and edit your saved designs",
    Icon: BookImage,
    grad: "linear-gradient(135deg,#8b5cf6,#6366f1)",
  },
  {
    path: "/PostComposer",
    titleAr: "إنشاء منشور",
    titleEn: "New Post",
    descAr: "اكتب منشورك، اختر التصميم والمنصات، وجدوله",
    descEn: "Write a post, pick design & platforms, schedule it",
    Icon: PenSquare,
    grad: "linear-gradient(135deg,#22d3ee,#3b82f6)",
  },
  {
    path: "/AccountsPage",
    titleAr: "ربط الحسابات",
    titleEn: "Connect Accounts",
    descAr: "اربط حساباتك على Instagram وTikTok وغيرها",
    descEn: "Connect your Instagram, TikTok and more",
    Icon: Share2,
    grad: "linear-gradient(135deg,#34d399,#0d9488)",
  },
];

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "Twitter", "Snapchat", "LinkedIn"];

export default function Dashboard({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const navigate = useNavigate();
  const Arrow = ar ? ArrowLeft : ArrowRight;

  return (
    <div dir={ar ? "rtl" : "ltr"} className="hv-page hv-app-bg">
      <div className="hv-page-inner">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl mb-9 p-8 md:p-10"
             style={{ background: "var(--hv-grad)" }}>
          <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full"
               style={{ background: "rgba(251,113,133,0.35)", filter: "blur(50px)" }} />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur ring-1 ring-white/25">
              <Sparkles className="w-3.5 h-3.5" /> {ar ? "استوديو المحتوى" : "Content Studio"}
            </span>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-white leading-tight">
              {ar ? "اصنع محتواك وانشره" : "Create & publish your content"}
              <br />
              <span className="text-white/85">{ar ? "من مكان واحد" : "all in one place"}</span>
            </h1>
            <p className="mt-3 text-white/80 text-sm md:text-base max-w-xl">
              {ar
                ? "صمّم، ولّد بالذكاء، جدول، وانشر على كل المنصات — بأدوات بسيطة وأنيقة."
                : "Design, generate with AI, schedule and publish across every platform — simple and elegant."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate("/DesignStudio")}
                      className="hv-btn bg-white text-indigo-700 hover:brightness-95 shadow-lg">
                <LayoutGrid className="w-4 h-4" /> {ar ? "ابدأ التصميم" : "Start designing"}
              </button>
              <button onClick={() => navigate("/ImageGen")}
                      className="hv-btn bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25 backdrop-blur">
                <Sparkles className="w-4 h-4" /> {ar ? "توليد بالذكاء" : "Generate with AI"}
              </button>
            </div>
          </div>
        </div>

        {/* Section title */}
        <div className="mb-4">
          <p className="hv-overline">{ar ? "الأدوات" : "Tools"}</p>
          <h2 className="hv-page-title mt-1">{ar ? "وش تبي تسوي اليوم؟" : "What do you want to do?"}</h2>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {FEATURES.map((f) => (
            <button
              key={f.path}
              onClick={() => navigate(f.path)}
              className={`hv-card hv-card-hover group relative flex items-start gap-4 p-5 ${ar ? "text-right" : "text-left"}`}
            >
              <div className="hv-icon-tile flex-shrink-0" style={{ background: f.grad }}>
                <f.Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold mb-1" style={{ color: "var(--hv-text)" }}>
                  {ar ? f.titleAr : f.titleEn}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--hv-text-soft)" }}>
                  {ar ? f.descAr : f.descEn}
                </p>
              </div>
              <Arrow className="w-5 h-5 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                     style={{ color: "var(--hv-primary)" }} />
            </button>
          ))}
        </div>

        {/* Supported Platforms */}
        <div className="hv-card p-6">
          <p className="hv-overline mb-3">{ar ? "المنصات المدعومة" : "Supported Platforms"}</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <span key={p} className="hv-chip">{p}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
