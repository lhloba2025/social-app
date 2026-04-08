import React, { useRef, useState, useCallback, useEffect } from "react";

function formatTimeShort(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export default function VideoTimeline({ clips, activeClipId, onSelectClip, currentTime, duration, onSeek, onTrim }) {
  const rulerRef = useRef(null);
  const trackRef = useRef(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [trimDrag, setTrimDrag] = useState(null); // { clipId, side: 'start'|'end', startX, origTrim }
  const [zoom, setZoom] = useState(1); // 1 = fit all clips

  const totalDur = Math.max(duration, clips.reduce((a, c) => a + (c.duration || 0), 0), 10);
  const visibleDur = totalDur / zoom;

  const timeToPercent = (t) => (t / visibleDur) * 100;

  // --- Ruler marks ---
  const rulerMarks = [];
  const step = visibleDur <= 30 ? 3 : visibleDur <= 120 ? 10 : 30;
  for (let t = 0; t <= visibleDur; t += step) rulerMarks.push(t);

  // --- Ruler click / drag for seek ---
  const getTimeFromEvent = (e) => {
    const rect = (rulerRef.current || trackRef.current)?.getBoundingClientRect();
    if (!rect) return 0;
    const x = Math.max(0, e.clientX - rect.left);
    return (x / rect.width) * visibleDur;
  };

  const handleRulerMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);
    onSeek(getTimeFromEvent(e));
  };

  useEffect(() => {
    if (!isDraggingPlayhead) return;
    const onMove = (e) => onSeek(getTimeFromEvent(e));
    const onUp = () => setIsDraggingPlayhead(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDraggingPlayhead]);

  // --- Trim drag ---
  const handleTrimMouseDown = (e, clipId, side) => {
    e.preventDefault();
    e.stopPropagation();
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    setTrimDrag({ clipId, side, startX: e.clientX, origStart: clip.trimStart || 0, origEnd: clip.trimEnd || clip.duration || 0, duration: clip.duration });
  };

  useEffect(() => {
    if (!trimDrag) return;
    const onMove = (e) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pxPerSec = rect.width / visibleDur;
      const deltaX = e.clientX - trimDrag.startX;
      const deltaSec = deltaX / pxPerSec;
      if (trimDrag.side === "start") {
        const newStart = Math.max(0, Math.min(trimDrag.origStart + deltaSec, trimDrag.origEnd - 0.5));
        onTrim(trimDrag.clipId, newStart, trimDrag.origEnd);
      } else {
        const newEnd = Math.max(trimDrag.origStart + 0.5, Math.min(trimDrag.origEnd + deltaSec, trimDrag.duration));
        onTrim(trimDrag.clipId, trimDrag.origStart, newEnd);
      }
    };
    const onUp = () => setTrimDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [trimDrag, visibleDur]);

  const playheadPos = `${timeToPercent(currentTime)}%`;

  // Accumulate clip start times
  let accTime = 0;
  const clipsWithStart = clips.map(c => { const start = accTime; accTime += (c.duration || 0); return { ...c, startTime: start }; });

  return (
    <div className="flex flex-col bg-[#1a1a1a] border-t border-[#2a2a2a] flex-shrink-0" style={{ minHeight: 130 }}>
      {/* Zoom control */}
      <div className="flex items-center justify-end gap-2 px-3 py-1 border-b border-[#2a2a2a]">
        <span className="text-[10px] text-[#555]">Zoom</span>
        <input type="range" min="1" max="10" step="0.5" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))}
          className="w-20 h-1 accent-[#00d4d4] cursor-pointer" />
        <span className="text-[10px] text-[#555]">{zoom.toFixed(1)}x</span>
      </div>

      {/* Ruler */}
      <div
        ref={rulerRef}
        className="relative h-7 bg-[#222] border-b border-[#2a2a2a] cursor-pointer flex-shrink-0 select-none"
        onMouseDown={handleRulerMouseDown}
      >
        {rulerMarks.map((t) => (
          <div key={t} className="absolute flex flex-col items-start" style={{ left: `${timeToPercent(t)}%` }}>
            <span className="text-[9px] text-[#555] ml-0.5 select-none">{formatTimeShort(t)}</span>
            <div className="w-px h-2 bg-[#444]" />
          </div>
        ))}
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center z-20"
          style={{ left: playheadPos, transform: "translateX(-50%)" }}
        >
          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-white" />
          <div className="w-px flex-1 bg-white" />
        </div>
      </div>

      {/* Track area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track headers */}
        <div className="w-12 flex-shrink-0 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col">
          <div className="h-14 flex items-center justify-center border-b border-[#2a2a2a]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </div>
        </div>

        {/* Tracks */}
        <div ref={trackRef} className="flex-1 relative overflow-hidden cursor-pointer" onMouseDown={handleRulerMouseDown}>
          {/* Playhead line through tracks */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white opacity-70 pointer-events-none z-20"
            style={{ left: playheadPos }}
          />

          {/* Video track */}
          <div className="h-14 bg-[#1e1e1e] border-b border-[#2a2a2a] relative" onMouseDown={e => e.stopPropagation()}>
            {clipsWithStart.map(clip => {
              const trimStart = clip.trimStart || 0;
              const trimEnd = clip.trimEnd || clip.duration || 0;
              const trimmedDur = trimEnd - trimStart;
              const leftPct = timeToPercent(clip.startTime);
              const widthPct = timeToPercent(trimmedDur);
              const isActive = clip.id === activeClipId;

              return (
                <div
                  key={clip.id}
                  className={`absolute top-1.5 bottom-1.5 rounded-md overflow-hidden flex items-center cursor-pointer transition
                    ${isActive ? "border-2 border-[#00d4d4]" : "border border-[#555] opacity-70 hover:opacity-100"}`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 20, background: "#2a2a2a" }}
                  onClick={(e) => { e.stopPropagation(); onSelectClip(clip.id); }}
                >
                  {/* Thumbnails */}
                  <div className="flex h-full w-full pointer-events-none">
                    {Array.from({ length: Math.max(1, Math.ceil(trimmedDur / 2)) }).map((_, i) => (
                      <div key={i} className="flex-1 h-full bg-[#333] border-r border-[#444] last:border-0 overflow-hidden">
                        {clip.type === "video" && (
                          <video src={clip.url} className="w-full h-full object-cover opacity-80" muted />
                        )}
                        {clip.type === "image" && (
                          <img src={clip.url} alt="" className="w-full h-full object-cover opacity-80" />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Name */}
                  <div className="absolute inset-x-1 top-0.5 text-[9px] text-white truncate font-medium pointer-events-none">
                    {clip.name}
                  </div>

                  {/* Trim handles (only for active) */}
                  {isActive && (
                    <>
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize bg-[#00d4d4]/80 flex items-center justify-center z-10"
                        onMouseDown={(e) => handleTrimMouseDown(e, clip.id, "start")}
                      >
                        <div className="w-0.5 h-3 bg-white rounded" />
                      </div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize bg-[#00d4d4]/80 flex items-center justify-center z-10"
                        onMouseDown={(e) => handleTrimMouseDown(e, clip.id, "end")}
                      >
                        <div className="w-0.5 h-3 bg-white rounded" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}