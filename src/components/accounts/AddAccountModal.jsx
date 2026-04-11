import React, { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";

const PLATFORMS = [
  { id: "facebook",  nameAr: "فيسبوك",   nameEn: "Facebook",  color: "#1877F2", emoji: "f",  descAr: "ربط صفحة أو حساب فيسبوك",       descEn: "Connect a Facebook page or account" },
  { id: "instagram", nameAr: "انستقرام", nameEn: "Instagram", color: "#E4405F", emoji: "📸", descAr: "ربط حساب انستقرام البيزنس",       descEn: "Connect an Instagram business account" },
  { id: "tiktok",    nameAr: "تيك توك",  nameEn: "TikTok",    color: "#69C9D0", emoji: "♪",  descAr: "ربط حساب تيك توك للنشر",         descEn: "Connect a TikTok account for publishing" },
  { id: "snapchat",  nameAr: "سناب شات", nameEn: "Snapchat",  color: "#FFFC00", emoji: "👻", descAr: "ربط حساب سناب شات",              descEn: "Connect a Snapchat account" },
];

export default function AddAccountModal({ isOpen, onClose, onConnect, accountsByPlatform, ar = true }) {
  const [selected, setSelected] = useState(null);

  if (!isOpen) return null;

  const selectedInfo = PLATFORMS.find((p) => p.id === selected);
  const isAlreadyConnected = selected && !!accountsByPlatform?.[selected];

  const handleConnect = () => {
    if (!selected || isAlreadyConnected) return;
    onConnect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        dir={ar ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-gray-900 font-bold text-lg">
              {ar ? "ربط حساب سوشيال ميديا" : "Connect Social Media Account"}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {ar ? "اختر المنصة التي تريد ربطها" : "Choose a platform to connect"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Platform grid */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          {PLATFORMS.map((p) => {
            const connected = !!accountsByPlatform?.[p.id];
            const isSelected = selected === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                  ${isSelected
                    ? "border-indigo-500 bg-indigo-50 shadow-md"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
              >
                {connected && (
                  <CheckCircle2 className="absolute top-2 left-2 w-4 h-4 text-green-500" />
                )}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black"
                  style={{ backgroundColor: p.color + "20" }}
                >
                  <span style={{ color: p.color }}>{p.emoji}</span>
                </div>
                <span className="text-gray-800 font-semibold text-sm">{ar ? p.nameAr : p.nameEn}</span>
                {connected && (
                  <span className="text-[10px] text-green-600 font-medium">{ar ? "مرتبط" : "Connected"}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Description */}
        <div className="px-6 pb-4 min-h-[40px]">
          {selectedInfo && (
            <p className="text-gray-500 text-sm text-center">
              {isAlreadyConnected
                ? (ar ? `✅ حساب ${selectedInfo.nameAr} مرتبط بالفعل` : `✅ ${selectedInfo.nameEn} is already connected`)
                : (ar ? selectedInfo.descAr : selectedInfo.descEn)}
            </p>
          )}
        </div>

        {/* Connect button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleConnect}
            disabled={!selected || isAlreadyConnected}
            className="w-full py-3 rounded-2xl font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={selectedInfo && !isAlreadyConnected
              ? { backgroundColor: selectedInfo.color === "#FFFC00" ? "#FFFC00" : "#6366f1", color: selectedInfo.color === "#FFFC00" ? "#000" : "#fff" }
              : { backgroundColor: "#6366f1", color: "#fff" }}
          >
            {selected
              ? isAlreadyConnected
                ? (ar ? `${selectedInfo.nameAr} مرتبط بالفعل` : `${selectedInfo.nameEn} already connected`)
                : (ar ? `ربط ${selectedInfo.nameAr}` : `Connect ${selectedInfo.nameEn}`)
              : (ar ? "اختر منصة" : "Choose a platform")}
          </button>
        </div>
      </div>
    </div>
  );
}
