import React, { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

const PLATFORM_INFO = {
  facebook: { nameAr: "فيسبوك", emoji: "f", color: "#1877F2" },
  instagram: { nameAr: "انستقرام", emoji: "📸", color: "#E4405F" },
  twitter: { nameAr: "تويتر", emoji: "𝕏", color: "#1DA1F2" },
  tiktok: { nameAr: "تيك توك", emoji: "🎵", color: "#000000" },
  snapchat: { nameAr: "سناب شات", emoji: "👻", color: "#FFFC00" },
  youtube: { nameAr: "يوتيوب", emoji: "▶️", color: "#FF0000" },
  linkedin: { nameAr: "لينكدإن", emoji: "💼", color: "#0A66C2" },
};

export default function ConnectModal({
  isOpen,
  platform,
  onClose,
  onSave,
  isLoading,
}) {
  const [step, setStep] = useState(1); // 1: اسم المستخدم, 2: التحقق
  const [username, setUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  if (!isOpen || !platform) return null;

  const info = PLATFORM_INFO[platform];

  const handleGoToVerification = () => {
    if (!username.trim()) {
      setError("اسم المستخدم مطلوب");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setError("رمز التحقق مطلوب");
      return;
    }

    // في النسخة المحلية نتجاوز التحقق عبر LLM ونحفظ مباشرة
    alert("هذه الميزة غير متاحة في النسخة المحلية");
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: info.color + "20" }}
            >
              {info.emoji}
            </div>
            <div>
              <h3 className="font-bold text-white">ربط {info.nameAr}</h3>
              <p className="text-xs text-slate-400">
                {step === 1 ? "أدخل اسم حسابك" : "تحقق من ملكيتك"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            disabled={isLoading || verifying}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Username */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={platform === "twitter" ? "@username" : "username"}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                disabled={isLoading || verifying}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || verifying}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold transition disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleGoToVerification}
                disabled={isLoading || verifying || !username.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                التالي
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verification */}
        {step === 2 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="p-4 bg-amber-600/10 border border-amber-500/30 rounded-lg space-y-2">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-300">
                  <p className="font-semibold mb-1">للتحقق من ملكيتك:</p>
                  <p>
                    أضف هذا الرمز في <strong>السيرة الذاتية</strong> لحسابك على{" "}
                    {info.nameAr}:
                  </p>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-center font-mono text-indigo-400 break-all">
                @verified-{Math.random().toString(36).slice(2, 8)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                رمز التحقق
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="أدخل الرمز من سيرتك الذاتية"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                disabled={verifying}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError(null);
                  setVerificationCode("");
                }}
                disabled={verifying}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold transition disabled:opacity-50"
              >
                رجوع
              </button>
              <button
                type="submit"
                disabled={verifying || !verificationCode.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                تحقق الآن
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}