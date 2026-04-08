import React, { useRef, useState, useEffect } from "react";

function fmt(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

const TRACK_DEFS = [
  { id: "video1", label: "V1", type: "video", color: "#2563eb", height: 52 },
  { id: "video2", label: "V2", type: "video", color: "#7c3aed", height: 52 },
  { id: "audio1", label: "A1", type: "audio", color: "#059669", height: 36 },
  { id: "audio2", label: "A2", type: "audio", color: "#b45309", height: 36 },
];

export default function MultiTrackTimeline({
  clips, audioTracks,
  activeClipId, onSelectClip,
  currentTime, duration,
  onSeek, onTrim,
  onMoveClip,
}) {
  const rulerRef = useRef(null);
  const tracksAreaRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [trimDrag, setTrimDrag] = useState(null);
  const [clipDrag, setClipDrag] = useState(null);

  const totalDur = Math.max(duration, clips.reduce((a, c) => Math.max(a, (c.startOffset || 0) + (c.duration || 0)), 0), audioTracks.reduce((a, t) => Math.max(a, (t.startOffset || 0) + 30), 0), 10);
  const visibleDur = totalDur / zoom;
  const pct = (t) => `${(t / visibleDur) * 100}%`;
  const pctN = (t) => (t / visibleDur) * 100;

  const step = visibleDur <= 30 ? 2 : visibleDur <= 120 ? 10 : 30;
  const rulerMarks = [];
  for (let t = 0; t <= visibleDur; t += step) rulerMarks.push(t);

  const getTimeFromX = (clientX) => {
    const rect = tracksAreaRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(visibleDur, ((clientX - rect.left) / rect.width) * visibleDur));
  };

  // Playhead drag
  const onRulerDown = (e) => { e.preventDefault(); setIsDraggingPlayhead(true); onSeek(getTimeFromX(e.clientX)); };
  useEffect(() => {
    if (!isDraggingPlayhead) return;
    const mv = (e) => onSeek(getTimeFromX(e.clientX));
    const up = () => setIsDraggingPlayhead(false);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [isDraggingPlayhead, visibleDur]);

  // Trim drag
  const onTrimDown = (e, clipId, side) => {
    e.preventDefault(); e.stopPropagation();
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    setTrimDrag({ clipId, side, startX: e.clientX, origStart: clip.trimStart || 0, origEnd: clip.trimEnd || clip.duration || 0, origDur: clip.duration || 0 });
  };
  useEffect(() => {
    if (!trimDrag) return;
    const mv = (e) => {
      const rect = tracksAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pxPerSec = rect.width / visibleDur;
      const delta = (e.clientX - trimDrag.startX) / pxPerSec;
      if (trimDrag.side === "start") {
        const ns = Math.max(0, Math.min(trimDrag.origStart + delta, trimDrag.origEnd - 0.3));
        onTrim(trimDrag.clipId, ns, trimDrag.origEnd);
      } else {
        const ne = Math.max(trimDrag.origStart + 0.3, Math.min(trimDrag.origEnd + delta, trimDrag.origDur));
        onTrim(trimDrag.clipId, trimDrag.origStart, ne);
      }
    };
    const up = () => setTrimDrag(null);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [trimDrag, visibleDur]);

  // Clip position drag
  const onClipBodyDown = (e, clip) => {
    e.preventDefault(); e.stopPropagation();
    onSelectClip(clip.id);
    const rect = tracksAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    setClipDrag({ clipId: clip.id, startX: e.clientX, origOffset: clip.startOffset || 0, pxPerSec: rect.width / visibleDur });
  };
  useEffect(() => {
    if (!clipDrag) return;
    const mv = (e) => {
      const delta = (e.clientX - clipDrag.startX) / clipDrag.pxPerSec;
      const newOffset = Math.max(0, clipDrag.origOffset + delta);
      onMoveClip?.(clipDrag.clipId, newOffset);
    };
    const up = () => setClipDrag(null);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [clipDrag, visibleDur]);

  const playheadLeft = pct(currentTime);

  const videoClips = clips.filter(c => c.type === "video" || c.type === "image");
  const imgClips = clips.filter(c => c.type === "image");

  return (
    <div className="flex flex-col bg-[#141414] border-t border-[#2a2a2a] flex-shrink-0" style={{ minHeight: 180 }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[#2a2a2a] flex-shrink-0">
        <span className="text-[10px] text-[#555] font-semibold">TIMELINE</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#555]">Zoom</span>
          <input type="range" min="1" max="20" step="0.5" value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            className="w-20 h-1 accent-[#00d4d4] cursor-pointer" />
          <span className="text-[10px] text-[#555] w-8">{zoom.toFixed(1)}x</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Track labels */}
        <div className="w-14 flex-shrink-0 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col">
          <div className="h-6 border-b border-[#2a2a2a]" /> {/* ruler spacer */}
          {TRACK_DEFS.map(tr => (
            <div key={tr.id} className="flex items-center justify-center border-b border-[#222] flex-shrink-0 px-1"
              style={{ height: tr.height }}>
              <span className="text-[10px] font-bold" style={{ color: tr.color }}>{tr.label}</span>
            </div>
          ))}
        </div>

        {/* Scrollable tracks area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative" ref={tracksAreaRef}
          style={{ cursor: "pointer" }}>
          {/* Ruler */}
          <div ref={rulerRef} className="h-6 bg-[#1e1e1e] border-b border-[#2a2a2a] relative flex-shrink-0 sticky top-0 z-10"
            onMouseDown={onRulerDown} style={{ minWidth: "100%" }}>
            {rulerMarks.map(t => (
              <div key={t} className="absolute top-0 flex flex-col" style={{ left: pct(t) }}>
                <span className="text-[9px] text-[#555] pl-0.5">{fmt(t)}</span>
                <div className="w-px h-2 bg-[#444] mt-0.5" />
              </div>
            ))}
            {/* Playhead caret on ruler */}
            <div className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-20"
              style={{ left: playheadLeft, transform: "translateX(-50%)" }}>
              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-[#00d4d4]" />
              <div className="w-px flex-1 bg-[#00d4d4]/60" />
            </div>
          </div>

          {/* Track rows + playhead line */}
          <div className="relative" style={{ minWidth: "100%" }}>
            {/* Playhead vertical line */}
            <div className="absolute top-0 bottom-0 w-px bg-[#00d4d4]/70 pointer-events-none z-20"
              style={{ left: playheadLeft }} />

            {TRACK_DEFS.map((tr, ti) => {
              const isAudio = tr.type === "audio";
              const trackClips = isAudio
                ? (ti === 2 ? audioTracks.slice(0, 1) : audioTracks.slice(1))
                : (ti === 0 ? videoClips : imgClips);

              return (
                <div key={tr.id} className="relative border-b border-[#222] bg-[#1a1a1a]"
                  style={{ height: tr.height }}
                  onMouseDown={onRulerDown}>
                  {/* Track bg stripes */}
                  <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: `repeating-linear-gradient(90deg, ${tr.color} 0px, ${tr.color} 1px, transparent 1px, transparent ${pctN(step)}%)` }} />

                  {trackClips.map(clip => {
                    const offset = clip.startOffset || 0;
                    const dur = isAudio ? (clip.duration || 30) : ((clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0));
                    const left = pctN(offset);
                    const width = pctN(dur);
                    const isActive = clip.id === activeClipId;

                    return (
                      <div key={clip.id}
                        className={`absolute top-1 rounded overflow-hidden flex items-center cursor-grab active:cursor-grabbing transition-shadow
                          ${isActive ? "shadow-[0_0_0_2px_#00d4d4]" : "opacity-80 hover:opacity-100"}`}
                        style={{
                          left: `${left}%`, width: `${Math.max(width, 1)}%`,
                          bottom: 4, background: tr.color + "33",
                          border: `1px solid ${tr.color}88`,
                        }}
                        onMouseDown={e => onClipBodyDown(e, clip)}
                        onClick={e => { e.stopPropagation(); onSelectClip(clip.id); }}
                      >
                        {/* Thumbnail for video */}
                        {!isAudio && clip.type === "video" && (
                          <video src={clip.url} className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" muted />
                        )}
                        {!isAudio && clip.type === "image" && (
                          <img src={clip.url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
                        )}
                        {/* Audio waveform placeholder */}
                        {isAudio && (
                          <div className="absolute inset-0 flex items-center px-1 pointer-events-none">
                            {Array.from({ length: 20 }).map((_, i) => (
                              <div key={i} className="flex-1 mx-px rounded-sm"
                                style={{ height: `${30 + Math.sin(i * 1.3) * 20}%`, background: tr.color, opacity: 0.7 }} />
                            ))}
                          </div>
                        )}
                        <span className="relative z-10 text-[9px] text-white truncate px-1 font-medium pointer-events-none">{clip.name}</span>

                        {/* Trim handles */}
                        {isActive && !isAudio && (
                          <>
                            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 flex items-center justify-center"
                              style={{ background: tr.color }}
                              onMouseDown={e => onTrimDown(e, clip.id, "start")}>
                              <div className="w-px h-3 bg-white/80 rounded" />
                            </div>
                            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 flex items-center justify-center"
                              style={{ background: tr.color }}
                              onMouseDown={e => onTrimDown(e, clip.id, "end")}>
                              <div className="w-px h-3 bg-white/80 rounded" />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}