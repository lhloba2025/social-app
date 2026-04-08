import React, { useState, useRef, useEffect } from "react";
import { X, Loader2, Download, RotateCw, ZoomIn, ZoomOut, Copy } from "lucide-react";
import EditorCanvas from "./EditorCanvas";
import EditorControls from "./EditorControls";
import EditorLayers from "./EditorLayers";

export default function MediaEditor({
  isOpen,
  media,
  onClose,
  onSave,
  isLoading,
  language,
}) {
  const isRtl = language === "ar";
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(100);
  const [edits, setEdits] = useState({
    crop: null,
    brightness: 1,
    contrast: 1,
    rotate: 0,
    flip: false,
    flop: false,
    layers: [],
  });
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !media) return null;

  const handleZoom = (direction) => {
    setZoom((prev) =>
      direction === "in"
        ? Math.min(prev + 10, 200)
        : Math.max(prev - 10, 50)
    );
  };

  const handleReset = () => {
    setEdits({
      crop: null,
      brightness: 1,
      contrast: 1,
      rotate: 0,
      flip: false,
      flop: false,
      layers: [],
    });
    setZoom(100);
    setSelectedLayer(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `${media.name}-edited.png`, {
              type: "image/png",
            });

            const formData = new FormData();
            formData.append("file", file);
            formData.append("edits", JSON.stringify(edits));

            const response = await fetch("/api/editMedia", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");
            const result = await response.json();

            await onSave({
              ...media,
              url: result.url,
            });

            onClose();
          }
        }, "image/png");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(isRtl ? "فشل الحفظ" : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full h-[95vh] max-w-6xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800">
          <h3 className="font-bold text-white text-lg">
            {isRtl ? "محرر الوسائط الاحترافي" : "Professional Media Editor"}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden gap-4 p-4">
          {/* Canvas Area */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-lg">
              <button
                onClick={() => handleZoom("out")}
                className="p-2 hover:bg-slate-700 rounded transition"
                title={isRtl ? "تصغير" : "Zoom Out"}
              >
                <ZoomOut className="w-4 h-4 text-slate-300" />
              </button>
              <span className="text-sm text-slate-300 w-12 text-center">{zoom}%</span>
              <button
                onClick={() => handleZoom("in")}
                className="p-2 hover:bg-slate-700 rounded transition"
                title={isRtl ? "تكبير" : "Zoom In"}
              >
                <ZoomIn className="w-4 h-4 text-slate-300" />
              </button>
              <div className="flex-1" />
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 transition"
              >
                <RotateCw className="w-4 h-4" />
                {isRtl ? "إعادة تعيين" : "Reset"}
              </button>
            </div>

            {/* Canvas */}
            <EditorCanvas
              ref={canvasRef}
              media={media}
              edits={edits}
              zoom={zoom}
            />
          </div>

          {/* Sidebar */}
          <div className="w-80 flex flex-col gap-4 overflow-y-auto">
            {/* Controls */}
            <EditorControls
              edits={edits}
              setEdits={setEdits}
              isRtl={isRtl}
            />

            {/* Layers */}
            <EditorLayers
              layers={edits.layers}
              selectedLayer={selectedLayer}
              onSelectLayer={setSelectedLayer}
              onUpdateLayer={(id, updates) => {
                setEdits((prev) => ({
                  ...prev,
                  layers: prev.layers.map((l) =>
                    l.id === id ? { ...l, ...updates } : l
                  ),
                }));
              }}
              onDeleteLayer={(id) => {
                setEdits((prev) => ({
                  ...prev,
                  layers: prev.layers.filter((l) => l.id !== id),
                }));
              }}
              isRtl={isRtl}
            />

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition disabled:opacity-50 mt-auto"
            >
              {(saving || isLoading) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <Download className="w-4 h-4" />
              {isRtl ? "حفظ التعديلات" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}