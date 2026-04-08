import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Film, Music, Image, X } from "lucide-react";

export default function MediaLibrary({ mediaItems, onAddMedia, onRemoveMedia, language }) {
  const isRtl = language === "ar";
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";
      onAddMedia({
        id: Math.random().toString(36).slice(2, 9),
        name: file.name,
        url,
        type,
        size: file.size,
      });
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "video": return <Film className="w-4 h-4" />;
      case "audio": return <Music className="w-4 h-4" />;
      case "image": return <Image className="w-4 h-4" />;
      default: return <Film className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {isRtl ? "مكتبة الوسائط" : "Media Library"}
        </h3>
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-1 h-7 text-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          {isRtl ? "استيراد" : "Import"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div 
        className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-indigo-500/50 transition cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-400">
          {isRtl ? "اسحب الملفات أو انقر للاستيراد" : "Drop files or click to import"}
        </p>
      </div>

      {mediaItems.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-slate-700/50 p-2 rounded text-xs hover:bg-slate-700 transition group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-slate-400">{getTypeIcon(item.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-slate-500 text-xs capitalize">{item.type}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition"
                onClick={() => onRemoveMedia(item.id)}
              >
                <X className="w-3.5 h-3.5 text-red-400" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}