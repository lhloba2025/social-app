import React from "react";
import { Button } from "@/components/ui/button";
import { Keyboard, X } from "lucide-react";

export default function KeyboardShortcuts({ onClose, language }) {
  const isRtl = language === "ar";
  
  const shortcuts = [
    { key: "Space", action: isRtl ? "تشغيل/إيقاف" : "Play/Pause" },
    { key: "K", action: isRtl ? "تشغيل/إيقاف" : "Play/Pause" },
    { key: "J", action: isRtl ? "ترجيع" : "Rewind" },
    { key: "L", action: isRtl ? "تقديم" : "Fast Forward" },
    { key: "←", action: isRtl ? "إطار للخلف" : "Frame backward" },
    { key: "→", action: isRtl ? "إطار للأمام" : "Frame forward" },
    { key: "Home", action: isRtl ? "بداية الفيديو" : "Go to start" },
    { key: "End", action: isRtl ? "نهاية الفيديو" : "Go to end" },
    { key: "S", action: isRtl ? "قص عند المؤشر" : "Split at playhead" },
    { key: "Ctrl+Z", action: isRtl ? "تراجع" : "Undo" },
    { key: "Ctrl+Y", action: isRtl ? "إعادة" : "Redo" },
    { key: "Delete", action: isRtl ? "حذف المحدد" : "Delete selected" },
    { key: "Ctrl+D", action: isRtl ? "تكرار" : "Duplicate" },
    { key: "M", action: isRtl ? "إضافة علامة" : "Add marker" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl p-6 w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg">
              {isRtl ? "اختصارات لوحة المفاتيح" : "Keyboard Shortcuts"}
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-slate-700/50 p-2 rounded-lg"
            >
              <span className="text-sm text-slate-300">{shortcut.action}</span>
              <kbd className="px-2 py-1 bg-slate-900 rounded text-xs font-mono text-indigo-400 border border-slate-600">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}