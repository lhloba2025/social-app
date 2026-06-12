import React from "react";
import { Unlink, Link as LinkIcon, Loader2, CheckCircle2 } from "lucide-react";

const PLATFORM_INFO = {
  facebook:  { nameAr: "فيسبوك",   nameEn: "Facebook",  color: "#1877F2", icon: "/icons/facebook.svg"  },
  instagram: { nameAr: "انستقرام", nameEn: "Instagram", color: "#E4405F", icon: "/icons/instagram.svg" },
  tiktok:    { nameAr: "تيك توك",  nameEn: "TikTok",    color: "#111111", icon: "/icons/tiktok.svg"    },
  snapchat:  { nameAr: "سناب شات", nameEn: "Snapchat",  color: "#F5C400", icon: "/icons/snapchat.svg"  },
  linkedin:  { nameAr: "لينكدإن",  nameEn: "LinkedIn",  color: "#0A66C2", icon: "/icons/linkedin.svg"  },
};

const PLATFORM_EMOJI = {
  facebook: "f",
  instagram: "📸",
  tiktok: "♪",
  snapchat: "👻",
  linkedin: "in",
};

export default function PlatformCard({ platform, account, onConnect, onDisconnect, isLoading, ar = true }) {
  const info = PLATFORM_INFO[platform];
  const isConnected = !!account;

  return (
    <div className="hv-card hv-card-hover relative p-5">

      {isConnected && (
        <span className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
          <CheckCircle2 className="w-3 h-3" />
          {ar ? "متصل" : "Connected"}
        </span>
      )}

      <div className="flex items-center gap-4 mb-4">
        {/* Platform icon */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
          style={{ backgroundColor: info.color + "14", border: `1.5px solid ${info.color}33` }}>
          <span style={{ color: info.color }}>{PLATFORM_EMOJI[platform]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-base" style={{ color: "var(--hv-text)" }}>{ar ? info.nameAr : info.nameEn}</h3>
          {isConnected && account.username && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--hv-text-soft)" }}>@{account.username}</p>
          )}
          {isConnected && account.followerCount !== undefined && (
            <p className="text-xs mt-0.5 font-bold" style={{ color: "var(--hv-primary)" }}>
              {account.followerCount.toLocaleString(ar ? "ar-SA" : "en-US")} {ar ? "متابع" : "followers"}
            </p>
          )}
          {!isConnected && (
            <p className="text-xs mt-0.5" style={{ color: "var(--hv-text-faint)" }}>{ar ? "غير مرتبط" : "Not connected"}</p>
          )}
        </div>
      </div>

      <button
        onClick={() => isConnected ? onDisconnect(account) : onConnect(platform)}
        disabled={isLoading}
        className={`w-full py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2
          ${isConnected
            ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
            : "border"}`}
        style={!isConnected ? { backgroundColor: info.color + "12", borderColor: info.color + "33", color: info.color } : {}}
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
