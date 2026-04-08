import React from "react";

export default function MediaPanel({ clips, activeClipId, onSelectClip, onUpload, fileInputRef }) {
  return (
    <div className="w-64 bg-[#1e1e1e] border-r border-[#2a2a2a] flex flex-col p-3 gap-3 flex-shrink-0">
      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#333] bg-[#252525] hover:bg-[#2e2e2e] transition text-[#00d4d4] font-semibold text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Upload
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => Array.from(e.target.files || []).forEach(onUpload)}
      />

      {/* Clips list */}
      {clips.length > 0 ? (
        <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
          {clips.map(clip => (
            <div
              key={clip.id}
              onClick={() => onSelectClip(clip.id)}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                activeClipId === clip.id ? "bg-[#00d4d4]/20 border border-[#00d4d4]/50" : "bg-[#252525] hover:bg-[#2e2e2e]"
              }`}
            >
              <div className="w-14 h-9 bg-[#333] rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                {clip.type === "video" ? (
                  <video src={clip.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={clip.url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 truncate font-medium">{clip.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {clip.duration ? `${Math.floor(clip.duration / 60)}:${String(Math.floor(clip.duration % 60)).padStart(2,'0')}` : "--:--"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-600 text-xs text-center px-4">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="2" y="2" width="20" height="20" rx="3"/>
            <polygon points="10 8 16 12 10 16 10 8"/>
          </svg>
          <span>Upload a video or image to start editing</span>
        </div>
      )}
    </div>
  );
}