// ManualCutoutModal — Photoshop-style point selection tool.
// The user clicks points on the image; the tool connects them into a polygon,
// then applies one of: keep-only-selection, delete-selection, or colorize-selection.
// Finally it asks whether to fill the cleared area and which z-order to use.

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Undo2, Trash2, Loader2 } from "lucide-react";

// Keep uploads comfortably under the 10MB server limit.
const MAX_UPLOAD_BYTES = 9.5 * 1024 * 1024;
// Cap the longest side — 2600px is plenty for any social-media design.
const MAX_DIMENSION = 2600;

/**
 * Encodes a canvas to a blob that fits under MAX_UPLOAD_BYTES.
 * - Opaque results → JPEG (small).
 * - Results that need transparency → PNG, progressively downscaled if too big.
 */
async function canvasToConstrainedBlob(canvas, needsAlpha) {
  const toBlob = (cv, type, q) => new Promise((r) => cv.toBlob(r, type, q));

  if (!needsAlpha) {
    // No transparency needed — JPEG keeps the file tiny at high quality
    let q = 0.92;
    let blob = await toBlob(canvas, "image/jpeg", q);
    while (blob && blob.size > MAX_UPLOAD_BYTES && q > 0.5) {
      q -= 0.1;
      blob = await toBlob(canvas, "image/jpeg", q);
    }
    return blob;
  }

  // Transparency required — must stay PNG; downscale until it fits
  let blob = await toBlob(canvas, "image/png");
  let scale = 1;
  while (blob && blob.size > MAX_UPLOAD_BYTES && scale > 0.25) {
    scale *= 0.8;
    const c2 = document.createElement("canvas");
    c2.width = Math.max(1, Math.round(canvas.width * scale));
    c2.height = Math.max(1, Math.round(canvas.height * scale));
    const cx = c2.getContext("2d");
    cx.imageSmoothingQuality = "high";
    cx.drawImage(canvas, 0, 0, c2.width, c2.height);
    blob = await toBlob(c2, "image/png");
  }
  return blob;
}

/**
 * Renders the cutout result to a size-safe blob.
 * @param mode  "keep" | "remove" | "colorize"
 * @param points  array of {x,y} in 0-100 image-relative coords
 * @param fillColor  color for colorize mode
 * @param backingColor  optional solid color composited behind transparent areas
 */
