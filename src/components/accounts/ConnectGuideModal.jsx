import React, { useState } from "react";
import { X, ExternalLink, Copy, CheckCheck, ChevronRight } from "lucide-react";

const RAILWAY = "https://social-app-production-7cfd.up.railway.app";

const GUIDES = {
  facebook: {
    nameAr:  "فيسبوك",
    nameEn:  "Facebook",
    color:   "#1877F2",
    devLink: "https://developers.facebook.com/apps",
    envVar:  "VITE_META_APP_ID",
    callbackUrl: `${RAILWAY}/auth/meta/callback`,
    stepsAr: [
      { title: "افتح بوابة Meta للمطورين", desc: "اضغط على الزر أدناه لفتح صفحة إنشاء التطبيق" },
      { title: "أنشئ تطبيقاً جديداً", desc: 'اختر نوع "Business" ثم أكمل إنشاء التطبيق' },
      { title: "أضف منتج Facebook Login", desc: 'من قائمة المنتجات اختر "Facebook Login" وأضفه للتطبيق' },
      { title: "أضف رابط الـ Callback", desc: 'في إعدادات Facebook Login → Valid OAuth Redirect URIs أضف الرابط أدناه' },
      { title: "انسخ App ID", desc: 'من Settings → Basic انسخ App ID وحطه في ملف .env.local كـ VITE_META_APP_ID' },
    ],
    stepsEn: [
      { title: "Open Meta Developer Portal", desc: "Click the button below to open the app creation page" },
      { title: "Create a new app", desc: 'Choose "Business" type then complete the app setup' },
      { title: "Add Facebook Login product", desc: 'From the products list choose "Facebook Login" and add it' },
      { title: "Add Callback URL", desc: 'In Facebook Login settings → Valid OAuth Redirect URIs add the URL below' },
      { title: "Copy App ID", desc: 'From Settings → Basic copy the App ID and add it to .env.local as VITE_META_APP_ID' },
    ],
    railwayVars: [
      { key: "META_APP_ID",      valAr: "App ID من المطور",      valEn: "App ID from developer portal" },
      { key: "META_APP_SECRET",  valAr: "App Secret من المطور",  valEn: "App Secret from developer portal" },
      { key: "META_REDIRECT_URI", valAr: `${RAILWAY}/auth/meta/callback`, valEn: `${RAILWAY}/auth/meta/callback` },
    ],
  },
  instagram: {
    nameAr:  "انستقرام",
    nameEn:  "Instagram",
    color:   "#E4405F",
    devLink: "https://developers.facebook.com/apps",
    envVar:  "VITE_META_APP_ID",
    callbackUrl: `${RAILWAY}/auth/meta/callback`,
    stepsAr: [
      { title: "افتح بوابة Meta للمطورين", desc: "انستقرام يستخدم نفس تطبيق فيسبوك (Meta)" },
      { title: "أنشئ تطبيقاً جديداً", desc: 'اختر نوع "Business"' },
      { title: "أضف Instagram Graph API", desc: 'من المنتجات أضف "Instagram Graph API" أو "Instagram Basic Display"' },
      { title: "أضف رابط الـ Callback", desc: "أضف الرابط أدناه في إعدادات OAuth Redirect URIs" },
      { title: "انسخ App ID", desc: 'انسخ App ID وحطه في .env.local كـ VITE_META_APP_ID (نفس فيسبوك)' },
    ],
    stepsEn: [
      { title: "Open Meta Developer Portal", desc: "Instagram uses the same Meta app as Facebook" },
      { title: "Create a new app", desc: 'Choose "Business" type' },
      { title: "Add Instagram Graph API", desc: 'From products add "Instagram Graph API" or "Instagram Basic Display"' },
      { title: "Add Callback URL", desc: "Add the URL below in OAuth Redirect URIs settings" },
      { title: "Copy App ID", desc: 'Copy the App ID and add it to .env.local as VITE_META_APP_ID (same as Facebook)' },
    ],
    railwayVars: [
      { key: "META_APP_ID",      valAr: "App ID من المطور",      valEn: "App ID from developer portal" },
      { key: "META_APP_SECRET",  valAr: "App Secret من المطور",  valEn: "App Secret from developer portal" },
      { key: "META_REDIRECT_URI", valAr: `${RAILWAY}/auth/meta/callback`, valEn: `${RAILWAY}/auth/meta/callback` },
    ],
  },
  tiktok: {
    nameAr:  "تيك توك",
    nameEn:  "TikTok",
    color:   "#69C9D0",
    devLink: "https://developers.tiktok.com",
    envVar:  "VITE_TIKTOK_CLIENT_KEY",
    callbackUrl: `${RAILWAY}/auth/tiktok/callback`,
    stepsAr: [
      { title: "افتح بوابة TikTok للمطورين", desc: "اضغط على الزر أدناه للتسجيل كمطور" },
      { title: "أنشئ تطبيقاً جديداً", desc: 'اختر "Web" كنوع التطبيق' },
      { title: "فعّل Content Posting API", desc: "أضف صلاحيات: user.info.basic, video.publish, video.upload" },
      { title: "أضف رابط الـ Callback", desc: "في إعدادات التطبيق أضف الرابط أدناه في Redirect URI" },
      { title: "انسخ Client Key", desc: 'انسخ Client Key وحطه في .env.local كـ VITE_TIKTOK_CLIENT_KEY' },
    ],
    stepsEn: [
      { title: "Open TikTok Developer Portal", desc: "Click the button below to register as a developer" },
      { title: "Create a new app", desc: 'Choose "Web" as the app type' },
      { title: "Enable Content Posting API", desc: "Add permissions: user.info.basic, video.publish, video.upload" },
      { title: "Add Callback URL", desc: "In app settings add the URL below as Redirect URI" },
      { title: "Copy Client Key", desc: 'Copy the Client Key and add it to .env.local as VITE_TIKTOK_CLIENT_KEY' },
    ],
    railwayVars: [
      { key: "TIKTOK_CLIENT_KEY",    valAr: "Client Key من المطور",    valEn: "Client Key from developer portal" },
      { key: "TIKTOK_CLIENT_SECRET", valAr: "Client Secret من المطور", valEn: "Client Secret from developer portal" },
      { key: "TIKTOK_REDIRECT_URI",  valAr: `${RAILWAY}/auth/tiktok/callback`, valEn: `${RAILWAY}/auth/tiktok/callback` },
    ],
  },
  snapchat: {
    nameAr:  "سناب شات",
    nameEn:  "Snapchat",
    color:   "#FFFC00",
    devLink: "https://kit.snapchat.com/manage",
    envVar:  "VITE_SNAP_CLIENT_ID",
    callbackUrl: `${RAILWAY}/auth/snapchat/callback`,
    stepsAr: [
      { title: "افتح Snap Kit", desc: "اضغط على الزر أدناه للدخول لمنصة المطورين" },
      { title: "أنشئ تطبيقاً جديداً", desc: 'اختر "Snap Kit" كنوع التطبيق' },
      { title: "فعّل Login Kit", desc: "أضف Login Kit للتطبيق وطلب الصلاحيات المطلوبة" },
      { title: "أضف رابط الـ Callback", desc: "أضف الرابط أدناه في Redirect URIs" },
      { title: "انسخ Client ID", desc: 'انسخ Client ID وحطه في .env.local كـ VITE_SNAP_CLIENT_ID' },
    ],
    stepsEn: [
      { title: "Open Snap Kit", desc: "Click the button below to access the developer platform" },
      { title: "Create a new app", desc: 'Choose "Snap Kit" as the app type' },
      { title: "Enable Login Kit", desc: "Add Login Kit to the app and request the required permissions" },
      { title: "Add Callback URL", desc: "Add the URL below in Redirect URIs" },
      { title: "Copy Client ID", desc: 'Copy the Client ID and add it to .env.local as VITE_SNAP_CLIENT_ID' },
    ],
    railwayVars: [
      { key: "SNAP_CLIENT_ID",     valAr: "Client ID من المطور",     valEn: "Client ID from developer portal" },
      { key: "SNAP_CLIENT_SECRET", valAr: "Client Secret من المطور", valEn: "Client Secret from developer portal" },
      { key: "SNAP_REDIRECT_URI",  valAr: `${RAILWAY}/auth/snapchat/callback`, valEn: `${RAILWAY}/auth/snapchat/callback` },
    ],
  },
};

