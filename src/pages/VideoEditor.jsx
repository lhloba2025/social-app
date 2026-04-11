import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import VETopBar from "@/components/videoeditor/VETopBar";
import VEMediaPanel from "@/components/videoeditor/VEMediaPanel";
import VETimeline from "@/components/videoeditor/VETimeline";
import VEPropertiesPanel from "@/components/videoeditor/VEPropertiesPanel";

let _uidN = 0;
const uid = () => `ve${++_uidN}_${Date.now()}`;

function fmtTime(s) {
  if (!s || isNaN(s)) return "0:00.00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.floor((s % 1) * 100);
  return `${m}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

// ─── CSS filter from clip properties ────────────────────────────────────────
const PRESET_CSS = {
  vivid:   "saturate(1.6) contrast(1.1)",
  cinema:  "contrast(1.3) saturate(0.8) brightness(0.95)",
  drama:   "contrast(1.5) saturate(0.6) brightness(0.85)",
  mono:    "grayscale(1) contrast(1.1)",
  warm:    "sepia(0.4) saturate(1.3) brightness(1.05)",
  cool:    "hue-rotate(200deg) saturate(1.2)",
  faded:   "brightness(1.1) saturate(0.6) contrast(0.9)",
  vintage: "sepia(0.5) contrast(1.1) brightness(0.95)",
  night:   "brightness(0.65) contrast(1.35) hue-rotate(220deg)",
  golden:  "sepia(0.7) saturate(1.5) brightness(1.1)",
  retro:   "sepia(0.3) hue-rotate(-20deg) saturate(1.4)",
};

function buildFilter(clip) {
  if (!clip) return "";
  const parts = [];
  const preset = clip.filterPreset && clip.filterPreset !== "none" ? PRESET_CSS[clip.filterPreset] : "";
  if (preset) parts.push(preset);
  const br = 1 + (clip.brightness ?? 0) / 100;
  const co = 1 + (clip.contrast ?? 0) / 100;
  const sa = 1 + (clip.saturation ?? 0) / 100;
  const sepia = Math.max(0, clip.warmth ?? 0) / 200;
  const hueW = (clip.warmth ?? 0) < 0 ? (clip.warmth * 1.5).toFixed(0) : 0;
  const hueT = ((clip.tint ?? 0) * 1.8).toFixed(0);
  if (br !== 1) parts.push(`brightness(${br.toFixed(2)})`);
  if (co !== 1) parts.push(`contrast(${co.toFixed(2)})`);
  if (sa !== 1) parts.push(`saturate(${sa.toFixed(2)})`);
  if (sepia > 0) parts.push(`sepia(${sepia.toFixed(2)})`);
  if (hueW != 0) parts.push(`hue-rotate(${hueW}deg)`);
  if (hueT != 0) parts.push(`hue-rotate(${hueT}deg)`);
  if ((clip.sharpen ?? 0) > 0) parts.push(`contrast(${(1 + clip.sharpen / 350).toFixed(3)})`);
  return parts.join(" ");
}

function buildTransform(clip) {
  if (!clip) return "";
  const scale = (clip.scale ?? 100) / 100;
  const sx = scale * ((clip.flipH ?? false) ? -1 : 1);
  const sy = scale * ((clip.flipV ?? false) ? -1 : 1);
  const rot = clip.rotation ?? 0;
  const parts = [];
  if (rot !== 0) parts.push(`rotate(${rot}deg)`);
  if (sx !== 1 || sy !== 1) parts.push(`scale(${sx.toFixed(3)},${sy.toFixed(3)})`);
  return parts.join(" ") || "";
}

// ─── Find V1 clip active at global time ──────────────────────────────────────
function clipAtTime(clipsArr, t) {
  const v1 = clipsArr.filter(c => (c.track ?? "V1") === "V1").sort((a, b) => a.startTime - b.startTime);
  return v1.find(c => {
    const dur = ((c.trimEnd ?? c.duration) - (c.trimStart ?? 0)) / (c.speed ?? 1);
    return t >= c.startTime && t < c.startTime + dur;
  }) ?? null;
}

// ─── Find audio clip active at global time on a given track ──────────────────
function audioClipAtTime(clipsArr, t, track) {
  return clipsArr
    .filter(c => c.track === track && c.type === "audio")
    .find(c => {
      const dur = ((c.trimEnd ?? c.duration) - (c.trimStart ?? 0)) / (c.speed ?? 1);
      return t >= c.startTime && t < c.startTime + dur;
    }) ?? null;
}

// ─── Clip display duration ────────────────────────────────────────────────────
function clipDur(clip) {
  if (!clip) return 0;
  if (clip.type === "text" || clip.type === "logo") return (clip.trimEnd ?? clip.duration ?? 5) - (clip.trimStart ?? 0);
  return ((clip.trimEnd ?? clip.duration) - (clip.trimStart ?? 0)) / (clip.speed ?? 1);
}

// ─── Transition overlay opacity calculation ───────────────────────────────────
function calcTransitionOverlay(clip, globalTime) {
  if (!clip) return { opacity: 0, color: "black" };
  const start = clip.startTime;
  const end = start + clipDur(clip);
  const gt = globalTime;

  let opacity = 0;
  let color = "black";

  // Transition out
  if (clip.transitionOut && clip.transitionOut !== "none") {
    const dur = clip.transitionOutDuration ?? 0.5;
    const progress = (gt - (end - dur)) / dur; // 0→1 as we approach end
    if (progress > 0 && progress <= 1) {
      opacity = Math.max(0, Math.min(1, progress));
      if (clip.transitionOut === "flash") color = "white";
    }
  }

  // Transition in (overrides out if we're at the start)
  if (clip.transitionIn && clip.transitionIn !== "none") {
    const dur = clip.transitionInDuration ?? 0.5;
    const progress = (gt - start) / dur; // 0→1 from start
    if (progress >= 0 && progress < 1) {
      const inOpacity = Math.max(0, Math.min(1, 1 - progress));
      if (inOpacity > opacity) {
        opacity = inOpacity;
        if (clip.transitionIn === "flash") color = "white";
        else color = "black";
      }
    }
  }

  return { opacity, color };
}

// ─── Text overlay component ───────────────────────────────────────────────────
function TextOverlay({ clip, globalTime }) {
  const start = clip.startTime;
  const end = start + clipDur(clip);
  if (globalTime < start || globalTime >= end) return null;

  const progress = (globalTime - start) / clipDur(clip); // 0 to 1
  const anim = clip.textAnimation ?? "none";

  let opacity = 1;
  let translateY = 0;
  let scale = 1;

  if (anim === "fade") {
    if (progress < 0.12) opacity = progress / 0.12;
    else if (progress > 0.88) opacity = (1 - progress) / 0.12;
  } else if (anim === "slide-up") {
    if (progress < 0.2) {
      opacity = progress / 0.2;
      translateY = 30 * (1 - progress / 0.2);
    }
    if (progress > 0.85) opacity = (1 - progress) / 0.15;
  } else if (anim === "slide-down") {
    if (progress < 0.2) {
      opacity = progress / 0.2;
      translateY = -30 * (1 - progress / 0.2);
    }
    if (progress > 0.85) opacity = (1 - progress) / 0.15;
  } else if (anim === "zoom") {
    if (progress < 0.2) {
      opacity = progress / 0.2;
      scale = 0.6 + 0.4 * (progress / 0.2);
    }
    if (progress > 0.85) opacity = (1 - progress) / 0.15;
  } else if (anim === "typewriter") {
    // Show characters progressively
    // handled via clip content slice
  }

  const textContent = anim === "typewriter"
    ? (clip.textContent ?? "").slice(0, Math.floor(progress * (clip.textContent ?? "").length) + 1)
    : (clip.textContent ?? "");

  const bgColor = clip.textBgColor ?? "#000000";
  const bgOpacity = clip.textBgOpacity ?? 0;

  const isRTL = (clip.textDirection ?? "ltr") === "rtl";
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        position: "absolute",
        left: "50%",
        top: `${clip.posY ?? 80}%`,
        transform: `translate(-50%, -50%) translateY(${translateY}px) scale(${scale})`,
        opacity,
        color: clip.fontColor ?? "#ffffff",
        fontSize: `${clip.fontSize ?? 40}px`,
        fontWeight: clip.fontWeight ?? "bold",
        fontStyle: clip.fontStyle ?? "normal",
        fontFamily: clip.fontFamily ?? "Arial",
        textAlign: clip.textAlign ?? "center",
        direction: isRTL ? "rtl" : "ltr",
        unicodeBidi: "plaintext",
        backgroundColor: bgOpacity > 0
          ? `${bgColor}${Math.round(bgOpacity * 255).toString(16).padStart(2, "0")}`
          : "transparent",
        padding: bgOpacity > 0 ? "6px 16px" : "0",
        borderRadius: bgOpacity > 0 ? 6 : 0,
        textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1)",
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
        maxWidth: "85%",
        lineHeight: 1.4,
        zIndex: 10,
        transition: "opacity 0.05s linear",
      }}
    >
      {textContent}
    </div>
  );
}

// ─── Logo overlay component ───────────────────────────────────────────────────
function LogoOverlay({ clip, globalTime }) {
  const tintStrength = (clip.logoTintStrength ?? 0) / 100;
  const hasTint = tintStrength > 0 && !!clip.logoTintColor;
  const [tintedSrc, setTintedSrc] = React.useState(null);

  React.useEffect(() => {
    if (!hasTint) { setTintedSrc(null); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      // Paint tint color only over non-transparent pixels
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = tintStrength;
      ctx.fillStyle = clip.logoTintColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setTintedSrc(canvas.toDataURL("image/png"));
    };
    img.src = clip.url;
  }, [clip.url, clip.logoTintColor, tintStrength, hasTint]);

  const start = clip.startTime;
  const dur = clipDur(clip);
  if (globalTime < start || globalTime >= start + dur) return null;

  const cssFilter = buildFilter(clip) || undefined;
  const posStyle = {
    position: "absolute",
    left: `${clip.posX ?? 85}%`,
    top: `${clip.posY ?? 10}%`,
    transform: `translate(-50%, -50%) scale(${(clip.scale ?? 100) / 100}) rotate(${clip.rotation ?? 0}deg)`,
    opacity: clip.opacity ?? 1,
    pointerEvents: "none",
    maxWidth: "30%",
    maxHeight: "25%",
    zIndex: 11,
    objectFit: "contain",
  };

  return (
    <img
      src={hasTint && tintedSrc ? tintedSrc : clip.url}
      style={{ ...posStyle, filter: cssFilter }}
      alt=""
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function VideoEditor({ language = "ar" }) {
  const navigate = useNavigate();
  const isAr = language === "ar";
  const T = isAr ? {
    uploadOrDrag: "ارفع فيديو أو اسحبه للبدء",
    mixer: "الميكسر",
    videoAudio: "صوت الفيديو",
    music1: "موسيقى / A1",
    music2: "موسيقى 2 / A2",
    muted: "كتم",
    mute: "كتم",
    tip1: "نصيحة: اقطع الكليب (مفتاح S)",
    tip2: "ثم اضبط الصوت لكل جزء.",
  } : {
    uploadOrDrag: "Upload or drag a video to start",
    mixer: "Mixer",
    videoAudio: "Video Audio",
    music1: "Music / A1",
    music2: "Music 2 / A2",
    muted: "MUTED",
    mute: "MUTE",
    tip1: "Tip: Split a video clip (S key)",
    tip2: "then set different volumes per segment.",
  };

  const [mediaFiles, setMediaFiles] = useState([]);
  const [clips, setClips] = useState([]);
  const [globalTime, setGlobalTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [zoom, setZoom] = useState(80);
  const [undoStack, setUndoStack] = useState([]);
  const [loadedClipId, setLoadedClipId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [trackVolumes, setTrackVolumes] = useState({ V1: 1, A1: 1, A2: 1 });
  const [showMixer, setShowMixer] = useState(false);

  const videoRef = useRef(null);
  const logoImagesRef = useRef(new Map()); // clipId → HTMLImageElement
  const mediaImagesRef = useRef(new Map()); // mediaFile url → HTMLImageElement
  const imagePreviewRef = useRef(null); // <img> element for current image clip in preview
  const totalDurationRef = useRef(0);
  const audio1Ref = useRef(null);
  const audio2Ref = useRef(null);
  const exportCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const globalTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const loadedClipIdRef = useRef(null);
  const loadedA1Ref = useRef(null);
  const loadedA2Ref = useRef(null);
  const clipsRef = useRef([]);
  const rafRef = useRef(null);
  const rafLastTsRef = useRef(null);
  const rafFnRef = useRef(null);
  const isExportingRef = useRef(false);
  const exportRecorderRef = useRef(null);
  const exportStartTimeRef = useRef(0);
  const exportTotalRef = useRef(0);
  const volumeRef = useRef(1);
  const isMutedRef = useRef(false);
  const trackVolumesRef = useRef({ V1: 1, A1: 1, A2: 1 });

  useEffect(() => { clipsRef.current = clips; }, [clips]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { loadedClipIdRef.current = loadedClipId; }, [loadedClipId]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { trackVolumesRef.current = trackVolumes; }, [trackVolumes]);

  const totalDuration = useMemo(() => {
    return clips.reduce((max, c) => {
      if (c.type === "text") return Math.max(max, c.startTime + clipDur(c));
      const d = clipDur(c);
      return Math.max(max, c.startTime + d);
    }, 0);
  }, [clips]);

  useEffect(() => { totalDurationRef.current = totalDuration; }, [totalDuration]);

  const selectedClip = useMemo(() => clips.find(c => c.id === selectedClipId) ?? null, [clips, selectedClipId]);
  const displayClip = useMemo(() => clipAtTime(clips, globalTime), [clips, globalTime]);
  const textClips = useMemo(() => clips.filter(c => c.type === "text"), [clips]);
  const logoClips = useMemo(() => clips.filter(c => c.type === "logo"), [clips]);
  const propClip = selectedClip ?? displayClip;

  // ── Load video clip ────────────────────────────────────────────────────────
  const loadVideoClip = useCallback((clip, localTime) => {
    const video = videoRef.current;
    if (!video || clip.type !== "video") return;
    const seek = () => {
      const target = Math.max(clip.trimStart ?? 0, Math.min(localTime, clip.trimEnd ?? clip.duration));
      video.currentTime = target;
      video.playbackRate = clip.speed ?? 1;
      video.volume = isMutedRef.current ? 0 : Math.min(1, volumeRef.current * (clip.volume ?? 1));
      if (isPlayingRef.current) video.play().catch(() => {});
    };
    if (video.src !== clip.url) {
      video.pause();
      video.src = clip.url;
      video.load();
      video.addEventListener("loadedmetadata", seek, { once: true });
    } else {
      seek();
    }
    setLoadedClipId(clip.id);
    loadedClipIdRef.current = clip.id;
  }, []);

  // ── Load/sync audio clip on a track ───────────────────────────────────────
  const syncAudioClip = useCallback((audioEl, ref, clip, gt) => {
    if (!audioEl || !clip) {
      if (audioEl && !audioEl.paused) audioEl.pause();
      return;
    }
    const localTime = (gt - clip.startTime) * (clip.speed ?? 1) + (clip.trimStart ?? 0);
    const trackMul = trackVolumesRef.current[clip.track] ?? 1;
    if (ref.current !== clip.id || audioEl.src !== clip.url) {
      audioEl.src = clip.url;
      audioEl.load();
      ref.current = clip.id;
      audioEl.addEventListener("loadedmetadata", () => {
        audioEl.currentTime = Math.max(0, localTime);
        audioEl.volume = isMutedRef.current ? 0 : Math.min(1, volumeRef.current * (clip.volume ?? 1) * trackMul);
        audioEl.playbackRate = clip.speed ?? 1;
        if (isPlayingRef.current) audioEl.play().catch(() => {});
      }, { once: true });
    } else {
      const drift = Math.abs(audioEl.currentTime - localTime);
      if (drift > 0.2) audioEl.currentTime = localTime;
      audioEl.volume = isMutedRef.current ? 0 : Math.min(1, volumeRef.current * (clip.volume ?? 1) * trackMul);
    }
  }, []);

  // ── Apply visual properties to video/img ──────────────────────────────────
  const applyProps = useCallback((clip) => {
    const el = clip?.type === "video" ? videoRef.current : null;
    if (!el || !clip) return;
    el.style.filter = buildFilter(clip);
    el.style.transform = buildTransform(clip);
    el.style.opacity = String(clip.opacity ?? 1);
    el.playbackRate = clip.speed ?? 1;
    el.volume = isMuted ? 0 : Math.min(1, volume * (clip.volume ?? 1) * (trackVolumesRef.current.V1 ?? 1));
  }, [isMuted, volume]);

  useEffect(() => {
    applyProps(displayClip);
  }, [
    displayClip?.id, displayClip?.brightness, displayClip?.contrast,
    displayClip?.saturation, displayClip?.warmth, displayClip?.tint,
    displayClip?.sharpen, displayClip?.fade, displayClip?.vignette,
    displayClip?.filterPreset, displayClip?.opacity, displayClip?.scale,
    displayClip?.rotation, displayClip?.flipH, displayClip?.flipV,
    displayClip?.speed, displayClip?.volume, applyProps
  ]);

  // ── Draw export frame to canvas ────────────────────────────────────────────
  const drawExportFrame = useCallback(() => {
    const canvas = exportCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    const activeClip = clipAtTime(clipsRef.current, globalTimeRef.current);

    if (activeClip?.type === "video" && videoRef.current?.readyState >= 2) {
      const f = buildFilter(activeClip);
      ctx.filter = f || "none";
      ctx.globalAlpha = activeClip.opacity ?? 1;
      ctx.drawImage(videoRef.current, 0, 0, W, H);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    } else if (activeClip?.type === "image") {
      const imgEl = mediaImagesRef.current.get(activeClip.url) ?? imagePreviewRef.current;
      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        const f = buildFilter(activeClip);
        ctx.filter = f || "none";
        ctx.globalAlpha = activeClip.opacity ?? 1;
        // Fit image into canvas (letterbox)
        const ir = imgEl.naturalWidth / imgEl.naturalHeight;
        const cr = W / H;
        let dw, dh, dx, dy;
        if (ir > cr) { dw = W; dh = W / ir; dx = 0; dy = (H - dh) / 2; }
        else { dh = H; dw = H * ir; dx = (W - dw) / 2; dy = 0; }
        ctx.drawImage(imgEl, dx, dy, dw, dh);
        ctx.filter = "none";
        ctx.globalAlpha = 1;
      }
    }

    // Draw text overlays on canvas
    const gt = globalTimeRef.current;
    clipsRef.current.filter(c => c.type === "text").forEach(tc => {
      const s = tc.startTime, e = s + clipDur(tc);
      if (gt < s || gt >= e) return;
      const progress = (gt - s) / clipDur(tc);
      let opacity = 1;
      if ((tc.textAnimation ?? "none") === "fade") {
        if (progress < 0.12) opacity = progress / 0.12;
        else if (progress > 0.88) opacity = (1 - progress) / 0.12;
      }
      const isRTL = (tc.textDirection ?? "ltr") === "rtl";
      ctx.globalAlpha = opacity;
      ctx.direction = isRTL ? "rtl" : "ltr";
      ctx.font = `${tc.fontWeight ?? "bold"} ${tc.fontSize ?? 40}px "${tc.fontFamily ?? "Arial"}"`;
      ctx.fillStyle = tc.fontColor ?? "#ffffff";
      ctx.textAlign = tc.textAlign ?? "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 10;
      const x = isRTL ? W * 0.5 : W / 2;
      const y = H * (tc.posY ?? 80) / 100;
      // Draw background if set
      const bgOp = tc.textBgOpacity ?? 0;
      if (bgOp > 0) {
        const metrics = ctx.measureText(tc.textContent ?? "");
        const tw = metrics.width;
        const th = (tc.fontSize ?? 40) * 1.4;
        const pad = 16;
        const bx = x - tw / 2 - pad;
        const by = y - th / 2 - 4;
        const bw = tw + pad * 2;
        const bh = th + 8;
        const bg = tc.textBgColor ?? "#000000";
        const r = parseInt(bg.slice(1, 3), 16);
        const g = parseInt(bg.slice(3, 5), 16);
        const b = parseInt(bg.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r},${g},${b},${bgOp})`;
        ctx.shadowBlur = 0;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = tc.fontColor ?? "#ffffff";
        ctx.shadowBlur = 10;
      }
      const anim = tc.textAnimation ?? "none";
      const displayText = anim === "typewriter"
        ? (tc.textContent ?? "").slice(0, Math.floor(progress * (tc.textContent ?? "").length) + 1)
        : (tc.textContent ?? "");
      ctx.fillText(displayText, x, y);
      ctx.shadowBlur = 0;
      ctx.direction = "ltr";
      ctx.textBaseline = "alphabetic";
      ctx.globalAlpha = 1;
    });

    // Draw logo overlays
    clipsRef.current.filter(c => c.type === "logo").forEach(lc => {
      const s = lc.startTime;
      const dur = clipDur(lc);
      if (gt < s || gt >= s + dur) return;
      const img = logoImagesRef.current.get(lc.id);
      if (!img || !img.complete || img.naturalWidth === 0) return;
      const scale = (lc.scale ?? 100) / 100;
      const maxW = W * 0.3 * scale;
      const maxH = H * 0.25 * scale;
      const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      const dw = Math.ceil(img.naturalWidth * ratio);
      const dh = Math.ceil(img.naturalHeight * ratio);
      const dx = W * (lc.posX ?? 85) / 100 - dw / 2;
      const dy = H * (lc.posY ?? 10) / 100 - dh / 2;
      const logoFilter = buildFilter(lc);
      const tintStrength = (lc.logoTintStrength ?? 0) / 100;
      const tintColor = lc.logoTintColor;
      if (logoFilter || tintStrength > 0) {
        const off = document.createElement("canvas");
        off.width = dw; off.height = dh;
        const offCtx = off.getContext("2d");
        offCtx.filter = logoFilter || "none";
        offCtx.drawImage(img, 0, 0, dw, dh);
        if (tintStrength > 0 && tintColor) {
          offCtx.filter = "none";
          offCtx.globalCompositeOperation = "source-atop";
          offCtx.globalAlpha = tintStrength;
          offCtx.fillStyle = tintColor;
          offCtx.fillRect(0, 0, dw, dh);
        }
        ctx.globalAlpha = lc.opacity ?? 1;
        ctx.drawImage(off, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = lc.opacity ?? 1;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }
    });

    // Transition overlay
    if (activeClip) {
      const { opacity: transOp, color: transColor } = calcTransitionOverlay(activeClip, gt);
      if (transOp > 0) {
        ctx.fillStyle = transColor === "white" ? `rgba(255,255,255,${transOp})` : `rgba(0,0,0,${transOp})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // Vignette
    const vignette = activeClip?.vignette ?? 0;
    if (vignette > 0) {
      const radGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.75);
      radGrad.addColorStop(0, "transparent");
      radGrad.addColorStop(1, `rgba(0,0,0,${(vignette / 100 * 0.88).toFixed(2)})`);
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, W, H);
    }

    // Update export progress
    if (isExportingRef.current && exportTotalRef.current > 0) {
      const pct = Math.min(100, ((globalTimeRef.current - exportStartTimeRef.current) / exportTotalRef.current) * 100);
      setExportProgress(pct);
    }
  }, []);

  // ── RAF loop ───────────────────────────────────────────────────────────────
  rafFnRef.current = (timestamp) => {
    if (!isPlayingRef.current) return;

    if (rafLastTsRef.current === null) rafLastTsRef.current = timestamp;
    const dt = Math.min((timestamp - rafLastTsRef.current) / 1000, 0.1);
    rafLastTsRef.current = timestamp;

    const gt = globalTimeRef.current;
    const allClips = clipsRef.current;
    const activeClip = clipAtTime(allClips, gt);

    // Sync audio tracks
    const a1Clip = audioClipAtTime(allClips, gt, "A1");
    const a2Clip = audioClipAtTime(allClips, gt, "A2");
    if (audio1Ref.current) {
      if (a1Clip) syncAudioClip(audio1Ref.current, loadedA1Ref, a1Clip, gt);
      else if (!audio1Ref.current.paused) audio1Ref.current.pause();
    }
    if (audio2Ref.current) {
      if (a2Clip) syncAudioClip(audio2Ref.current, loadedA2Ref, a2Clip, gt);
      else if (!audio2Ref.current.paused) audio2Ref.current.pause();
    }

    if (!activeClip) {
      // No V1 clip here — check if we're still within totalDuration (audio-only segment)
      const total = totalDurationRef.current;
      if (gt >= total || total === 0) {
        // Truly reached end
        isPlayingRef.current = false;
        setIsPlaying(false);
        videoRef.current?.pause();
        audio1Ref.current?.pause();
        audio2Ref.current?.pause();
        if (isExportingRef.current) {
          setExportProgress(100);
          setTimeout(() => exportRecorderRef.current?.stop(), 300);
        }
        return;
      }
      // Audio-only segment: advance time and keep going
      const newGT = Math.min(gt + dt, total);
      globalTimeRef.current = newGT;
      setGlobalTime(newGT);
      if (isExportingRef.current) drawExportFrame();
      rafRef.current = requestAnimationFrame(t => rafFnRef.current(t));
      return;
    }

    const speed = activeClip.speed ?? 1;
    const clipEndGT = activeClip.startTime + ((activeClip.trimEnd ?? activeClip.duration) - (activeClip.trimStart ?? 0)) / speed;

    if (activeClip.type === "video") {
      const video = videoRef.current;
      if (loadedClipIdRef.current !== activeClip.id) {
        const localTime = (gt - activeClip.startTime) * speed + (activeClip.trimStart ?? 0);
        loadedClipIdRef.current = activeClip.id;
        loadVideoClip(activeClip, localTime);
        rafRef.current = requestAnimationFrame(t => rafFnRef.current(t));
        return;
      }
      if (video) {
        const localTime = video.currentTime;
        const trimEnd = activeClip.trimEnd ?? activeClip.duration;
        if (localTime >= trimEnd - 0.05) {
          const v1 = allClips.filter(c => (c.track ?? "V1") === "V1").sort((a, b) => a.startTime - b.startTime);
          const idx = v1.findIndex(c => c.id === activeClip.id);
          const next = v1[idx + 1];
          if (next) {
            globalTimeRef.current = next.startTime;
            setGlobalTime(next.startTime);
            loadedClipIdRef.current = null;
          } else {
            globalTimeRef.current = clipEndGT;
            setGlobalTime(clipEndGT);
            isPlayingRef.current = false;
            setIsPlaying(false);
            video.pause();
            audio1Ref.current?.pause();
            audio2Ref.current?.pause();
            if (isExportingRef.current) {
              setExportProgress(100);
              setTimeout(() => exportRecorderRef.current?.stop(), 300);
            }
            return;
          }
        } else {
          const newGT = activeClip.startTime + (localTime - (activeClip.trimStart ?? 0)) / speed;
          globalTimeRef.current = newGT;
          setGlobalTime(newGT);
        }
      }
    } else {
      // Image clip or text-only segment — advance by real dt
      const newGT = gt + dt;
      if (newGT >= clipEndGT) {
        const v1 = allClips.filter(c => (c.track ?? "V1") === "V1").sort((a, b) => a.startTime - b.startTime);
        const idx = v1.findIndex(c => c.id === activeClip.id);
        const next = v1[idx + 1];
        if (next) {
          globalTimeRef.current = next.startTime;
          setGlobalTime(next.startTime);
          loadedClipIdRef.current = null;
          if (next.type === "video") loadVideoClip(next, next.trimStart ?? 0);
        } else {
          globalTimeRef.current = clipEndGT;
          setGlobalTime(clipEndGT);
          isPlayingRef.current = false;
          setIsPlaying(false);
          audio1Ref.current?.pause();
          audio2Ref.current?.pause();
          if (isExportingRef.current) {
            setExportProgress(100);
            setTimeout(() => exportRecorderRef.current?.stop(), 300);
          }
          return;
        }
      } else {
        globalTimeRef.current = newGT;
        setGlobalTime(newGT);
      }
    }

    // Draw to export canvas every frame if exporting
    if (isExportingRef.current) drawExportFrame();

    rafRef.current = requestAnimationFrame(t => rafFnRef.current(t));
  };

  // ── Toggle play/pause ──────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
      videoRef.current?.pause();
      audio1Ref.current?.pause();
      audio2Ref.current?.pause();
    } else {
      if (globalTimeRef.current >= totalDuration && totalDuration > 0) {
        globalTimeRef.current = 0;
        setGlobalTime(0);
        loadedClipIdRef.current = null;
        loadedA1Ref.current = null;
        loadedA2Ref.current = null;
      }
      isPlayingRef.current = true;
      setIsPlaying(true);
      rafLastTsRef.current = null;
      const clip = clipAtTime(clipsRef.current, globalTimeRef.current);
      if (clip?.type === "video") {
        const localTime = (globalTimeRef.current - clip.startTime) * (clip.speed ?? 1) + (clip.trimStart ?? 0);
        loadVideoClip(clip, localTime);
      }
      rafRef.current = requestAnimationFrame(t => rafFnRef.current(t));
    }
  }, [totalDuration, loadVideoClip]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const seekTo = useCallback((t) => {
    const clamped = Math.max(0, Math.min(t, Math.max(totalDuration, 0.01)));
    globalTimeRef.current = clamped;
    setGlobalTime(clamped);
    const clip = clipAtTime(clipsRef.current, clamped);
    if (clip?.type === "video") {
      const localTime = (clamped - clip.startTime) * (clip.speed ?? 1) + (clip.trimStart ?? 0);
      loadVideoClip(clip, localTime);
    } else {
      loadedClipIdRef.current = null;
    }
    // Reset audio sync
    loadedA1Ref.current = null;
    loadedA2Ref.current = null;
  }, [totalDuration, loadVideoClip]);

  // ── Upload files ──────────────────────────────────────────────────────────
  const handleUpload = useCallback((fileList) => {
    Array.from(fileList).forEach(file => {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith("video") ? "video"
                 : file.type.startsWith("audio") ? "audio" : "image";
      const addFile = (duration, thumbnail) => {
        setMediaFiles(prev => [...prev, { id: uid(), name: file.name, url, type, duration, thumbnail }]);
      };
      if (type === "image") {
        addFile(5, url);
        const imgEl = new Image();
        imgEl.src = url;
        mediaImagesRef.current.set(url, imgEl);
        return;
      }
      const el = document.createElement(type === "audio" ? "audio" : "video");
      el.src = url;
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        const duration = el.duration;
        if (type === "video") {
          el.currentTime = Math.min(0.5, duration / 2);
          el.onseeked = () => {
            try {
              const c = document.createElement("canvas");
              c.width = 160; c.height = 90;
              c.getContext("2d").drawImage(el, 0, 0, 160, 90);
              addFile(duration, c.toDataURL("image/jpeg", 0.6));
            } catch { addFile(duration, null); }
          };
        } else {
          addFile(duration, null);
        }
      };
    });
  }, []);

  // ── Add media to timeline ─────────────────────────────────────────────────
  const addToTimeline = useCallback((mf) => {
    setUndoStack(prev => [...prev.slice(-20), clipsRef.current]);
    const track = mf.type === "audio" ? "A1" : "V1";
    const startTime = clipsRef.current
      .filter(c => (c.track ?? "V1") === track)
      .reduce((max, c) => Math.max(max, c.startTime + clipDur(c)), 0);
    const newClip = {
      id: uid(), name: mf.name, url: mf.url, type: mf.type,
      duration: mf.duration, trimStart: 0,
      trimEnd: mf.type === "image" ? 5 : mf.duration,
      startTime, track, speed: 1, volume: 1,
      brightness: 0, contrast: 0, saturation: 0,
      warmth: 0, tint: 0, sharpen: 0, fade: 0, vignette: 0,
      opacity: 1, scale: 100, rotation: 0, flipH: false, flipV: false,
      filterPreset: "none", transitionOut: "none", transitionIn: "none",
    };
    setClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  }, []);

  // ── Add text overlay ──────────────────────────────────────────────────────
  const addTextClip = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-20), clipsRef.current]);
    const startTime = globalTimeRef.current;
    const newClip = {
      id: uid(), name: "Text", type: "text", track: "V2",
      duration: 5, trimStart: 0, trimEnd: 5, startTime,
      textContent: "Add your text here",
      fontSize: 40, fontFamily: "Arial", fontWeight: "bold",
      fontStyle: "normal", fontColor: "#ffffff",
      textBgColor: "#000000", textBgOpacity: 0,
      textAlign: "center", posY: 80,
      textAnimation: "fade",
      opacity: 1, scale: 100, rotation: 0,
      transitionOut: "none", transitionIn: "none",
    };
    setClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  }, []);

  // ── Add logo overlay ──────────────────────────────────────────────────────
  const addLogoClip = useCallback((file) => {
    setUndoStack(prev => [...prev.slice(-20), clipsRef.current]);
    const url = URL.createObjectURL(file);
    const newClip = {
      id: uid(), name: file.name, type: "logo", track: "V2",
      url, duration: 10, trimStart: 0, trimEnd: 10,
      startTime: globalTimeRef.current,
      posX: 85, posY: 10, scale: 100, opacity: 1, rotation: 0,
    };
    const img = new Image();
    img.src = url;
    logoImagesRef.current.set(newClip.id, img);
    setClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  }, []);

  // ── Split clip ─────────────────────────────────────────────────────────────
  const splitClip = useCallback(() => {
    const clip = clipAtTime(clipsRef.current, globalTimeRef.current);
    if (!clip) return;
    setUndoStack(prev => [...prev.slice(-20), clipsRef.current]);
    const speed = clip.speed ?? 1;
    const gt = globalTimeRef.current;
    const end = clip.startTime + ((clip.trimEnd ?? clip.duration) - (clip.trimStart ?? 0)) / speed;
    if (gt <= clip.startTime + 0.05 || gt >= end - 0.05) return;
    const splitLocal = (gt - clip.startTime) * speed + (clip.trimStart ?? 0);
    const left  = { ...clip, id: uid(), trimEnd: splitLocal };
    const right = { ...clip, id: uid(), trimStart: splitLocal, startTime: gt };
    setClips(prev => prev.filter(c => c.id !== clip.id).concat([left, right]));
    setSelectedClipId(right.id);
  }, []);

  // ── Delete selected (ripple) ──────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    const id = selectedClipId;
    if (!id) return;
    setUndoStack(prev => [...prev.slice(-20), clipsRef.current]);
    const del = clipsRef.current.find(c => c.id === id);
    if (!del) return;
    const delDur = clipDur(del);
    const delEnd = del.startTime + delDur;
    setClips(prev => prev
      .filter(c => c.id !== id)
      .map(c => {
        if ((c.track ?? "V1") === (del.track ?? "V1") && c.startTime >= delEnd - 0.01)
          return { ...c, startTime: Math.max(0, c.startTime - delDur) };
        return c;
      })
    );
    setSelectedClipId(null);
    if (loadedClipIdRef.current === id) {
      videoRef.current?.pause();
      setLoadedClipId(null);
    }
  }, [selectedClipId]);

  // ── Update clip ────────────────────────────────────────────────────────────
  const updateClip = useCallback((id, patch) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    if (loadedClipIdRef.current === id && videoRef.current) {
      const clip = clipsRef.current.find(c => c.id === id);
      if (clip) applyProps({ ...clip, ...patch });
      if (patch.speed !== undefined) videoRef.current.playbackRate = patch.speed;
    }
  }, [applyProps]);

  // ── Undo ──────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    setClips(undoStack[undoStack.length - 1]);
    setUndoStack(s => s.slice(0, -1));
  }, [undoStack]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (isExportingRef.current || clips.length === 0) return;

    const canvas = exportCanvasRef.current;
    if (!canvas) return;

    // Pick best supported codec
    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) ?? "video/webm";

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      isExportingRef.current = false;
      setIsExporting(false);
      setExportProgress(0);
    };

    exportRecorderRef.current = recorder;
    exportTotalRef.current = totalDuration;
    exportStartTimeRef.current = 0;

    isExportingRef.current = true;
    setIsExporting(true);
    setExportProgress(0);

    recorder.start(100);

    // Initial frame
    drawExportFrame();

    // Stop current playback, seek to start, then play for export
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      cancelAnimationFrame(rafRef.current);
      videoRef.current?.pause();
    }

    globalTimeRef.current = 0;
    setGlobalTime(0);
    loadedClipIdRef.current = null;
    loadedA1Ref.current = null;
    loadedA2Ref.current = null;

    setTimeout(() => {
      isPlayingRef.current = true;
      setIsPlaying(true);
      rafLastTsRef.current = null;
      const clip = clipAtTime(clipsRef.current, 0);
      if (clip?.type === "video") loadVideoClip(clip, clip.trimStart ?? 0);
      rafRef.current = requestAnimationFrame(t => rafFnRef.current(t));
    }, 150);
  }, [clips, totalDuration, drawExportFrame, loadVideoClip]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if ((e.code === "Delete" || e.code === "Backspace") && selectedClipId) { e.preventDefault(); deleteSelected(); }
      if ((e.key === "s" || e.key === "S") && !e.ctrlKey) { e.preventDefault(); splitClip(); }
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.code === "ArrowLeft")  { e.preventDefault(); seekTo(Math.max(0, globalTimeRef.current - (e.shiftKey ? 5 : 1/30))); }
      if (e.code === "ArrowRight") { e.preventDefault(); seekTo(globalTimeRef.current + (e.shiftKey ? 5 : 1/30)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, deleteSelected, splitClip, undo, seekTo, selectedClipId]);

  // ── Volume/mute sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume * (trackVolumes.V1 ?? 1)));
    v.muted = isMuted;
  }, [volume, isMuted, trackVolumes]);

  useEffect(() => {
    [audio1Ref, audio2Ref].forEach(ref => {
      if (!ref.current) return;
      ref.current.muted = isMuted;
    });
  }, [isMuted]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      clipsRef.current.forEach(c => { try { URL.revokeObjectURL(c.url); } catch {} });
      logoImagesRef.current.clear();
    };
  }, []);

  const canSplit = !!displayClip;
  const vignette = displayClip?.vignette ?? 0;
  const transOverlay = calcTransitionOverlay(displayClip, globalTime);

  // ── Zoom transition (preview only: zoom-in/out effect) ────────────────────
  const zoomTransitionScale = useMemo(() => {
    if (!displayClip) return 1;
    const anim = displayClip.transitionOut;
    if (anim !== "zoom") return 1;
    const dur = displayClip.transitionOutDuration ?? 0.5;
    const end = displayClip.startTime + clipDur(displayClip);
    const progress = (globalTime - (end - dur)) / dur;
    if (progress > 0 && progress <= 1) return 1 + progress * 0.08;
    const animIn = displayClip.transitionIn;
    if (animIn === "zoom") {
      const durIn = displayClip.transitionInDuration ?? 0.5;
      const progIn = (globalTime - displayClip.startTime) / durIn;
      if (progIn >= 0 && progIn < 1) return 1 + (1 - progIn) * 0.08;
    }
    return 1;
  }, [displayClip, globalTime]);

  return (
    <div
      className="flex flex-col bg-[#111] text-white overflow-hidden"
      style={{ height: "100%", userSelect: "none" }}
    >
      {/* Hidden export canvas */}
      <canvas ref={exportCanvasRef} width={1280} height={720} style={{ display: "none" }} />

      {/* Hidden audio elements */}
      <audio ref={audio1Ref} style={{ display: "none" }} />
      <audio ref={audio2Ref} style={{ display: "none" }} />

      {/* Top bar */}
      <VETopBar
        onSplit={splitClip}
        onDelete={deleteSelected}
        onUndo={undo}
        onExport={handleExport}
        canSplit={canSplit}
        canDelete={!!selectedClipId}
        canUndo={undoStack.length > 0}
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z * 1.5, 600))}
        onZoomOut={() => setZoom(z => Math.max(z / 1.5, 15))}
        isExporting={isExporting}
        exportProgress={exportProgress}
        showMixer={showMixer}
        onToggleMixer={() => setShowMixer(p => !p)}
        lang={language}
      />

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: Media panel */}
        <VEMediaPanel
          mediaFiles={mediaFiles}
          onUpload={handleUpload}
          onAddToTimeline={addToTimeline}
          onAddText={addTextClip}
          onAddLogo={addLogoClip}
          lang={language}
        />

        {/* Center: Preview + controls */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0a0a0a]">

          {/* Preview */}
          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden cursor-pointer"
            style={{ background: "#0a0a0a" }}
            onClick={togglePlay}
          >
            {/* Video */}
            <video
              ref={videoRef}
              className="max-h-full max-w-full"
              playsInline
              style={{
                display: displayClip?.type === "video" ? "block" : "none",
                pointerEvents: "none",
                transform: `${buildTransform(displayClip)} scale(${zoomTransitionScale})`,
              }}
            />

            {/* Image */}
            {displayClip?.type === "image" && (
              <img
                ref={imagePreviewRef}
                src={displayClip.url}
                className="max-h-full max-w-full"
                style={{
                  pointerEvents: "none",
                  opacity: displayClip.opacity ?? 1,
                  transform: `${buildTransform(displayClip)} scale(${zoomTransitionScale})`,
                  filter: buildFilter(displayClip),
                }}
                alt=""
              />
            )}

            {/* Text overlays */}
            {textClips.map(tc => (
              <TextOverlay key={tc.id} clip={tc} globalTime={globalTime} />
            ))}

            {/* Logo overlays */}
            {logoClips.map(lc => (
              <LogoOverlay key={lc.id} clip={lc} globalTime={globalTime} />
            ))}

            {/* Vignette */}
            {vignette > 0 && (
              <div
                style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${(vignette / 100 * 0.88).toFixed(2)}) 100%)`,
                }}
              />
            )}

            {/* Transition overlay */}
            {transOverlay.opacity > 0.01 && (
              <div
                style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: transOverlay.color === "white"
                    ? `rgba(255,255,255,${transOverlay.opacity.toFixed(3)})`
                    : `rgba(0,0,0,${transOverlay.opacity.toFixed(3)})`,
                }}
              />
            )}

            {/* Empty state */}
            {clips.length === 0 && (
              <div
                className="flex flex-col items-center gap-3 text-[#2a2a2a] cursor-pointer"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.7">
                  <rect x="2" y="2" width="20" height="20" rx="3" />
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                </svg>
                <p className="text-sm text-[#2a2a2a]">{T.uploadOrDrag}</p>
              </div>
            )}

            {/* Play indicator */}
            {clips.length > 0 && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm opacity-70">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Playback controls bar */}
          <div
            className="flex-shrink-0 bg-[#111] border-t border-[#1e1e1e]"
            style={{ padding: "8px 16px 10px" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Progress / seek bar */}
            <div
              className="w-full h-1 rounded-full bg-[#2a2a2a] relative cursor-pointer mb-3 group"
              style={{ position: "relative" }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                seekTo(pct * totalDuration);
              }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[#00c4c4] transition-none"
                style={{ width: totalDuration > 0 ? `${(globalTime / totalDuration) * 100}%` : "0%" }}
              />
              {/* thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition"
                style={{ left: totalDuration > 0 ? `calc(${(globalTime / totalDuration) * 100}% - 6px)` : "-6px" }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-3">
              {/* Skip back */}
              <button
                onClick={() => seekTo(Math.max(0, globalTime - 5))}
                className="w-7 h-7 flex items-center justify-center text-[#999] hover:text-white transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center text-black transition flex-shrink-0"
                style={{ background: "#00c4c4" }}
                onMouseEnter={e => e.currentTarget.style.background = "#00d4d4"}
                onMouseLeave={e => e.currentTarget.style.background = "#00c4c4"}
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                )}
              </button>

              {/* Skip forward */}
              <button
                onClick={() => seekTo(globalTime + 5)}
                className="w-7 h-7 flex items-center justify-center text-[#999] hover:text-white transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                </svg>
              </button>

              {/* Time display */}
              <span className="text-[11px] font-mono tabular-nums" style={{ color: "#bbb" }}>
                {fmtTime(globalTime)}
                <span style={{ color: "#666", margin: "0 4px" }}>/</span>
                {fmtTime(totalDuration)}
              </span>

              <div className="flex-1" />

              {/* Volume */}
              <button
                onClick={() => setIsMuted(p => !p)}
                className="w-7 h-7 flex items-center justify-center text-[#999] hover:text-white transition"
              >
                {isMuted || volume === 0 ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                )}
              </button>
              <input
                type="range" min={0} max={1} step={0.02} value={isMuted ? 0 : volume}
                onChange={e => { setVolume(Number(e.target.value)); setIsMuted(false); }}
                className="w-20 h-1 cursor-pointer"
                style={{ accentColor: "#00d4d4" }}
              />
            </div>
          </div>
        </div>

        {/* Right: Properties + Mixer */}
        <div className="flex flex-col flex-shrink-0" style={{ width: 240 }}>
          {/* Properties panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <VEPropertiesPanel clip={propClip} onUpdateClip={updateClip} lang={language} />
          </div>

          {/* Mixer panel — inside right column */}
          {showMixer && (
            <div className="flex-shrink-0 bg-[#141414] border-t border-[#1e1e1e] px-3 py-3">
              <span className="text-[8px] font-bold text-[#444] uppercase tracking-widest block mb-2">{T.mixer}</span>
              <div className="flex items-end gap-3">
                {[
                  { key: "V1", label: T.videoAudio, color: "#7ab8e8" },
                  { key: "A1", label: T.music1,     color: "#b87ae8" },
                  { key: "A2", label: T.music2,     color: "#b87ae8" },
                ].map(({ key, label, color }) => {
                  const val = trackVolumes[key] ?? 1;
                  const pct = Math.round(val * 100);
                  const barH = Math.round(val * 80);
                  return (
                    <div key={key} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                      <div className="w-6 h-16 bg-[#1a1a1a] rounded relative overflow-hidden flex flex-col justify-end border border-[#252525]">
                        <div className="w-full rounded-b transition-all duration-100"
                          style={{ height: `${barH}%`, background: val > 1.2 ? `linear-gradient(to top,#ff4444,${color})` : `linear-gradient(to top,${color}88,${color})` }}
                        />
                        <div className="absolute w-full border-t border-dashed border-[#3a3a3a]" style={{ bottom: "64%", left: 0 }} />
                      </div>
                      <input type="range" min={0} max={1.5} step={0.01} value={val}
                        onChange={e => setTrackVolumes(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="h-1 cursor-pointer" style={{ accentColor: color, width: 56 }} />
                      <span className="text-[8px] font-mono tabular-nums" style={{ color: val === 1 ? "#444" : color }}>{pct}%</span>
                      <span className="text-[7px] text-[#666] text-center leading-tight">{label}</span>
                      <button onClick={() => setTrackVolumes(prev => ({ ...prev, [key]: prev[key] === 0 ? 1 : 0 }))}
                        className={`text-[7px] px-1.5 py-0.5 rounded border transition ${val === 0 ? "border-red-500/50 text-red-400" : "border-[#252525] text-[#444] hover:text-white"}`}
                      >{val === 0 ? T.muted : T.mute}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <VETimeline
        clips={clips}
        globalTime={globalTime}
        totalDuration={totalDuration}
        zoom={zoom}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onSeek={seekTo}
        onUpdateClip={updateClip}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*,audio/*"
        multiple
        className="hidden"
        onChange={e => { handleUpload(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
