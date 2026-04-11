import React, { useRef, useState, useEffect, useCallback } from "react";

const LABEL_W = 48;
const RULER_H = 24;
const TRACK_H = 52;
const TRACKS = ["V2", "V1", "A1", "A2"];
const TIMELINE_H = RULER_H + TRACK_H * 4 + 8;

const CLIP_STYLE = {
  video: { bg: "#1b3a5c", border: "#2a5a8a", text: "#7ab8e8" },
  image: { bg: "#1b4a2e", border: "#2a6a45", text: "#7ae8a0" },
  audio: { bg: "#3a1b5c", border: "#5a2a8a", text: "#b87ae8" },
  text:  { bg: "#3a2a10", border: "#8a6a25", text: "#e8c87a" },
  logo:  { bg: "#3a1030", border: "#8a2a55", text: "#e87ab8" },
};

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function clipDisplayDur(clip) {
  if (clip.type === "text" || clip.type === "logo") return (clip.trimEnd ?? clip.duration ?? 5) - (clip.trimStart ?? 0);
  return ((clip.trimEnd ?? clip.duration) - (clip.trimStart ?? 0)) / (clip.speed ?? 1);
}

export default function VETimeline({
  clips, globalTime, totalDuration, zoom,
  selectedClipId, onSelectClip, onSeek, onUpdateClip,
}) {
  const scrollRef = useRef(null);
  const [drag, setDrag] = useState(null);

  const totalW = Math.max((totalDuration + 20) * zoom, 800);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const px = globalTime * zoom;
    if (px > el.scrollLeft + el.clientWidth - 80) {
      el.scrollLeft = px - el.clientWidth / 2;
    }
  }, [globalTime, zoom]);

  const xToTime = useCallback((clientX) => {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left + el.scrollLeft) / zoom);
  }, [zoom]);

  const handleRulerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onSeek(xToTime(e.clientX));
    setDrag({ type: "playhead" });
  }, [xToTime, onSeek]);

  const handleClipDown = useCallback((e, clip, handle) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectClip(clip.id);
    const t = xToTime(e.clientX);
    if (handle === "left") {
      setDrag({ type: "trimLeft", clipId: clip.id, origTrimStart: clip.trimStart ?? 0, origStartTime: clip.startTime, startX: e.clientX });
    } else if (handle === "right") {
      setDrag({ type: "trimRight", clipId: clip.id, origTrimEnd: clip.trimEnd ?? clip.duration, startX: e.clientX });
    } else {
      setDrag({ type: "move", clipId: clip.id, offsetSec: t - clip.startTime });
    }
  }, [xToTime, onSelectClip]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const t = xToTime(e.clientX);
      if (drag.type === "playhead") {
        onSeek(t);
      } else if (drag.type === "move") {
        onUpdateClip(drag.clipId, { startTime: Math.max(0, t - drag.offsetSec) });
      } else if (drag.type === "trimLeft") {
        const clip = clips.find(c => c.id === drag.clipId);
        if (!clip) return;
        const dxSec = (e.clientX - drag.startX) / zoom;
        const maxTrim = (clip.trimEnd ?? clip.duration) - 0.2;
        const newTrimStart = Math.max(0, Math.min(maxTrim, drag.origTrimStart + dxSec * (clip.speed ?? 1)));
        const newStartTime = Math.max(0, drag.origStartTime + dxSec);
        onUpdateClip(drag.clipId, { trimStart: newTrimStart, startTime: newStartTime });
      } else if (drag.type === "trimRight") {
        const clip = clips.find(c => c.id === drag.clipId);
        if (!clip) return;
        const dxSec = (e.clientX - drag.startX) / zoom;
        const newTrimEnd = Math.max((clip.trimStart ?? 0) + 0.2, Math.min(clip.duration, drag.origTrimEnd + dxSec * (clip.speed ?? 1)));
        onUpdateClip(drag.clipId, { trimEnd: newTrimEnd });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [drag, clips, zoom, xToTime, onSeek, onUpdateClip]);

  const tickInterval = zoom >= 100 ? 1 : zoom >= 40 ? 5 : zoom >= 15 ? 10 : 30;
  const tickCount = Math.ceil((totalDuration + 30) / tickInterval) + 1;
  const ticks = Array.from({ length: tickCount }, (_, i) => i * tickInterval);

  const renderClip = (clip) => {
    const dur = clipDisplayDur(clip);
    const w = Math.max(4, dur * zoom);
    const l = clip.startTime * zoom;
    const col = CLIP_STYLE[clip.type] || CLIP_STYLE.video;
    const sel = clip.id === selectedClipId;
    const transDur = clip.transitionOutDuration ?? 0.5;
    const transW = clip.transitionOut && clip.transitionOut !== "none"
      ? Math.min(w * 0.4, transDur * zoom) : 0;

    return (
      <div
        key={clip.id}
        onMouseDown={e => handleClipDown(e, clip, "body")}
        style={{
          position: "absolute", left: l, width: w,
          top: 3, bottom: 3,
          cursor: drag?.clipId === clip.id && drag.type === "move" ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {/* Main body */}
        <div style={{
          position: "absolute", inset: 0,
          background: col.bg,
          border: `1.5px solid ${sel ? "#00d4d4" : col.border}`,
          borderRadius: 4,
          boxShadow: sel ? "0 0 0 1px #00d4d4" : "none",
          overflow: "hidden",
          display: "flex", alignItems: "center",
        }}>
          {w > 24 && (
            <span style={{ fontSize: 9, color: col.text, padding: "0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none", maxWidth: "100%" }}>
              {clip.type === "text" ? `"${(clip.textContent ?? "Text").slice(0, 20)}"` : clip.type === "logo" ? `⬡ ${clip.name.replace(/\.[^.]+$/, "")}` : clip.name.replace(/\.[^.]+$/, "")}
            </span>
          )}
          {/* Transition out indicator */}
          {transW > 0 && (
            <div style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: transW,
              background: "linear-gradient(to right, transparent, rgba(0,212,212,0.3))",
              pointerEvents: "none",
            }} />
          )}
        </div>

        {/* Left trim handle */}
        <div
          onMouseDown={e => handleClipDown(e, clip, "left")}
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 9, cursor: "ew-resize", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ width: 3, height: "50%", background: "rgba(255,255,255,0.35)", borderRadius: 2 }} />
        </div>

        {/* Right trim handle */}
        <div
          onMouseDown={e => handleClipDown(e, clip, "right")}
          style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 9, cursor: "ew-resize", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ width: 3, height: "50%", background: "rgba(255,255,255,0.35)", borderRadius: 2 }} />
        </div>
      </div>
    );
  };

  const trackClips = {
    V2: clips.filter(c => c.track === "V2"),
    V1: clips.filter(c => (c.track ?? "V1") === "V1"),
    A1: clips.filter(c => c.track === "A1"),
    A2: clips.filter(c => c.track === "A2"),
  };

  const playheadPx = globalTime * zoom;

  return (
    <div style={{ height: TIMELINE_H, flexShrink: 0 }} className="bg-[#111] border-t border-[#222] flex overflow-hidden select-none">
      {/* Fixed left labels */}
      <div style={{ width: LABEL_W, flexShrink: 0 }} className="flex flex-col bg-[#161616] border-r border-[#222] z-10">
        <div style={{ height: RULER_H }} className="border-b border-[#2a2a2a]" />
        {TRACKS.map(name => (
          <div key={name} style={{ height: TRACK_H }}
            className="flex items-center justify-center border-b border-[#2a2a2a]"
          >
            <span style={{ fontSize: 9, color: "#777", fontWeight: 700, letterSpacing: 1 }}>{name}</span>
          </div>
        ))}
        <div className="flex-1" />
      </div>

      {/* Scrollable area */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden relative">
        <div style={{ width: totalW, position: "relative", height: "100%" }}>

          {/* Ruler */}
          <div
            style={{ height: RULER_H, position: "relative", cursor: "pointer", userSelect: "none" }}
            className="bg-[#111] border-b border-[#2a2a2a]"
            onMouseDown={handleRulerDown}
          >
            {ticks.map(t => (
              <div key={t} style={{ position: "absolute", left: t * zoom, top: 0, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 8, color: "#666", paddingTop: 4, transform: "translateX(-50%)", whiteSpace: "nowrap" }}>{fmtTime(t)}</span>
                <div style={{ width: 1, height: 6, background: "#444", marginTop: "auto" }} />
              </div>
            ))}
          </div>

          {/* 4 tracks */}
          {TRACKS.map((name, i) => (
            <div key={name} style={{ height: TRACK_H, position: "relative" }}
              className={`border-b border-[#252525] ${i % 2 === 0 ? "bg-[#141414]" : "bg-[#111]"}`}
            >
              {(trackClips[name] ?? []).map(renderClip)}
            </div>
          ))}

          <div className="bg-[#111]" style={{ height: 8 }} />

          {/* Playhead */}
          <div
            style={{
              position: "absolute", top: 0, left: playheadPx,
              width: 2, height: "100%",
              background: "#ff3333", pointerEvents: "none", zIndex: 20,
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: -5,
              width: 0, height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "10px solid #ff3333",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
