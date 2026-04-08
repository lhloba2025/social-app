import React, { useRef } from "react";

export default function VideoPreview({ isPlaying, currentTime, duration, clips, onAddClip }) {
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAddClip({ id: Date.now(), name: file.name, url, duration: 8 });
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#111]">
      {/* Media panel on the left */}
      <div className="w-72 bg-[#1e1e1e] border-r border-[#2a2a2a] flex flex-col p-3 gap-3 flex-shrink-0">
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
        <input ref={fileInputRef} type="file" accept="video/*,image/*" className="hidden" onChange={handleUpload} />

        {/* View toggle */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center py-2 rounded-lg bg-[#252525] hover:bg-[#2e2e2e] text-slate-400 hover:text-white transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><path d="M7 7V5a2 2 0 0 1 4 0v2"/>
            </svg>
          </button>
          <button className="flex-1 flex items-center justify-center py-2 rounded-lg bg-[#252525] hover:bg-[#2e2e2e] text-slate-400 hover:text-white transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
          </button>
        </div>

        {/* Clips list */}
        {clips.length > 0 ? (
          <div className="flex flex-col gap-2 overflow-y-auto">
            {clips.map(clip => (
              <div key={clip.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#252525] hover:bg-[#2e2e2e] transition cursor-pointer">
                <div className="w-12 h-8 bg-[#333] rounded flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#888"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <span className="text-xs text-slate-300 truncate">{clip.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-600 text-xs">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
            <span>Upload media to start</span>
          </div>
        )}
      </div>

      {/* Video preview center */}
      <div className="flex-1 flex items-center justify-center bg-[#111] relative">
        {clips.length > 0 ? (
          <video
            src={clips[clips.length - 1].url}
            className="max-h-full max-w-full rounded"
            controls={false}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-600">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
            <span className="text-sm">No media added</span>
          </div>
        )}
      </div>
    </div>
  );
}