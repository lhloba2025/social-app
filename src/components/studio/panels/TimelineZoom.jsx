import React from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Minimize } from "lucide-react";

export default function TimelineZoom({ zoom, onZoomChange, language }) {
  const isRtl = language === "ar";
  
  const zoomLevels = [50, 75, 100, 150, 200];
  
  return (
    <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-2">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => onZoomChange(Math.max(50, zoom - 25))}
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </Button>
      
      <div className="flex gap-1">
        {zoomLevels.map((level) => (
          <button
            key={level}
            onClick={() => onZoomChange(level)}
            className={`px-2 py-1 text-xs rounded transition ${
              zoom === level
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {level}%
          </button>
        ))}
      </div>
      
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => onZoomChange(100)}
      >
        <Minimize className="w-3.5 h-3.5" />
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => onZoomChange(Math.min(200, zoom + 25))}
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </Button>
      
      <span className="text-xs text-slate-400 min-w-12 text-center">
        {isRtl ? "تكبير" : "Zoom"}
      </span>
    </div>
  );
}