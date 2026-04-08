import React from "react";
import { Wand2 } from "lucide-react";

export default function AIPanel({ language }) {
  const isRtl = language === "ar";

  return (
    <div className="space-y-4 text-xs">
      <div className="space-y-2">
        <label className="text-slate-300 font-semibold">
          {isRtl ? "توليد صور بالذكاء الاصطناعي" : "AI Image Generation"}
        </label>
        <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600 text-center space-y-3">
          <Wand2 className="w-8 h-8 mx-auto text-slate-500" />
          <p className="text-slate-400">
            {isRtl
              ? "هذه الميزة غير متاحة في النسخة المحلية"
              : "This feature is not available in the local version"}
          </p>
          <button
            onClick={() => alert("هذه الميزة غير متاحة في النسخة المحلية")}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600/50 text-slate-300 cursor-not-allowed text-xs"
          >
            <Wand2 className="w-4 h-4" />
            {isRtl ? "غير متاح" : "Not Available"}
          </button>
        </div>
      </div>
    </div>
  );
}
