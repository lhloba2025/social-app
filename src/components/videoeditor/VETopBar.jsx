import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scissors, Trash2, Undo2, ZoomIn, ZoomOut, Download, Loader2, SlidersHorizontal } from "lucide-react";

function Btn({ icon, label, onClick, disabled, danger, kbd }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label ? `${label}${kbd ? ` (${kbd})` : ""}` : undefined}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition text-xs
        ${disabled ? "opacity-30 cursor-not-allowed text-[#777]" :
          danger ? "text-[#bbb] hover:text-red-400 hover:bg-red-400/10 cursor-pointer" :
          "text-[#bbb] hover:text-white hover:bg-[#252525] cursor-pointer"}`}
    >
      {icon}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-[#2a2a2a] mx-0.5" />;
}

export default function VETopBar({
  onSplit, onDelete, onUndo, onExport,
  canSplit, canDelete, canUndo,
  zoom, onZoomIn, onZoomOut,
  isExporting, exportProgress,
  showMixer, onToggleMixer,
  lang = "ar",
}) {
  const navigate = useNavigate();
  const ar = lang === "ar";
  const T = ar ? {
    back: "رجوع", undo: "تراجع", split: "قطع", delete: "حذف",
    mixer: "الميكسر", exporting: "جارٍ التصدير...", export: "تصدير",
  } : {
    back: "Back", undo: "Undo", split: "Split", delete: "Delete",
    mixer: "Mixer", exporting: "Exporting...", export: "Export",
  };
  return (
    <div className="h-12 flex items-center px-3 gap-1 bg-[#1a1a1a] border-b border-[#2a2a2a] flex-shrink-0 z-10">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#bbb] hover:text-white hover:bg-[#252525] transition text-xs mr-2"
      >
        <ArrowLeft size={13} />
        <span>{T.back}</span>
      </button>

      <Sep />
      <Btn icon={<Undo2 size={14} />} label={T.undo} kbd="Ctrl+Z" onClick={onUndo} disabled={!canUndo} />
      <Sep />
      <Btn icon={<Scissors size={14} />} label={T.split} kbd="S" onClick={onSplit} disabled={!canSplit} />
      <Btn icon={<Trash2 size={14} />} label={T.delete} kbd="Del" onClick={onDelete} disabled={!canDelete} danger />
      <Sep />
      <Btn icon={<ZoomOut size={14} />} onClick={onZoomOut} />
      <span className="text-[10px] text-[#999] w-10 text-center font-mono select-none">{Math.round(zoom)}</span>
      <Btn icon={<ZoomIn size={14} />} onClick={onZoomIn} />

      <Sep />
      <button
        onClick={onToggleMixer}
        title={T.mixer}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition
          ${showMixer
            ? "bg-[#b87ae8]/15 text-[#b87ae8] border border-[#b87ae8]/30"
            : "text-[#999] hover:text-white hover:bg-[#1e1e1e] border border-transparent"}`}
      >
        <SlidersHorizontal size={13} />
        <span className="text-[10px] font-semibold">{T.mixer}</span>
      </button>

      <div className="flex-1" />

      {/* Export progress bar */}
      {isExporting && (
        <div className="flex items-center gap-2 mr-3">
          <div className="w-32 h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00d4d4] transition-all duration-200 rounded-full"
              style={{ width: `${exportProgress ?? 0}%` }}
            />
          </div>
          <span className="text-[9px] text-[#00d4d4] font-mono w-8">{Math.round(exportProgress ?? 0)}%</span>
        </div>
      )}

      <button
        onClick={onExport}
        disabled={isExporting}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition
          ${isExporting
            ? "bg-[#1e1e1e] text-[#00d4d4] cursor-not-allowed"
            : "bg-[#00c4c4] hover:bg-[#00d4d4] text-black cursor-pointer"}`}
      >
        {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        {isExporting ? T.exporting : T.export}
      </button>
    </div>
  );
}