function applyCutout(imgUrl, points, mode, fillColor, backingColor) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        let W = img.naturalWidth || img.width;
        let H = img.naturalHeight || img.height;
        // Cap dimensions so huge phone photos don't blow past the upload limit
        const longest = Math.max(W, H);
        if (longest > MAX_DIMENSION) {
          const r = MAX_DIMENSION / longest;
          W = Math.round(W * r);
          H = Math.round(H * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        const pts = points.map((p) => ({ x: (p.x / 100) * W, y: (p.y / 100) * H }));

        const tracePath = (c) => {
          c.beginPath();
          pts.forEach((p, i) => (i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)));
          c.closePath();
        };

        const hasBacking = backingColor && backingColor !== "transparent";

        if (hasBacking) {
          ctx.fillStyle = backingColor;
          ctx.fillRect(0, 0, W, H);
        }

        if (mode === "keep") {
          ctx.save();
          tracePath(ctx);
          ctx.clip();
          ctx.drawImage(img, 0, 0, W, H);
          ctx.restore();
        } else if (mode === "remove") {
          ctx.drawImage(img, 0, 0, W, H);
          ctx.save();
          tracePath(ctx);
          ctx.globalCompositeOperation = "destination-out";
          ctx.fill();
          ctx.restore();
          if (hasBacking) {
            ctx.save();
            ctx.globalCompositeOperation = "destination-over";
            ctx.fillStyle = backingColor;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
        } else if (mode === "colorize") {
          ctx.drawImage(img, 0, 0, W, H);
          ctx.save();
          tracePath(ctx);
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.restore();
        }

        // colorize keeps the opaque photo; keep/remove need alpha unless a backing fills it
        const needsAlpha = (mode === "keep" || mode === "remove") && !hasBacking;
        const blob = await canvasToConstrainedBlob(canvas, needsAlpha);
        if (blob) resolve(blob);
        else reject(new Error("encode failed"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = imgUrl;
  });
}

const QUICK_COLORS = ["#000000", "#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];

export default function ManualCutoutModal({ imageUrl, language, onApply, onClose }) {
  const isRtl = language === "ar";
  const [phase, setPhase] = useState("draw"); // draw | action | finish
  const [points, setPoints] = useState([]);
  const [mode, setMode] = useState("keep"); // keep | remove | colorize
  const [fillColor, setFillColor] = useState("#3b82f6");
  const [addBacking, setAddBacking] = useState(false);
  const [backingColor, setBackingColor] = useState("#ffffff");
  const [zOrder, setZOrder] = useState("keep"); // keep | front | back
  const [aspect, setAspect] = useState(1);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const stageRef = useRef(null);

  // Probe natural aspect ratio so the stage matches the image exactly
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) setAspect(img.naturalWidth / img.naturalHeight);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Drag state for repositioning existing points.
  const dragIdx = useRef(null);
  const movedDuringDrag = useRef(false);

  const pointFromEvent = (clientX, clientY) => {
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  // Click on empty image area → add a point. Clicks ON an existing point are
  // intercepted by the point's own handlers (they stop propagation), so they
  // never reach here and never add a stray extra point.
  const handleStageClick = (e) => {
    if (phase !== "draw") return;
    // Swallow the click that fires right after dragging a point off-target.
    if (movedDuringDrag.current) { movedDuringDrag.current = false; return; }
    setPoints((p) => [...p, pointFromEvent(e.clientX, e.clientY)]);
  };

  // Begin dragging an existing point (so a mis-placed point can be fixed
  // instead of clearing everything and starting over).
  const startDragPoint = (i, e) => {
    e.stopPropagation();
    e.preventDefault();
    dragIdx.current = i;
    movedDuringDrag.current = false;
  };
  const deletePoint = (i) => setPoints((p) => p.filter((_, idx) => idx !== i));

  // Global move/up listeners so dragging keeps working even if the cursor
  // leaves the little dot.
  useEffect(() => {
    const onMove = (e) => {
      if (dragIdx.current == null) return;
      movedDuringDrag.current = true;
      const pt = pointFromEvent(e.clientX, e.clientY);
      setPoints((p) => p.map((q, idx) => (idx === dragIdx.current ? pt : q)));
    };
    const onUp = () => { dragIdx.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const undoPoint = useCallback(() => setPoints((p) => p.slice(0, -1)), []);
  const clearPoints = useCallback(() => setPoints([]), []);

  // Live preview — regenerate whenever the chosen action/options change.
  // Lets the user SEE the result before applying (avoids picking the wrong mode).
  useEffect(() => {
    if (phase === "draw" || points.length < 3) {
      setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    const t = setTimeout(() => {
      const backing = mode !== "colorize" && addBacking ? backingColor : null;
      applyCutout(imageUrl, points, mode, fillColor, backing)
        .then((blob) => {
          if (cancelled) return;
          const u = URL.createObjectURL(blob);
          setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return u; });
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setPreviewing(false); });
    }, 160);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phase, mode, fillColor, addBacking, backingColor, points, imageUrl]);

  // Esc to close, Ctrl+Z to undo a point
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      else if ((e.ctrlKey || e.metaKey) && e.key === "z" && phase === "draw") { e.preventDefault(); undoPoint(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, undoPoint, onClose]);

  // Release the last preview object URL when the modal unmounts
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const handleApply = async () => {
    setBusy(true);
    try {
      const backing =
        mode !== "colorize" && addBacking ? backingColor : null;
      const blob = await applyCutout(imageUrl, points, mode, fillColor, backing);
      const url = URL.createObjectURL(blob);
      await onApply({ blob, url, zOrder });
    } catch (err) {
      alert((isRtl ? "تعذّر تطبيق القص: " : "Cutout failed: ") + (err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  // Stage sizing — fit within the modal while preserving image aspect ratio
  const maxW = 560;
  const maxH = 460;
  let stageW = maxW;
  let stageH = maxW / aspect;
  if (stageH > maxH) { stageH = maxH; stageW = maxH * aspect; }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl p-5 max-w-[640px] w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            ✂️ {isRtl ? "قص يدوي بالنقاط" : "Manual Point Cutout"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 mb-3">
          {["draw", "action", "finish"].map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${
              ["draw", "action", "finish"].indexOf(phase) >= i ? "bg-indigo-500" : "bg-slate-700"
            }`} />
          ))}
        </div>

        {/* ── DRAW phase ───────────────────────────────────────── */}
        {phase === "draw" && (
          <>
            <p className="text-xs text-slate-400 mb-2">
              {isRtl
                ? "انقر لإضافة نقاط حول المنطقة. اسحب أي نقطة لتحريكها، وانقر عليها مرتين لحذفها. النقطة الخضراء = البداية، والخط المتقطّع = إغلاق تلقائي للشكل. تحتاج 3 نقاط على الأقل."
                : "Click to add points around the area. Drag any point to move it, double-click it to delete. Green dot = start, dashed line = auto-close. Minimum 3 points."}
            </p>
            <div className="flex justify-center mb-3">
              <div
                ref={stageRef}
                onClick={handleStageClick}
                style={{ width: stageW, height: stageH, position: "relative", cursor: "crosshair" }}
                className="rounded-lg overflow-hidden border border-slate-600 select-none"
              >
                <img src={imageUrl} alt="" crossOrigin="anonymous" draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", pointerEvents: "none" }} />
                <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  {/* shaded selected area */}
                  {points.length >= 3 && (
                    <polygon points={polyPoints} fill="rgba(99,102,241,0.22)" stroke="none" />
                  )}
                  {/* solid edges the user actually drew (open path) */}
                  {points.length >= 2 && (
                    <polyline points={polyPoints} fill="none" stroke="#818cf8"
                      vectorEffect="non-scaling-stroke" style={{ strokeWidth: "2px" }} />
                  )}
                  {/* dashed auto-close edge: last point → first point */}
                  {points.length >= 3 && (
                    <line
                      x1={points[points.length - 1].x} y1={points[points.length - 1].y}
                      x2={points[0].x} y2={points[0].y}
                      stroke="#818cf8" strokeDasharray="3 2" vectorEffect="non-scaling-stroke"
                      style={{ strokeWidth: "1.5px", opacity: 0.7 }} />
                  )}
                  {/* interactive points — drag to move, double-click to delete */}
                  {points.map((p, i) => (
                    <g key={i} style={{ pointerEvents: "all", cursor: "grab" }}
                      onPointerDown={(e) => startDragPoint(i, e)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => { e.stopPropagation(); deletePoint(i); }}>
                      {/* large invisible hit target so the dot is easy to grab */}
                      <circle cx={p.x} cy={p.y} r="3.5" fill="transparent" />
                      <circle cx={p.x} cy={p.y} r="1.1"
                        fill={i === 0 ? "#22c55e" : "#818cf8"} stroke="#fff"
                        vectorEffect="non-scaling-stroke" style={{ strokeWidth: "1.5px" }} />
                    </g>
                  ))}
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={undoPoint} disabled={!points.length}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 transition disabled:opacity-40">
                <Undo2 className="w-3.5 h-3.5" /> {isRtl ? "تراجع نقطة" : "Undo point"}
              </button>
              <button onClick={clearPoints} disabled={!points.length}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 transition disabled:opacity-40">
                <Trash2 className="w-3.5 h-3.5" /> {isRtl ? "مسح الكل" : "Clear"}
              </button>
              <span className="text-xs text-slate-500 flex-1 text-center">
                {points.length} {isRtl ? "نقطة" : "points"}
              </span>
              <button onClick={() => setPhase("action")} disabled={points.length < 3}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition disabled:opacity-40">
                {isRtl ? "التالي ←" : "Next →"}
              </button>
            </div>
          </>
        )}

        {/* ── ACTION phase ─────────────────────────────────────── */}
        {phase === "action" && (
          <>
            <p className="text-xs text-slate-400 mb-3">
              {isRtl ? "ماذا تريد أن تفعل بالمنطقة المحددة؟ — شاهد المعاينة بالأسفل" : "What to do with the selected area? — see the preview below"}
            </p>
            <div className="space-y-2 mb-3">
              {[
                { id: "keep",     ar: "إبقاء المحدد فقط",   arSub: "يُبقي ما داخل التحديد ويحذف الباقي (لعزل شخص/عنصر)", en: "Keep selection only",  enSub: "Keeps what's inside, removes the rest (isolate a subject)", icon: "🎯" },
                { id: "remove",   ar: "حذف المحدد",         arSub: "يجعل المنطقة المحددة شفافة (يحذفها)",               en: "Delete selection",     enSub: "Makes the selected area transparent (delete it)",         icon: "✂️" },
                { id: "colorize", ar: "تلوين المحدد",       arSub: "يملأ المنطقة المحددة بلون",                        en: "Colorize selection",   enSub: "Fills the selected area with a color",                    icon: "🎨" },
              ].map((o) => (
                <button key={o.id} onClick={() => setMode(o.id)}
                  className={`w-full flex items-start gap-2 px-3 py-2.5 rounded-lg border text-start transition ${
                    mode === o.id ? "bg-indigo-600/20 border-indigo-500 text-white" : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                  }`}>
                  <span className="text-lg leading-none mt-0.5">{o.icon}</span>
                  <span className="flex flex-col">
                    <span className="text-xs font-semibold">{isRtl ? o.ar : o.en}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{isRtl ? o.arSub : o.enSub}</span>
                  </span>
                </button>
              ))}
            </div>

            {mode === "colorize" && (
              <div className="mb-3">
                <label className="text-xs text-slate-400 block mb-1">{isRtl ? "لون التعبئة" : "Fill color"}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer bg-slate-700" />
                  <div className="flex flex-wrap gap-1">
                    {QUICK_COLORS.map((c) => (
                      <button key={c} onClick={() => setFillColor(c)}
                        className="w-6 h-6 rounded-full hover:scale-110 transition"
                        style={{ background: c, outline: fillColor === c ? "2px solid #818cf8" : "1px solid #475569" }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live preview */}
            <div className="mb-3">
              <p className="text-[10px] text-slate-400 mb-1">{isRtl ? "👁️ معاينة النتيجة:" : "👁️ Result preview:"}</p>
              <div className="flex justify-center">
                <div
                  style={{
                    width: Math.min(stageW, 360),
                    height: Math.min(stageW, 360) / aspect,
                    background: "repeating-conic-gradient(#475569 0% 25%, #334155 0% 50%) 50% / 16px 16px",
                  }}
                  className="rounded-lg overflow-hidden border border-slate-600 relative flex items-center justify-center"
                >
                  {previewUrl && (
                    <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
                  )}
                  {previewing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                {isRtl ? "المربعات الرمادية = منطقة شفافة" : "Checkered = transparent area"}
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPhase("draw")}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 transition">
                {isRtl ? "→ رجوع" : "← Back"}
              </button>
              <button onClick={() => setPhase("finish")}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition">
                {isRtl ? "التالي ←" : "Next →"}
              </button>
            </div>
          </>
        )}

        {/* ── FINISH phase ─────────────────────────────────────── */}
        {phase === "finish" && (
          <>
            {/* Live preview of final result */}
            <div className="mb-3">
              <p className="text-[10px] text-slate-400 mb-1">{isRtl ? "👁️ النتيجة النهائية:" : "👁️ Final result:"}</p>
              <div className="flex justify-center">
                <div
                  style={{
                    width: Math.min(stageW, 360),
                    height: Math.min(stageW, 360) / aspect,
                    background: "repeating-conic-gradient(#475569 0% 25%, #334155 0% 50%) 50% / 16px 16px",
                  }}
                  className="rounded-lg overflow-hidden border border-slate-600 relative flex items-center justify-center"
                >
                  {previewUrl && (
                    <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
                  )}
                  {previewing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Replace cleared area — only meaningful for keep/remove */}
            {mode !== "colorize" && (
              <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={addBacking} onChange={(e) => setAddBacking(e.target.checked)} className="rounded" />
                  <span className="text-xs text-slate-200 font-semibold">
                    {isRtl ? "وضع لون مكان المنطقة المحذوفة" : "Put a color where the area was cleared"}
                  </span>
                </label>
                {addBacking && (
                  <div className="flex items-center gap-2 pl-1">
                    <input type="color" value={backingColor} onChange={(e) => setBackingColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-slate-700" />
                    <div className="flex flex-wrap gap-1">
                      {QUICK_COLORS.map((c) => (
                        <button key={c} onClick={() => setBackingColor(c)}
                          className="w-5 h-5 rounded-full hover:scale-110 transition"
                          style={{ background: c, outline: backingColor === c ? "2px solid #818cf8" : "1px solid #475569" }} />
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-500 mt-2">
                  {isRtl
                    ? "اتركه فارغاً لتبقى المنطقة شفافة (تظهر خلفية الكانفس أو الطبقات تحتها)."
                    : "Leave off to keep the area transparent (canvas background or layers below show through)."}
                </p>
              </div>
            )}

            {/* Z-order question */}
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3 mb-3">
              <label className="text-xs text-slate-200 font-semibold block mb-2">
                {isRtl ? "ترتيب الصورة بعد القص" : "Layer order after cutout"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "keep",  ar: "كما هي",   en: "Keep" },
                  { id: "front", ar: "للأمام",   en: "To Front" },
                  { id: "back",  ar: "للخلف",    en: "To Back" },
                ].map((o) => (
                  <button key={o.id} onClick={() => setZOrder(o.id)}
                    className={`py-2 rounded text-[11px] font-semibold transition ${
                      zOrder === o.id ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}>
                    {isRtl ? o.ar : o.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPhase("action")} disabled={busy}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 transition disabled:opacity-40">
                {isRtl ? "→ رجوع" : "← Back"}
              </button>
              <button onClick={handleApply} disabled={busy}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-xs font-semibold text-white transition disabled:opacity-60 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRtl ? "تطبيق القص" : "Apply Cutout"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
