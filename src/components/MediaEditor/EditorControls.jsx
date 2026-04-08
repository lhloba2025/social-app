import React from "react";
import { Slider } from "@/components/ui/slider";

export default function EditorControls({ edits, setEdits, isRtl }) {
  const updateEdit = (key, value) => {
    setEdits((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <h4 className="font-semibold text-white text-sm">
        {isRtl ? "أدوات التعديل" : "Edit Tools"}
      </h4>

      {/* Brightness */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">
          {isRtl ? "الإضاءة" : "Brightness"}: {Math.round(edits.brightness * 100)}%
        </label>
        <Slider
          value={[edits.brightness]}
          onValueChange={(value) => updateEdit("brightness", value[0])}
          min={0.5}
          max={2}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Contrast */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">
          {isRtl ? "التباين" : "Contrast"}: {Math.round(edits.contrast * 100)}%
        </label>
        <Slider
          value={[edits.contrast]}
          onValueChange={(value) => updateEdit("contrast", value[0])}
          min={0.5}
          max={2}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Rotation */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">
          {isRtl ? "الدوران" : "Rotation"}: {edits.rotate}°
        </label>
        <Slider
          value={[edits.rotate]}
          onValueChange={(value) => updateEdit("rotate", value[0])}
          min={0}
          max={360}
          step={15}
          className="w-full"
        />
      </div>

      {/* Flip/Flop */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => updateEdit("flip", !edits.flip)}
          className={`px-3 py-2 rounded text-xs font-semibold transition ${
            edits.flip
              ? "bg-indigo-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          {isRtl ? "قلب أفقي" : "Flip"}
        </button>
        <button
          onClick={() => updateEdit("flop", !edits.flop)}
          className={`px-3 py-2 rounded text-xs font-semibold transition ${
            edits.flop
              ? "bg-indigo-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          {isRtl ? "قلب عمودي" : "Flop"}
        </button>
      </div>
    </div>
  );
}