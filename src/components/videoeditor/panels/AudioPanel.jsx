import React, { useRef, useState } from "react";
import VolumeEnvelopeEditor from "@/components/videoeditor/VolumeEnvelopeEditor";

const SAMPLE_SOUNDS = [
  { name: "Upbeat Pop", duration: "0:32", emoji: "🎵" },
  { name: "Cinematic Drama", duration: "1:05", emoji: "🎬" },
  { name: "Lo-Fi Chill", duration: "2:10", emoji: "🎧" },
  { name: "Epic Trailer", duration: "0:58", emoji: "🔥" },
  { name: "Soft Piano", duration: "1:20", emoji: "🎹" },
];

export default function AudioPanel({ onAddAudio, onRemoveAudio, onSetVolume, onUpdateVolumePoints, onExtractAudio, hasVideoClip, audioTracks = [], videoVolume, onVideoVolumeChange }) {
  const fileInputRef = useRef(null);
  const [extracting, setExtracting] = useState(false);
  const [expandedEnvelope, setExpandedEnvelope] = useState(null); // track id

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const track = { id: Date.now(), name: file.name, url, volume: 1 };
    onAddAudio?.(track);
    e.target.value = "";
  };

  const handleExtract = async () => {
    setExtracting(true);
    await onExtractAudio?.();
    setExtracting(false);
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-sm text-white">
      {/* Upload */}
      <button onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#333] bg-[#252525] hover:bg-[#2e2e2e] text-[#00d4d4] font-semibold text-sm transition">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Upload Audio File
      </button>
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleUpload} />

      {/* Video Volume Control */}
      {hasVideoClip && (
        <div className="bg-[#252525] rounded-xl p-3 flex flex-col gap-2 border border-[#333]">
          <div className="flex items-center gap-2">
            <span className="text-base">🎬</span>
            <span className="text-xs text-white flex-1">صوت الفيديو</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <input
              type="range" min="0" max="1" step="0.05"
              value={videoVolume ?? 1}
              onChange={e => onVideoVolumeChange?.(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-[#00d4d4] cursor-pointer"
            />
            <span className="text-[10px] text-[#888] w-8">{Math.round((videoVolume ?? 1) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Extract audio from video */}
      {hasVideoClip && (
        <button onClick={handleExtract} disabled={extracting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#00d4d4]/40 bg-[#00d4d4]/10 hover:bg-[#00d4d4]/20 text-[#00d4d4] font-semibold text-sm transition disabled:opacity-50">
          {extracting ? (
            <><div className="w-4 h-4 border-2 border-[#00d4d4] border-t-transparent rounded-full animate-spin"/><span>Extracting…</span></>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg><span>Extract Audio from Video</span></>
          )}
        </button>
      )}

      {/* Tracks */}
      {audioTracks.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider">Your Tracks</p>
          {audioTracks.map(t => (
            <div key={t.id} className="bg-[#252525] rounded-xl p-3 flex flex-col gap-2 border border-[#333]">
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="text-base">🎵</span>
                <span className="text-xs text-white truncate flex-1">{t.name}</span>
                <button
                  onClick={() => setExpandedEnvelope(expandedEnvelope === t.id ? null : t.id)}
                  title="Volume Envelope"
                  className={`text-[10px] px-1.5 py-0.5 rounded-md border transition flex-shrink-0 ${expandedEnvelope === t.id ? "border-[#00d4d4] text-[#00d4d4] bg-[#00d4d4]/10" : "border-[#444] text-[#888] hover:text-[#00d4d4] hover:border-[#00d4d4]"}`}
                >
                  ~ ENV
                </button>
                <button onClick={() => onRemoveAudio?.(t.id)}
                  className="text-[#555] hover:text-red-400 text-sm flex-shrink-0">✕</button>
              </div>

              {/* Base volume slider */}
              <div className="flex items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={t.audioVolume ?? t.volume ?? 1}
                  onChange={e => onSetVolume?.(t.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-[#00d4d4] cursor-pointer"
                />
                <span className="text-[10px] text-[#888] w-8">{Math.round((t.audioVolume ?? t.volume ?? 1) * 100)}%</span>
              </div>

              {/* Volume Envelope Editor */}
              {expandedEnvelope === t.id && (
                <VolumeEnvelopeEditor
                  track={t}
                  duration={30}
                  onUpdatePoints={onUpdateVolumePoints}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="w-full h-px bg-[#2a2a2a]" />
      <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider">Sample Sounds</p>
      {SAMPLE_SOUNDS.map(s => (
        <div key={s.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#252525] hover:bg-[#2e2e2e] transition cursor-default border border-transparent hover:border-[#333]">
          <span className="text-xl">{s.emoji}</span>
          <div className="flex-1">
            <p className="text-xs font-medium text-white">{s.name}</p>
            <p className="text-[10px] text-[#555]">{s.duration}</p>
          </div>
        </div>
      ))}
    </div>
  );
}