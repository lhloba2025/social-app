import React, { useState, useRef } from "react";

export default function TranscriptPanel({ videoRef, hasVideoClip }) {
  const [transcript, setTranscript] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");

  const handleGenerate = () => {
    alert("هذه الميزة غير متاحة في النسخة المحلية");
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return `${String(m).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const seekTo = (t) => {
    if (videoRef?.current) videoRef.current.currentTime = t;
  };

  const updateText = (id, text) => {
    setTranscript(p => p.map(s => s.id === id ? { ...s, text } : s));
  };

  const filtered = transcript.filter(s =>
    searchText === "" || s.text.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleExport = () => {
    const content = transcript.map(s => `[${formatTime(s.start)} - ${formatTime(s.end)}] ${s.text}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "transcript.txt";
    a.click();
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-white">
      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !hasVideoClip}
        className={`w-full py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2
          ${hasVideoClip ? "bg-[#00d4d4] hover:bg-[#00bfbf] text-black" : "bg-[#252525] text-[#555] cursor-not-allowed"}`}
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            جاري التحليل...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/>
            </svg>
            توليد النص التلقائي
          </>
        )}
      </button>

      {!hasVideoClip && (
        <p className="text-[11px] text-[#555] text-center">ارفع فيديو أولاً</p>
      )}

      {transcript.length > 0 && (
        <>
          {/* Search */}
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="بحث في النص..."
            className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#00d4d4]"
          />

          {/* Segments */}
          <div className="flex flex-col gap-1.5">
            {filtered.map(seg => (
              <div
                key={seg.id}
                className="bg-[#252525] border border-[#333] rounded-xl p-2.5 hover:border-[#00d4d4]/40 transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => seekTo(seg.start)}
                    className="text-[#00d4d4] text-[10px] font-mono hover:underline"
                  >
                    {formatTime(seg.start)} → {formatTime(seg.end)}
                  </button>
                  <button
                    onClick={() => setEditingId(editingId === seg.id ? null : seg.id)}
                    className="text-[#555] hover:text-white text-[10px]"
                  >
                    ✎
                  </button>
                </div>
                {editingId === seg.id ? (
                  <textarea
                    value={seg.text}
                    onChange={e => updateText(seg.id, e.target.value)}
                    rows={2}
                    className="w-full bg-[#1a1a1a] border border-[#00d4d4]/50 rounded-lg px-2 py-1 text-white text-xs resize-none outline-none"
                  />
                ) : (
                  <p className="text-white text-xs leading-relaxed">{seg.text}</p>
                )}
              </div>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="w-full py-2 rounded-xl bg-[#252525] hover:bg-[#2e2e2e] border border-[#333] text-white text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            تصدير النص (.txt)
          </button>
        </>
      )}
    </div>
  );
}