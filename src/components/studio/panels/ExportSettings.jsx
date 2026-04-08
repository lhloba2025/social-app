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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-start">
      <div className="w-64 h-full bg-slate-900 border-r border-slate-700 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            {isRtl ? "إعدادات التصدير" : "Export Settings"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings */}
        <div className="p-3 space-y-4">
          {/* Format */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">
              {isRtl ? "الصيغة" : "Format"}
            </label>
            <select
              value={settings.format}
              onChange={(e) =>
                setSettings({ ...settings, format: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white hover:border-slate-600 focus:border-indigo-500 outline-none transition"
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
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">
              {isRtl ? "الدقة" : "Resolution"}
            </label>
            <select
              value={settings.resolution}
              onChange={(e) =>
                setSettings({ ...settings, resolution: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white hover:border-slate-600 focus:border-indigo-500 outline-none transition"
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
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">
              {isRtl ? "معدل الإطارات" : "Frame Rate"}
            </label>
            <select
              value={settings.frameRate}
              onChange={(e) =>
                setSettings({ ...settings, frameRate: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white hover:border-slate-600 focus:border-indigo-500 outline-none transition"
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
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">
              {isRtl ? "معدل البت" : "Bitrate"}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={settings.bitrate}
                onChange={(e) =>
                  setSettings({ ...settings, bitrate: e.target.value })
                }
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white hover:border-slate-600 focus:border-indigo-500 outline-none transition"
              />
              <div className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-400 flex items-center">
                Mbps
              </div>
            </div>
          </div>

          {/* Audio */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">
              {isRtl ? "الصوت" : "Audio"}
            </label>
            <select
              value={settings.audio}
              onChange={(e) =>
                setSettings({ ...settings, audio: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white hover:border-slate-600 focus:border-indigo-500 outline-none transition"
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
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">
              {isRtl ? "مساحة اللون" : "Color Space"}
            </label>
            <select
              value={settings.colorSpace}
              onChange={(e) =>
                setSettings({ ...settings, colorSpace: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white hover:border-slate-600 focus:border-indigo-500 outline-none transition"
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
        <div className="border-t border-slate-700 p-3 space-y-2 sticky bottom-0 bg-slate-900">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-8 text-xs"
          >
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={() => onExport(settings)}
            className="w-full h-8 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
          >
            {isRtl ? "تصدير" : "Export"}
          </Button>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="border-t border-slate-700 p-3 space-y-2">
          <h3 className="text-xs font-bold text-slate-300 mb-2">
            {isRtl ? "اختصارات لوحة المفاتيح" : "Keyboard Shortcuts"}
          </h3>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Play / Pause</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">Space</kbd>
            </div>
            <div className="flex justify-between">
              <span>Rewind / Skip / Forward</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">J/K/L</kbd>
            </div>
            <div className="flex justify-between">
              <span>Step 1 Frame</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">←/→</kbd>
            </div>
            <div className="flex justify-between">
              <span>Step 10 Frames</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">Shift ←/→</kbd>
            </div>
            <div className="flex justify-between">
              <span>Tag In / Out</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">I/O</kbd>
            </div>
            <div className="flex justify-between">
              <span>Mark / Un-mark</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">M</kbd>
            </div>
            <div className="flex justify-between">
              <span>Copy / Cut / Paste</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">C/X/V</kbd>
            </div>
            <div className="flex justify-between">
              <span>Duplicate Clip</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">D</kbd>
            </div>
            <div className="flex justify-between">
              <span>Select All</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">A</kbd>
            </div>
            <div className="flex justify-between">
              <span>Delete</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">Del</kbd>
            </div>
            <div className="flex justify-between">
              <span>Undo / Redo</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">Z/Shift Z</kbd>
            </div>
            <div className="flex justify-between">
              <span>Zoom in / out on Timeline</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">+/-</kbd>
            </div>
            <div className="flex justify-between">
              <span>Snap</span>
              <kbd className="bg-slate-800 px-1 rounded text-slate-300">S</kbd>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="p-3 border-t border-slate-700">
          <Button
            onClick={onClose}
            className="w-full h-8 text-xs bg-slate-700 hover:bg-slate-600"
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