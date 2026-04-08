import React from "react";
import { Unlink, Link as LinkIcon, Loader2 } from "lucide-react";

const PLATFORM_INFO = {
  facebook: { nameAr: "فيسبوك", color: "#1877F2", emoji: "f" },
  instagram: { nameAr: "انستقرام", color: "#E4405F", emoji: "📸" },
  twitter: { nameAr: "تويتر", color: "#1DA1F2", emoji: "𝕏" },
  tiktok: { nameAr: "تيك توك", color: "#000000", emoji: "🎵" },
  snapchat: { nameAr: "سناب شات", color: "#FFFC00", emoji: "👻" },
  youtube: { nameAr: "يوتيوب", color: "#FF0000", emoji: "▶️" },
  linkedin: { nameAr: "لينكدإن", color: "#0A66C2", emoji: "💼" },
};

export default function PlatformCard({
  platform,
  account,
  onConnect,
  onDisconnect,
  isLoading,
}) {
  const info = PLATFORM_INFO[platform];
  const isConnected = !!account;

  return (
    <div className="group bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700 rounded-2xl p-6 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300">
      {/* Platform header */}
      <div className="flex items-center gap-4 mb-5">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-lg group-hover:shadow-indigo-500/20 transition-all"
          style={{ backgroundColor: info.color + "25", borderColor: info.color + "40", border: "2px solid" }}
        >
          {info.emoji}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white text-lg">{info.nameAr}</h3>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                isConnected ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-slate-600"
              }`}
            />
            <span className="text-xs font-semibold">
              {isConnected ? (
                <span className="text-green-400">متصل</span>
              ) : (
                <span className="text-slate-400">غير متصل</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Connected account details */}
      {isConnected && account && (
        <div className="mb-5 space-y-4 pb-5 border-b border-slate-700/50">
          {account.profilePicture && (
            <img
              src={account.profilePicture}
              alt={account.username}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/30 shadow-lg"
            />
          )}
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-500 font-medium">اسم المستخدم</p>
              <p className="font-semibold text-white">@{account.username}</p>
            </div>
            {account.accountName && (
              <div>
                <p className="text-xs text-slate-500 font-medium">اسم الحساب</p>
                <p className="font-semibold text-white text-sm">{account.accountName}</p>
              </div>
            )}
            {account.followerCount !== undefined && (
              <div>
                <p className="text-xs text-slate-500 font-medium">المتابعون</p>
                <p className="font-semibold text-indigo-400">
                  {account.followerCount.toLocaleString("ar-SA")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={() =>
          isConnected ? onDisconnect(account) : onConnect(platform)
        }
        disabled={isLoading}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
          isConnected
            ? "bg-red-600/20 text-red-400 hover:bg-red-600/30 disabled:opacity-50 border border-red-600/30"
            : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isConnected ? (
          <>
            <Unlink className="w-4 h-4" />
            فصل الحساب
          </>
        ) : (
          <>
            <LinkIcon className="w-4 h-4" />
            ربط الحساب
          </>
        )}
      </button>
    </div>
  );
}