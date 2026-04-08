import React, { useState } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";

export default function EditorLayers({
  layers,
  selectedLayer,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  isRtl,
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddTextLayer = () => {
    const newLayer = {
      id: Date.now(),
      type: "text",
      content: isRtl ? "نص جديد" : "New text",
      x: 50,
      y: 50,
      fontSize: 24,
      color: "#ffffff",
      visible: true,
    };
    // Note: parent component should add this to layers array
    onSelectLayer(newLayer.id);
    setShowAddMenu(false);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white text-sm">
          {isRtl ? "الطبقات" : "Layers"}
        </h4>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="p-1 hover:bg-slate-700 rounded transition"
          title={isRtl ? "إضافة طبقة" : "Add layer"}
        >
          <Plus className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {showAddMenu && (
        <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-700">
          <button
            onClick={handleAddTextLayer}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold text-white transition"
          >
            {isRtl ? "+ نص" : "+ Text"}
          </button>
          <button
            disabled
            className="px-3 py-2 bg-slate-700 rounded text-xs font-semibold text-slate-500 cursor-not-allowed opacity-50"
          >
            {isRtl ? "+ شكل" : "+ Shape"}
          </button>
        </div>
      )}

      {/* Layers List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {layers.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            {isRtl ? "لا توجد طبقات" : "No layers"}
          </p>
        ) : (
          layers.map((layer) => (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`p-2 rounded cursor-pointer transition ${
                selectedLayer === layer.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {layer.type === "text" ? "📝" : "🔷"} {layer.content || "Layer"}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateLayer(layer.id, {
                      visible: !layer.visible,
                    });
                  }}
                  className="p-1 hover:bg-black/20 rounded transition"
                >
                  {layer.visible ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer(layer.id);
                  }}
                  className="p-1 hover:bg-red-600/20 rounded transition text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Layer Properties */}
      {selectedLayer && layers.find((l) => l.id === selectedLayer) && (
        <div className="pt-3 border-t border-slate-700 space-y-2">
          <p className="text-xs text-slate-400 font-semibold">
            {isRtl ? "خصائص الطبقة" : "Layer Properties"}
          </p>
          {/* Add property controls here if needed */}
        </div>
      )}
    </div>
  );
}