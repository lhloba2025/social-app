import React from "react";
import { Unlink, Link as LinkIcon, Loader2, CheckCircle2 } from "lucide-react";

const PLATFORM_INFO = {
  facebook:  { nameAr: "فيسبوك",   nameEn: "Facebook",  color: "#1877F2", bg: "#1877F215", icon: "/icons/facebook.svg"  },
  instagram: { nameAr: "انستقرام", nameEn: "Instagram", color: "#E4405F", bg: "#E4405F15", icon: "/icons/instagram.svg" },
  tiktok:    { nameAr: "تيك توك",  nameEn: "TikTok",    color: "#ffffff", bg: "#ffffff10", icon: "/icons/tiktok.svg"    },
  snapchat:  { nameAr: "سناب شات", nameEn: "Snapchat",  color: "#FFFC00", bg: "#FFFC0015", icon: "/icons/snapchat.svg"  },
};

const PLATFORM_EMOJI = {
  facebook: "f",
  instagram: "📸",
  tiktok: "♪",
  snapchat: "👻",
};

export default function PlatformCard({ platform, account, onConnect, onDisconnect, isLoading, ar = true }) {
  const info = PLATFORM_INFO[platform];
  const isConnected = !!account;

  return (
    <div className={`relative rounded-2xl border p-5 transition-all duration-300
      ${isConnected
        ? "bg-slate-800/80 border-slate-700"
        : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"}`}>

      {isConnected && (
        <span className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
          <CheckCircle2 className="w-3 h-3" />
          {ar ? "متصل" : "Connected"}
        </span>
      )}

      <div className="flex items-center gap-4 mb-4">
        {/* Platform icon */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
          style={{ backgroundColor: info.bg, border: `1.5px solid ${info.color}30` }}>
          <span style={{ color: info.color }}>{PLATFORM_EMOJI[platform]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-base">{ar ? info.nameAr : info.nameEn}</h3>
          {isConnected && account.username && (
            <p className="text-slate-400 text-xs truncate mt-0.5">@{account.username}</p>
          )}
          {isConnected && account.followerCount !== undefined && (
            <p className="text-indigo-400 text-xs mt-0.5 font-semibold">
              {account.followerCount.toLocaleString(ar ? "ar-SA" : "en-US")} {ar ? "متابع" : "followers"}
            </p>
          )}
          {!isConnected && (
            <p className="text-slate-500 text-xs mt-0.5">{ar ? "غير مرتبط" : "Not connected"}</p>
          )}
        </div>
      </div>

      <button
        onClick={() => isConnected ? onDisconnect(account) : onConnect(platform)}
        disabled={isLoading}
        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2
          ${isConnected
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            : "text-white border"}`}
        style={!isConnected ? { backgroundColor: info.color + "20", borderColor: info.color + "40", color: info.color } : {}}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isConnected ? (
          <><Unlink className="w-3.5 h-3.5" /> {ar ? "فصل الحساب" : "Disconnect"}</>
        ) : (
          <><LinkIcon className="w-3.5 h-3.5" /> {ar ? "ربط الحساب" : "Connect"}</>
        )}
      </button>
    </div>
  );
}
