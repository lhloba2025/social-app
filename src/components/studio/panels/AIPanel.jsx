import React from "react";
import { Wand2 } from "lucide-react";

export default function AIPanel({ language }) {
  const isRtl = language === "ar";

  return (
    <div className="space-y-4 text-xs">
      <div className="space-y-2">
        <label className="font-semibold" style={{ color: "var(--hv-text)" }}>
          {isRtl ? "توليد صور بالذكاء الاصطناعي" : "AI Image Generation"}
        </label>
        <div className="p-4 rounded-lg border text-center space-y-3" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
          <Wand2 className="w-8 h-8 mx-auto" style={{ color: "var(--hv-text-faint)" }} />
          <p style={{ color: "var(--hv-text-soft)" }}>
            {isRtl
              ? "هذه الميزة غير متاحة في النسخة المحلية"
              : "This feature is not available in the local version"}
          </p>
          <button
            onClick={() => alert("هذه الميزة غير متاحة في النسخة المحلية")}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg cursor-not-allowed text-xs"
            style={{ background: "rgba(79,70,229,0.08)", color: "var(--hv-text-faint)", border: "1px solid var(--hv-border)" }}
          >
            <Wand2 className="w-4 h-4" />
            {isRtl ? "غير متاح" : "Not Available"}
          </button>
        </div>
      </div>
    </div>
  );
}
