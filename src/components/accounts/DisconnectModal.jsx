import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function DisconnectModal({
  isOpen,
  account,
  onConfirm,
  onCancel,
  isLoading,
}) {
  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
        </div>

        {/* Content */}
        <h3 className="font-bold text-lg text-white text-center mb-2">
          فصل الحساب
        </h3>
        <p className="text-slate-300 text-center mb-6">
          هل أنت متأكد من فصل حساب <span className="font-semibold text-indigo-400">@{account.username}</span>؟
        </p>
        <p className="text-sm text-slate-400 text-center mb-6">
          لن تتمكن من نشر المحتوى على هذا الحساب إلى أن تقوم بربطه مجدداً.
        </p>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold transition disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            نعم، فصل الحساب
          </button>
        </div>
      </div>
    </div>
  );
}