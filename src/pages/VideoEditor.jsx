import React, { useState, useRef, useEffect, useCallback } from "react";
import VideoSidebar from "@/components/videoeditor/VideoSidebar";
import VideoToolbar from "@/components/videoeditor/VideoToolbar";
import MultiTrackTimeline from "@/components/videoeditor/MultiTrackTimeline";
import SidePanel from "@/components/videoeditor/SidePanel";
import ExportModal, { useExportEngine } from "@/components/videoeditor/ExportEngine";
import PropertiesPanel from "@/components/videoeditor/PropertiesPanel";
import LayersPanel from "@/components/videoeditor/LayersPanel";

// ─── Draggable overlay item ───────────────────────────────────────────────────
function DraggableItem({ item, isSelected, onSelect, onMove, onDelete, previewRef, children }) {
  const down = useRef(null);

  const onMouseDown = (e) => {
    e.stopPropagation();
    onSelect(item.id);
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    down.current = { sx: e.clientX, sy: e.clientY, ox: item.x, oy: item.y, w: rect.width, h: rect.height };
    const onMv = (me) => {
      if (!down.current) return;
      const nx = Math.max(2, Math.min(98, down.current.ox + (me.clientX - down.current.sx) / down.current.w * 100));
      const ny = Math.max(2, Math.min(98, down.current.oy + (me.clientY - down.current.sy) / down.current.h * 100));
      onMove(item.id, nx, ny);
    };
    const onUp = () => { down.current = null; window.removeEventListener("mousemove", onMv); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMv);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{ position: "absolute", left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%,-50%)", cursor: "move", zIndex: isSelected ? 30 : 20, userSelect: "none" }}
    >
      {isSelected && (
        <button
          onMouseDown={e => { e.stopPropagation(); onDelete(item.id); }}
          style={{ position: "absolute", top: -10, right: -10, width: 20, height: 20, background: "#ef4444", border: "none", borderRadius: "50%", color: "white", fontSize: 10, cursor: "pointer", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
        >✕</button>
      )}
      <div style={{ outline: isSelected ? "2px solid #00d4d4" : "none", outlineOffset: 3, borderRadius: 4 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main VideoEditor ─────────────────────────────────────────────────────────
export default function VideoEditor() {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioFileInputRef = useRef(null);
  const previewRef = useRef(null);
  const animRef = useRef(null);

  const [showExport, setShowExport] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("Media");
  const [clips, setClips] = useState([]);
  const [activeClipId, setActiveClipId] = useState(null);

  // Load video from sessionStorage (when navigating from Media Library) or localStorage (persist)
  useEffect(() => {
    const raw = sessionStorage.getItem("mediaToEdit");
    if (raw) {
      sessionStorage.removeItem("mediaToEdit");
      try {
        const media = JSON.parse(raw);
        if (media.type === "video" && media.url) {
          const tmp = document.createElement("video");
          tmp.src = media.url;
          tmp.onloadedmetadata = () => {
            const clip = { id: Date.now(), name: media.name || "video", url: media.url, duration: tmp.duration, trimStart: 0, trimEnd: tmp.duration, type: "video", startOffset: 0 };
            setClips([clip]);
            setActiveClipId(clip.id);
          };
          tmp.onerror = () => {
            const clip = { id: Date.now(), name: media.name || "video", url: media.url, duration: 0, trimStart: 0, trimEnd: 0, type: "video", startOffset: 0 };
            setClips([clip]);
            setActiveClipId(clip.id);
          };
        }
      } catch {}
    } else {
      // Load from localStorage if exists
      const saved = localStorage.getItem("videoEditorState");
      if (saved) {
        try {
          const state = JSON.parse(saved);
          setClips(state.clips || []);
          setActiveClipId(state.activeClipId);
          setTextLayers(state.textLayers || []);
          setElements(state.elements || []);
          setAudioTracks(state.audioTracks || []);
          setCaptions(state.captions || []);
          setTransitions(state.transitions || []);
        } catch {}
      }
    }
  }, []);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioVolumes, setAudioVolumes] = useState({}); // Track individual audio volumes

  // Overlay state
  const [textLayers, setTextLayers] = useState([]);
  const [elements, setElements] = useState([]);
  const [captions, setCaptions] = useState([]);
  const [audioTracks, setAudioTracks] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const audioRefs = useRef({}); // id -> HTMLAudioElement

  // Filter/effect state - applied via CSS filter on the video element
  const [cssFilter, setCssFilter] = useState("");
  const [cssOpacity, setCssOpacity] = useState(1);

  const activeClip = clips.find(c => c.id === activeClipId) || clips[0] || null;

  const exportEngine = useExportEngine({
    videoRef, textLayers, elements, captions,
    videoFilter: cssFilter || "none", videoOpacity: cssOpacity, clips, audioTracks,
  });

  // ── Video sync ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeClip || activeClip.type !== "video") return;
    v.src = activeClip.url;
    v.load();
    
    const onMeta = () => {
      // Update clip with actual duration
      const actualDur = v.duration || 0;
      if (actualDur > 0 && activeClip.duration !== actualDur) {
        setClips(prev => prev.map(c => c.id === activeClip.id 
          ? { ...c, duration: actualDur, trimEnd: actualDur } 
          : c
        ));
      }
      setDuration(actualDur);
      setCurrentTime(0);
    };
    
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [activeClip?.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Helper: interpolate volume from envelope points at a given time
  const getEnvelopeVolume = (track, time) => {
    const pts = track.volumePoints;
    if (!pts || pts.length < 2) return track.volume ?? 1;
    const sorted = [...pts].sort((a, b) => a.time - b.time);
    if (time <= sorted[0].time) return sorted[0].volume;
    if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].volume;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      if (time >= a.time && time <= b.time) {
        const t = (time - a.time) / (b.time - a.time);
        return a.volume + t * (b.volume - a.volume);
      }
    }
    return track.volume ?? 1;
  };

  // Sync audio track volumes (including envelope)
  useEffect(() => {
    audioTracks.forEach(track => {
      const el = audioRefs.current[track.id];
      if (el) el.volume = isMuted ? 0 : (audioVolumes[track.id] ?? track.volume ?? 1);
    });
  }, [audioTracks, isMuted, audioVolumes]);

  // Apply envelope volume in real-time during playback
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      audioTracks.forEach(track => {
        const el = audioRefs.current[track.id];
        if (!el || !track.volumePoints) return;
        const vol = getEnvelopeVolume(track, el.currentTime);
        el.volume = isMuted ? 0 : Math.max(0, Math.min(1, vol));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, audioTracks, isMuted]);

  // Cleanup removed audio tracks
  useEffect(() => {
    const currentIds = new Set(audioTracks.map(t => t.id));
    Object.keys(audioRefs.current).forEach(id => {
      if (!currentIds.has(+id)) {
        audioRefs.current[id]?.pause();
        delete audioRefs.current[id];
      }
    });
  }, [audioTracks]);

  useEffect(() => {
    const v = videoRef.current;
    if (isPlaying) {
      // Play video if exists
      if (v && v.src) v.play().catch(() => setIsPlaying(false));
      // Play all audio tracks together
      audioTracks.forEach(track => {
        const el = audioRefs.current[track.id];
        if (!el) return;
        el.currentTime = currentTime;
        el.play().catch(() => {});
      });
    } else {
      if (v) v.pause();
      // Pause all audio tracks
      audioTracks.forEach(track => {
        const el = audioRefs.current[track.id];
        if (!el) return;
        el.pause();
      });
    }
  }, [isPlaying, audioTracks, currentTime]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tick = () => { setCurrentTime(v.currentTime); if (!v.paused) animRef.current = requestAnimationFrame(tick); };
    const onPlay = () => { animRef.current = requestAnimationFrame(tick); };
    const onPause = () => cancelAnimationFrame(animRef.current);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onMeta = () => { setDuration(v.duration || 0); setCurrentTime(0); };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      cancelAnimationFrame(animRef.current);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, [activeClip?.id]);

  const handleSeek = useCallback((t) => {
    const v = videoRef.current;
    if (!v) return;
    const c = Math.max(0, Math.min(t, v.duration || 0));
    v.currentTime = c;
    setCurrentTime(c);
  }, []);

  const handleUploadFile = (file) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video")) {
      const tmp = document.createElement("video");
      tmp.src = url;
      tmp.onloadedmetadata = () => {
        const clip = { id: Date.now(), name: file.name, url, duration: tmp.duration, trimStart: 0, trimEnd: tmp.duration, type: "video", startOffset: 0 };
        setClips(p => [...p, clip]);
        setActiveClipId(clip.id);
        setIsPlaying(false); setCurrentTime(0);
      };
    } else {
      const clip = { id: Date.now(), name: file.name, url, duration: 5, trimStart: 0, trimEnd: 5, type: "image", startOffset: 0 };
      setClips(p => [...p, clip]);
      setActiveClipId(clip.id);
    }
  };

  // ── Extract audio from video ──
  const handleExtractAudio = async () => {
    if (!activeClip || activeClip.type !== "video") return;
    try {
      const res = await fetch(activeClip.url);
      const arrayBuf = await res.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuf);
      const offCtx = new OfflineAudioContext(decoded.numberOfChannels, decoded.length, decoded.sampleRate);
      const src = offCtx.createBufferSource();
      src.buffer = decoded;
      src.connect(offCtx.destination);
      src.start();
      const rendered = await offCtx.startRendering();
      // encode to WAV
      const numCh = rendered.numberOfChannels;
      const len = rendered.length;
      const sampleRate = rendered.sampleRate;
      const buffer = new ArrayBuffer(44 + len * numCh * 2);
      const view = new DataView(buffer);
      const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
      writeStr(0, "RIFF"); view.setUint32(4, 36 + len * numCh * 2, true); writeStr(8, "WAVE");
      writeStr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
      view.setUint16(22, numCh, true); view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numCh * 2, true); view.setUint16(32, numCh * 2, true);
      view.setUint16(34, 16, true); writeStr(36, "data"); view.setUint32(40, len * numCh * 2, true);
      let offset = 44;
      for (let i = 0; i < len; i++) {
        for (let ch = 0; ch < numCh; ch++) {
          const s = Math.max(-1, Math.min(1, rendered.getChannelData(ch)[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          offset += 2;
        }
      }
      const blob = new Blob([buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const track = { id: Date.now(), name: activeClip.name.replace(/\.[^.]+$/, "") + "_audio.wav", url, volume: 1 };
      setAudioTracks(p => [...p, track]);
      // Also download it
      const a = document.createElement("a"); a.href = url; a.download = track.name; a.click();
      audioCtx.close();
    } catch (err) {
      console.error("Could not extract audio:", err.message);
    }
  };

  const handleSplitClip = () => {
    if (!activeClip || currentTime <= 0 || currentTime >= activeClip.duration) return;
    const c1 = { ...activeClip, id: Date.now(), trimEnd: currentTime, duration: currentTime };
    const c2 = { ...activeClip, id: Date.now() + 1, trimStart: currentTime, duration: activeClip.duration - currentTime, startOffset: (activeClip.startOffset || 0) + currentTime };
    setClips(p => p.map(c => c.id === activeClip.id ? c1 : c).concat([c2]));
    setActiveClipId(c2.id);
  };

  const handleDeleteClip = () => {
    // Delete selected overlay first if exists
    if (selectedOverlayId) {
      handlePropertiesDelete(selectedOverlayId);
      return;
    }
    // Otherwise delete active clip
    if (!activeClip) return;
    setClips(p => { const r = p.filter(c => c.id !== activeClip.id); setActiveClipId(r[0]?.id || null); return r; });
    setIsPlaying(false); setCurrentTime(0);
  };

  const handleTrimClip = (clipId, trimStart, trimEnd) => {
    setClips(p => p.map(c => c.id === clipId ? { ...c, trimStart, trimEnd, duration: trimEnd - trimStart } : c));
    if (videoRef.current) { videoRef.current.currentTime = trimStart; setCurrentTime(trimStart); }
  };

  const handleMoveClip = (clipId, newOffset) => {
    setClips(p => p.map(c => c.id === clipId ? { ...c, startOffset: newOffset } : c));
  };

  // Move overlay item
  const moveOverlay = useCallback((id, x, y) => {
    setTextLayers(p => p.map(t => t.id === id ? { ...t, x, y } : t));
    setElements(p => p.map(el => el.id === id ? { ...el, x, y } : el));
  }, []);

  const handleChangeZIndex = useCallback((id, newZ) => {
    setTextLayers(p => p.map(t => t.id === id ? { ...t, zIndex: newZ } : t));
    setElements(p => p.map(el => el.id === id ? { ...el, zIndex: newZ } : el));
  }, []);

  const handleChangeRotation = useCallback((id, rotation) => {
    setTextLayers(p => p.map(t => t.id === id ? { ...t, rotation } : t));
    setElements(p => p.map(el => el.id === id ? { ...el, rotation } : el));
  }, []);

  const handleUpdateLayer = useCallback((id, changes) => {
    setTextLayers(p => p.map(t => t.id === id ? { ...t, ...changes } : t));
    setElements(p => p.map(el => el.id === id ? { ...el, ...changes } : el));
  }, []);

  // Panel callbacks
  const panelCallbacks = {
    onAddText: (t) => {
      const layer = { ...t, id: Date.now(), x: 50, y: 40 };
      setTextLayers(p => [...p, layer]);
      setSelectedOverlayId(layer.id);
    },
    onAddAudio: (track) => {
      const trackId = track.id || Date.now();
      const el = new Audio(track.url);
      el.crossOrigin = "anonymous";
      el.volume = track.volume ?? 1;
      el.preload = "metadata";
      
      const addTrackToState = (duration) => {
        const audioTrack = { ...track, id: trackId, duration: isNaN(duration) ? 30 : duration, startOffset: 0 };
        setAudioTracks(p => [...p, audioTrack]);
      };
      
      el.onloadedmetadata = () => addTrackToState(el.duration);
      el.onerror = () => addTrackToState(30);
      
      // Try to load immediately
      el.load();
      audioRefs.current[trackId] = el;
    },
    onRemoveAudio: (id) => {
      setAudioTracks(p => p.filter(t => t.id !== id));
    },
    onSetVolume: (id, vol) => {
      setAudioVolumes(p => ({ ...p, [id]: vol }));
      const el = audioRefs.current[id];
      if (el) el.volume = isMuted ? 0 : vol;
    },
    onUpdateVolumePoints: (id, points) => {
      setAudioTracks(p => p.map(t => t.id === id ? { ...t, volumePoints: points } : t));
    },
    onExtractAudio: handleExtractAudio,
    onApplyEffect: ({ filter }) => {
      setCssFilter(filter === "none" ? "" : filter);
    },
    onApplyFilter: ({ filter, opacity }) => {
      setCssFilter(filter === "none" ? "" : filter);
      setCssOpacity(opacity ?? 1);
    },
    onApplyTransition: (transition) => {
      setTransitions(p => [...p, { ...transition, id: Date.now(), appliedAt: currentTime }]);
    },
    onAddCaption: (c) => setCaptions(p => [...p, c]),
    onAddElement: (el) => {
      const item = { ...el, id: Date.now(), x: 50, y: 50 };
      setElements(p => [...p, item]);
      setSelectedOverlayId(item.id);
    },
    onApplyTemplate: (layers) => {
      const newLayers = layers.map(l => ({ ...l, id: Date.now() + Math.random() }));
      setTextLayers(newLayers);
      setSelectedOverlayId(null);
    },
  };

  const activeCaption = captions.find(c => currentTime >= c.startTime && currentTime <= c.endTime);

  // ── Determine selected item for PropertiesPanel ──
  const selectedTextLayer = textLayers.find(t => t.id === selectedOverlayId);
  const selectedElement = elements.find(el => el.id === selectedOverlayId);
  const selectedClip = activeClip;

  let selectedItem = null;
  if (selectedTextLayer) {
    selectedItem = { type: "text", data: selectedTextLayer };
  } else if (selectedElement) {
    selectedItem = { type: selectedElement.type === "sticker" ? "sticker" : "shape", data: selectedElement };
  } else if (selectedClip) {
    selectedItem = { type: "clip", data: selectedClip };
  }

  const handlePropertiesUpdate = (id, changes) => {
    // Update text layer
    if (textLayers.find(t => t.id === id)) {
      setTextLayers(p => p.map(t => t.id === id ? { ...t, ...changes } : t));
      return;
    }
    // Update element (shape/sticker)
    if (elements.find(el => el.id === id)) {
      setElements(p => p.map(el => el.id === id ? { ...el, ...changes } : el));
      return;
    }
    // Update clip
    if (clips.find(c => c.id === id)) {
      setClips(p => p.map(c => c.id === id ? { ...c, ...changes } : c));
      // Apply filter/opacity to video element immediately
      if (changes.filter !== undefined) setCssFilter(changes.filter || "");
      if (changes.opacity !== undefined) setCssOpacity(changes.opacity);
      if (changes.brightness !== undefined) {
        const clip = clips.find(c => c.id === id);
        const f = changes.filter ?? clip?.filter ?? "";
        setCssFilter(f ? f + ` brightness(${changes.brightness})` : `brightness(${changes.brightness})`);
      }
    }
  };

  const handlePropertiesDelete = (id) => {
    const deleted = setTextLayers(p => {
      if (p.find(t => t.id === id)) {
        return p.filter(t => t.id !== id);
      }
      return p;
    });
    setElements(p => {
      if (p.find(el => el.id === id)) {
        return p.filter(el => el.id !== id);
      }
      return p;
    });
    setSelectedOverlayId(null);
  };

  // Auto-save to localStorage every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (clips.length > 0 || textLayers.length > 0 || elements.length > 0) {
        const state = {
          clips,
          activeClipId,
          textLayers,
          elements,
          audioTracks,
          captions,
          transitions,
        };
        localStorage.setItem("videoEditorState", JSON.stringify(state));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [clips, activeClipId, textLayers, elements, audioTracks, captions, transitions]);

  // Build video CSS filter string
  const computedFilter = cssFilter || undefined;

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white overflow-hidden" style={{ userSelect: "none" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#151515] border-b border-[#2a2a2a] flex-shrink-0 h-12">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white text-sm font-medium truncate max-w-xs">{activeClip?.name || "Untitled video"}</span>
        </div>
        <button onClick={() => setShowExport(true)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00d4d4] hover:bg-[#00bfbf] text-black text-sm font-semibold transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <VideoSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <SidePanel
           activeTab={activeTab}
           clips={clips}
           activeClipId={activeClipId}
           onSelectClip={(id) => { setActiveClipId(id); setIsPlaying(false); setCurrentTime(0); }}
           onUpload={handleUploadFile}
           fileInputRef={fileInputRef}
           callbacks={panelCallbacks}
           currentTime={currentTime}
           hasVideoClip={activeClip?.type === "video"}
           videoRef={videoRef}
           audioTracks={audioTracks}
           videoVolume={volume}
           onVideoVolumeChange={setVolume}
         />

        {/* Center */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Preview */}
          <div ref={previewRef}
            className="flex-1 flex items-center justify-center bg-[#0d0d0d] relative overflow-hidden"
            onClick={() => setSelectedOverlayId(null)}>

            {activeClip ? (
              <>
                {activeClip.type === "video" ? (
                  <video
                    ref={videoRef}
                    className="max-h-full max-w-full"
                    onClick={e => { e.stopPropagation(); setIsPlaying(p => !p); }}
                    playsInline
                    style={{ cursor: "pointer", filter: computedFilter, opacity: cssOpacity, display: "block" }}
                  />
                ) : (
                  <img src={activeClip.url} alt="" className="max-h-full max-w-full"
                    style={{ filter: computedFilter, opacity: cssOpacity }} />
                )}

                {/* Text overlays */}
                {textLayers.filter(t => t.visible !== false).map(t => (
                  <DraggableItem key={t.id} item={t} isSelected={selectedOverlayId === t.id}
                    onSelect={setSelectedOverlayId} onMove={moveOverlay}
                    onDelete={(id) => setTextLayers(p => p.filter(x => x.id !== id))}
                    previewRef={previewRef}>
                    <div style={{
                      fontFamily: t.font || "Arial",
                      fontSize: `${t.fontSize || 32}px`,
                      color: t.color || "#ffffff",
                      fontWeight: t.bold ? "bold" : "normal",
                      fontStyle: t.italic ? "italic" : "normal",
                      textAlign: t.align || "center",
                      background: (t.bg && t.bg !== "transparent") ? t.bg : "transparent",
                      padding: (t.bg && t.bg !== "transparent") ? "4px 12px" : "0",
                      borderRadius: 6,
                      textShadow: "0 2px 6px rgba(0,0,0,0.9)",
                      whiteSpace: "nowrap",
                      lineHeight: 1.2,
                      transform: `rotate(${t.rotation || 0}deg)`,
                      zIndex: t.zIndex || 20,
                    }}>{t.text}</div>
                  </DraggableItem>
                ))}

                {/* Element overlays */}
                {elements.filter(el => el.visible !== false).map(el => (
                  <DraggableItem key={el.id} item={el} isSelected={selectedOverlayId === el.id}
                    onSelect={setSelectedOverlayId} onMove={moveOverlay}
                    onDelete={(id) => setElements(p => p.filter(x => x.id !== id))}
                    previewRef={previewRef}>
                    {el.type === "sticker" ? (
                      <span style={{ fontSize: el.emojiSize || 48, lineHeight: 1, display: "block", opacity: el.opacity ?? 1, transform: `rotate(${el.rotation || 0}deg)`, zIndex: el.zIndex || 20 }}>{el.emoji}</span>
                    ) : (
                      <svg width={el.size || 60} height={el.size || 60} viewBox="0 0 24 24" style={{ color: el.color || "#00d4d4", display: "block", opacity: el.opacity ?? 1, transform: `rotate(${el.rotation || 0}deg)`, zIndex: el.zIndex || 20 }}>
                        {el.shape === "rect" && <rect x="1" y="1" width="22" height="22" rx="2" fill="currentColor"/>}
                        {el.shape === "circle" && <circle cx="12" cy="12" r="11" fill="currentColor"/>}
                        {el.shape === "triangle" && <polygon points="12 2 22 22 2 22" fill="currentColor"/>}
                        {el.shape === "star" && <polygon points="12 2 15 9 22 9 16 14 18 21 12 17 6 21 8 14 2 9 9 9" fill="currentColor"/>}
                        {el.shape === "heart" && <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/>}
                        {el.shape === "diamond" && <polygon points="12 2 22 12 12 22 2 12" fill="currentColor"/>}
                        {el.shape === "arrow" && <><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2.5"/><polyline points="13 5 20 12 13 19" stroke="currentColor" strokeWidth="2.5" fill="none"/></>}
                        {el.shape === "line" && <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="3"/>}
                      </svg>
                    )}
                  </DraggableItem>
                ))}

                {/* Caption */}
                {activeCaption && (
                  <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", color: "#fff", padding: "6px 16px", borderRadius: 8, fontSize: 15, fontWeight: 500, maxWidth: "80%", textAlign: "center", pointerEvents: "none" }}>
                    {activeCaption.text}
                  </div>
                )}

                {/* Filter status badge */}
                {cssFilter && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: "#00d4d4", color: "#000", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, pointerEvents: "none" }}>
                    FILTER ON
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 text-slate-600 cursor-pointer hover:text-slate-400 transition"
                onClick={() => fileInputRef.current?.click()}>
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                  <rect x="2" y="2" width="20" height="20" rx="3"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                <span className="text-sm">Click to upload media</span>
              </div>
            )}
          </div>

          <VideoToolbar
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(p => !p)}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={setVolume}
            onMuteToggle={() => setIsMuted(p => !p)}
            onSplit={handleSplitClip}
            onDelete={handleDeleteClip}
            hasClip={!!activeClip}
          />

          <MultiTrackTimeline
            clips={clips}
            audioTracks={audioTracks}
            activeClipId={activeClipId}
            onSelectClip={(id) => { setActiveClipId(id); setIsPlaying(false); setCurrentTime(0); }}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            onTrim={handleTrimClip}
            onMoveClip={handleMoveClip}
          />
        </div>

        {/* Layers Panel — far right */}
        <LayersPanel
          textLayers={textLayers}
          elements={elements}
          onUpdateLayer={handleUpdateLayer}
          onChangeZIndex={handleChangeZIndex}
          onChangeRotation={handleChangeRotation}
        />

        {/* Properties Panel — right side */}
        <PropertiesPanel
          selectedItem={selectedItem}
          onUpdate={handlePropertiesUpdate}
          onDelete={handlePropertiesDelete}
        />
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="video/*,image/*" multiple className="hidden"
        onChange={e => { Array.from(e.target.files || []).forEach(handleUploadFile); e.target.value = ""; }} />

      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} engine={exportEngine} activeClip={activeClip} />
      )}
    </div>
  );
}