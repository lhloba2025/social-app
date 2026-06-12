import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function ExportSettings({ onClose, onExport, language }) {
  const isRtl = language === "ar";
  const [settings, setSettings] = useState({
    format: "h264_mp4",
    resolution: "1920x1080",
    frameRate: "24",
    bitrate: "48",
    audio: "aac_256",
    colorSpace: "rec709",
  });

  const FORMATS = [
    { id: "h264_mp4", label: "H.264 MP4" },
    { id: "h265_mp4", label: "H.265 MP4" },
    { id: "prores", label: "ProRes" },
    { id: "dnxhd", label: "DNxHD" },
  ];

  const RESOLUTIONS = [
    { id: "1280x720", label: "1280 x 720 (HD)" },
    { id: "1920x1080", label: "1920 x 1088 (HD)" },
    { id: "3840x2160", label: "3840 x 2160 (4K)" },
  ];

  const FRAME_RATES = [
    { id: "24", label: "24" },
    { id: "25", label: "25" },
    { id: "30", label: "30" },
    { id: "60", label: "60" },
  ];

  const AUDIO_OPTIONS = [
    { id: "aac_128", label: "AAC 128kbps" },
    { id: "aac_256", label: "AAC 256kbps" },
    { id: "aac_320", label: "AAC 320kbps" },
  ];

  const COLOR_SPACES = [
    { id: "rec709", label: "Rec 709" },
    { id: "rec2020", label: "Rec 2020" },
    { id: "srgb", label: "sRGB" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-start">
      <div className="w-64 h-full bg-white border-r overflow-y-auto" style={{ borderColor: "var(--hv-border)" }}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-3 flex items-center justify-between" style={{ borderColor: "var(--hv-border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--hv-text)" }}>
            {isRtl ? "إعدادات التصدير" : "Export Settings"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition"
            style={{ color: "var(--hv-text-soft)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings */}
        <div className="p-3 space-y-4">
          {/* Format */}
          <div>
            <label className="text-xs font-semibold uppercase block mb-1" style={{ color: "var(--hv-text-soft)" }}>
              {isRtl ? "الصيغة" : "Format"}
            </label>
            <select
              value={settings.format}
              onChange={(e) =>
                setSettings({ ...settings, format: e.target.value })
              }
              className="hv-input w-full rounded px-2 py-1.5 text-xs"
            >
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-xs font-semibold uppercase block mb-1" style={{ color: "var(--hv-text-soft)" }}>
              {isRtl ? "الدقة" : "Resolution"}
            </label>
            <select
              value={settings.resolution}
              onChange={(e) =>
                setSettings({ ...settings, resolution: e.target.value })
              }
              className="hv-input w-full rounded px-2 py-1.5 text-xs"
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Frame Rate */}
          <div>
            <label className="text-xs font-semibold uppercase block mb-1" style={{ color: "var(--hv-text-soft)" }}>
              {isRtl ? "معدل الإطارات" : "Frame Rate"}
            </label>
            <select
              value={settings.frameRate}
              onChange={(e) =>
                setSettings({ ...settings, frameRate: e.target.value })
              }
              className="hv-input w-full rounded px-2 py-1.5 text-xs"
            >
              {FRAME_RATES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bitrate */}
          <div>
            <label className="text-xs font-semibold uppercase block mb-1" style={{ color: "var(--hv-text-soft)" }}>
              {isRtl ? "معدل البت" : "Bitrate"}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={settings.bitrate}
                onChange={(e) =>
                  setSettings({ ...settings, bitrate: e.target.value })
                }
                className="hv-input flex-1 rounded px-2 py-1.5 text-xs"
              />
              <div className="bg-[var(--hv-surface-2)] border rounded px-2 py-1.5 text-xs flex items-center" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}>
                Mbps
              </div>
            </div>
          </div>

          {/* Audio */}
          <div>
            <label className="text-xs font-semibold uppercase block mb-1" style={{ color: "var(--hv-text-soft)" }}>
              {isRtl ? "الصوت" : "Audio"}
            </label>
            <select
              value={settings.audio}
              onChange={(e) =>
                setSettings({ ...settings, audio: e.target.value })
              }
              className="hv-input w-full rounded px-2 py-1.5 text-xs"
            >
              {AUDIO_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color Space */}
          <div>
            <label className="text-xs font-semibold uppercase block mb-1" style={{ color: "var(--hv-text-soft)" }}>
              {isRtl ? "مساحة اللون" : "Color Space"}
            </label>
            <select
              value={settings.colorSpace}
              onChange={(e) =>
                setSettings({ ...settings, colorSpace: e.target.value })
              }
              className="hv-input w-full rounded px-2 py-1.5 text-xs"
            >
              {COLOR_SPACES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="border-t p-3 space-y-2 sticky bottom-0 bg-white" style={{ borderColor: "var(--hv-border)" }}>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-8 text-xs"
          >
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={() => onExport(settings)}
            className="w-full h-8 text-xs hv-btn hv-btn-primary"
          >
            {isRtl ? "تصدير" : "Export"}
          </Button>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="border-t p-3 space-y-2" style={{ borderColor: "var(--hv-border)" }}>
          <h3 className="text-xs font-bold mb-2" style={{ color: "var(--hv-text)" }}>
            {isRtl ? "اختصارات لوحة المفاتيح" : "Keyboard Shortcuts"}
          </h3>
          <div className="space-y-1 text-xs" style={{ color: "var(--hv-text-soft)" }}>
            <div className="flex justify-between">
              <span>Play / Pause</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>Space</kbd>
            </div>
            <div className="flex justify-between">
              <span>Rewind / Skip / Forward</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>J/K/L</kbd>
            </div>
            <div className="flex justify-between">
              <span>Step 1 Frame</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>←/→</kbd>
            </div>
            <div className="flex justify-between">
              <span>Step 10 Frames</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>Shift ←/→</kbd>
            </div>
            <div className="flex justify-between">
              <span>Tag In / Out</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>I/O</kbd>
            </div>
            <div className="flex justify-between">
              <span>Mark / Un-mark</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>M</kbd>
            </div>
            <div className="flex justify-between">
              <span>Copy / Cut / Paste</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>C/X/V</kbd>
            </div>
            <div className="flex justify-between">
              <span>Duplicate Clip</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>D</kbd>
            </div>
            <div className="flex justify-between">
              <span>Select All</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>A</kbd>
            </div>
            <div className="flex justify-between">
              <span>Delete</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>Del</kbd>
            </div>
            <div className="flex justify-between">
              <span>Undo / Redo</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>Z/Shift Z</kbd>
            </div>
            <div className="flex justify-between">
              <span>Zoom in / out on Timeline</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>+/-</kbd>
            </div>
            <div className="flex justify-between">
              <span>Snap</span>
              <kbd className="bg-[var(--hv-surface-2)] border px-1 rounded" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text)" }}>S</kbd>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="p-3 border-t" style={{ borderColor: "var(--hv-border)" }}>
          <Button
            onClick={onClose}
            className="w-full h-8 text-xs hv-btn hv-btn-ghost"
          >
            {isRtl ? "إغلاق" : "Close"}
          </Button>
        </div>
      </div>

      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
