import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, EyeOff, Volume2, VolumeX, GripVertical } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export default function MultiTrackLayers({ tracks, onAddTrack, onUpdateTrack, onDeleteTrack, language }) {
  const isRtl = language === "ar";
  const [draggedTrack, setDraggedTrack] = useState(null);

  const TRACK_TYPES = [
    { id: "video", nameAr: "فيديو", nameEn: "Video", icon: "🎬" },
    { id: "audio", nameAr: "صوت", nameEn: "Audio", icon: "🎵" },
    { id: "text", nameAr: "نص", nameEn: "Text", icon: "📝" },
  ];

  const handleDragStart = (e, trackId) => {
    setDraggedTrack(trackId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetTrackId) => {
    e.preventDefault();
    if (draggedTrack && draggedTrack !== targetTrackId) {
      // إعادة ترتيب الطبقات
      const draggedIndex = tracks.findIndex(t => t.id === draggedTrack);
      const targetIndex = tracks.findIndex(t => t.id === targetTrackId);
      
      const newTracks = [...tracks];
      [newTracks[draggedIndex], newTracks[targetIndex]] = [newTracks[targetIndex], newTracks[draggedIndex]];
      
      // يمكن تحديث الحالة من الأب
      tracks.forEach((t, i) => onUpdateTrack(t.id, { zIndex: tracks.length - i }));
    }
    setDraggedTrack(null);
  };

  return (
    <div className="space-y-3">
      {/* أزرار إضافة مسار */}
      <div className="grid grid-cols-3 gap-1">
        {TRACK_TYPES.map((type) => (
          <Button
            key={type.id}
            onClick={() => onAddTrack(type.id)}
            size="sm"
            className="text-xs gap-1 bg-slate-700 hover:bg-slate-600"
          >
            <span>{type.icon}</span>
            {isRtl ? type.nameAr : type.nameEn}
          </Button>
        ))}
      </div>

      {/* قائمة المسارات */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            {isRtl ? "لم تضف أي مسارات بعد" : "No tracks added"}
          </div>
        ) : (
          tracks.map((track, idx) => (
            <div
              key={track.id}
              draggable
              onDragStart={(e) => handleDragStart(e, track.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, track.id)}
              className={`bg-slate-700 p-3 rounded-lg border-2 transition ${
                draggedTrack === track.id
                  ? "border-indigo-500 opacity-50"
                  : "border-transparent hover:border-slate-600"
              }`}
            >
              {/* رأس المسار */}
              <div className="flex items-center gap-2 mb-2">
                <GripVertical className="w-4 h-4 text-slate-500 cursor-grab active:cursor-grabbing" />
                <span className="text-xs font-semibold text-white flex-1">
                  {isRtl ? `المسار ${idx + 1}` : `Track ${idx + 1}`} - {track.type === "video" ? "🎬" : track.type === "audio" ? "🎵" : "📝"}
                </span>
                
                {/* أزرار الرؤية والحذف */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => onUpdateTrack(track.id, { visible: !track.visible })}
                >
                  {track.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                  onClick={() => onDeleteTrack(track.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* مستوى الصوت للفيديو والصوت */}
              {(track.type === "audio" || track.type === "video") && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Volume2 className="w-3 h-3" />
                    <span className="text-slate-300">{track.volume || 100}%</span>
                  </div>
                  <Slider
                    value={[track.volume || 100]}
                    onValueChange={(val) => onUpdateTrack(track.id, { volume: val[0] })}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              )}

              {/* معاينة أو تفاصيل المسار */}
              {track.file && (
                <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs text-slate-400 truncate">
                  {track.file.name || `${track.type} file`}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* معلومات */}
      <div className="text-xs text-slate-400 p-2 bg-slate-800/30 rounded">
        {isRtl ? "رتب الطبقات بسحبها - المسار العلوي يظهر أولاً" : "Drag to reorder layers - top track shows first"}
      </div>
    </div>
  );
}