function CopyButton({ text, ar }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition shrink-0"
      title={ar ? "نسخ" : "Copy"}
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function ConnectGuideModal({ platform, onClose, ar = true }) {
  if (!platform) return null;
  const guide = GUIDES[platform];
  if (!guide) return null;

  const steps = ar ? guide.stepsAr : guide.stepsEn;
  const name  = ar ? guide.nameAr  : guide.nameEn;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        dir={ar ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: `2px solid ${guide.color}30`, background: `${guide.color}08` }}
        >
          <div>
            <h2 className="text-white font-bold text-lg">
              {ar ? `ربط حساب ${name}` : `Connect ${name} Account`}
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {ar ? "اتبع الخطوات لإعداد الاتصال" : "Follow the steps to set up the connection"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Open developer portal button */}
          <a
            href={guide.devLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm transition"
            style={{ backgroundColor: guide.color, color: guide.color === "#FFFC00" ? "#000" : "#fff" }}
          >
            <ExternalLink className="w-4 h-4" />
            {ar ? `افتح منصة مطوري ${name}` : `Open ${name} Developer Portal`}
          </a>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: guide.color + "25", color: guide.color }}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{step.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Callback URL */}
          <div className="bg-slate-900 rounded-2xl p-4 space-y-2">
            <p className="text-slate-400 text-xs font-semibold">
              {ar ? "رابط الـ Callback (أضفه في المنصة):" : "Callback URL (add it to the platform):"}
            </p>
            <div className="flex items-center gap-2">
              <code className="text-green-400 text-xs flex-1 break-all">{guide.callbackUrl}</code>
              <CopyButton text={guide.callbackUrl} ar={ar} />
            </div>
          </div>

          {/* Environment variables */}
          <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
            <p className="text-slate-400 text-xs font-semibold">
              {ar ? "أضف هذه المتغيرات في Railway وفي .env.local:" : "Add these variables to Railway and .env.local:"}
            </p>
            {guide.railwayVars.map((v) => (
              <div key={v.key} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <code className="text-indigo-400 text-xs font-bold">{v.key}</code>
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span className="text-slate-500 text-xs">{ar ? v.valAr : v.valEn}</span>
                  </div>
                </div>
                <CopyButton text={v.key} ar={ar} />
              </div>
            ))}
          </div>

          <p className="text-slate-500 text-xs text-center">
            {ar
              ? "بعد إضافة المتغيرات أعد تشغيل الـ dev server وجرب الربط مجدداً"
              : "After adding the variables, restart the dev server and try connecting again"}
          </p>
        </div>
      </div>
    </div>
  );
}
