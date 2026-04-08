import React, { useRef, useCallback } from "react";

/**
 * VolumeEnvelopeEditor
 * Shows a mini-graph for a single audio track.
 * Points: [{time, volume}] — sorted by time.
 * Click on empty area → add point
 * Drag point → move it
 * Double-click point → delete it
 */
export default function VolumeEnvelopeEditor({ track, duration = 30, onUpdatePoints }) {
  const svgRef = useRef(null);
  const dragging = useRef(null);
  const points = track.volumePoints || [{ time: 0, volume: track.volume ?? 1 }, { time: duration, volume: track.volume ?? 1 }];

  const W = 220, H = 64;

  const toSvgX = (t) => (t / duration) * W;
  const toSvgY = (v) => H - v * H;
  const fromSvg = (sx, sy) => ({
    time: Math.max(0, Math.min(duration, (sx / W) * duration)),
    volume: Math.max(0, Math.min(1, (H - sy) / H)),
  });

  const sorted = [...points].sort((a, b) => a.time - b.time);

  // Build SVG polyline path
  const polyline = sorted.map(p => `${toSvgX(p.time)},${toSvgY(p.volume)}`).join(" ");

  const getSvgPos = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      sx: ((e.clientX - rect.left) / rect.width) * W,
      sy: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const handleSvgClick = (e) => {
    if (dragging.current) return;
    const { sx, sy } = getSvgPos(e);
    // Check if click is near an existing point
    for (const p of sorted) {
      if (Math.abs(toSvgX(p.time) - sx) < 8 && Math.abs(toSvgY(p.volume) - sy) < 8) return;
    }
    const { time, volume } = fromSvg(sx, sy);
    const newPoints = [...points, { time: +time.toFixed(2), volume: +volume.toFixed(2) }];
    onUpdatePoints(track.id, newPoints);
  };

  const handlePointMouseDown = (e, idx) => {
    e.stopPropagation();
    dragging.current = idx;
    const onMove = (me) => {
      if (dragging.current === null) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = ((me.clientX - rect.left) / rect.width) * W;
      const sy = ((me.clientY - rect.top) / rect.height) * H;
      const { time, volume } = fromSvg(sx, sy);
      const newPoints = points.map((p, i) =>
        i === dragging.current ? { time: +time.toFixed(2), volume: +volume.toFixed(2) } : p
      );
      onUpdatePoints(track.id, newPoints);
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handlePointDblClick = (e, idx) => {
    e.stopPropagation();
    // Don't delete first or last
    if (idx === 0 || idx === sorted.length - 1) return;
    const timeToRemove = sorted[idx].time;
    const newPoints = points.filter(p => p.time !== timeToRemove);
    onUpdatePoints(track.id, newPoints);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#888]">Volume Envelope</span>
        <span className="text-[9px] text-[#555]">Click = add point · Double-click = delete</span>
      </div>
      <div className="rounded-lg overflow-hidden border border-[#333] bg-[#181818]" style={{ cursor: "crosshair" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          onClick={handleSvgClick}
          style={{ display: "block" }}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(v => (
            <line key={v} x1={0} y1={toSvgY(v)} x2={W} y2={toSvgY(v)}
              stroke="#333" strokeWidth="0.5" strokeDasharray="3,3" />
          ))}
          {/* Labels */}
          <text x={2} y={toSvgY(1) + 9} fill="#555" fontSize={7}>100%</text>
          <text x={2} y={toSvgY(0.5) + 4} fill="#555" fontSize={7}>50%</text>
          <text x={2} y={toSvgY(0) - 2} fill="#555" fontSize={7}>0%</text>

          {/* Filled area under curve */}
          <polygon
            points={`0,${H} ${sorted.map(p => `${toSvgX(p.time)},${toSvgY(p.volume)}`).join(" ")} ${W},${H}`}
            fill="#00d4d4" fillOpacity={0.12}
          />
          {/* Line */}
          <polyline points={polyline} fill="none" stroke="#00d4d4" strokeWidth={1.5} />

          {/* Control points */}
          {sorted.map((p, i) => (
            <circle
              key={i}
              cx={toSvgX(p.time)}
              cy={toSvgY(p.volume)}
              r={5}
              fill="#00d4d4"
              stroke="#000"
              strokeWidth={1.5}
              style={{ cursor: "grab" }}
              onMouseDown={(e) => handlePointMouseDown(e, i)}
              onDoubleClick={(e) => handlePointDblClick(e, i)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}