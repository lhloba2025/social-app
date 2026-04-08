import React from "react";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`;
}

const ToolBtn = ({ title, onClick, disabled, active, children }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`w-7 h-7 flex items-center justify-center rounded transition
      ${active ? "text-[#00d4d4]" : "text-[#888] hover:text-white"}
      ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-[#2a2a2a] cursor-pointer"}`}
  >
    {children}
  </button>
);

export default function VideoToolbar({
  isPlaying, onPlayPause, currentTime, duration,
  volume, isMuted, onVolumeChange, onMuteToggle,
  onSplit, onDelete, hasClip
}) {
  return (
    <div className="flex items-center px-3 py-1.5 bg-[#1a1a1a] border-t border-b border-[#2a2a2a] gap-1 flex-shrink-0 h-10">
      {/* Left editing tools */}
      <div className="flex items-center gap-0.5">
        {/* Split at playhead */}
        <ToolBtn title="Split (S)" onClick={onSplit} disabled={!hasClip}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="2" x2="12" y2="22"/>
            <path d="M2 7l5-5 5 5M2 17l5 5 5-5"/>
          </svg>
        </ToolBtn>
        {/* Delete clip */}
        <ToolBtn title="Delete clip (Delete)" onClick={onDelete} disabled={!hasClip}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </ToolBtn>
        {/* Undo placeholder */}
        <ToolBtn title="Undo (Ctrl+Z)" disabled={!hasClip}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
        </ToolBtn>
        {/* Crop */}
        <ToolBtn title="Crop" disabled={!hasClip}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2v14a2 2 0 0 0 2 2h14"/>
            <path d="M18 22V8a2 2 0 0 0-2-2H2"/>
          </svg>
        </ToolBtn>
        {/* Flip */}
        <ToolBtn title="Flip" disabled={!hasClip}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
          </svg>
        </ToolBtn>
        {/* Speed */}
        <ToolBtn title="Speed" disabled={!hasClip}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </ToolBtn>
      </div>

      <div className="w-px h-5 bg-[#333] mx-1" />

      {/* Center: playback controls */}
      <div className="flex-1 flex items-center justify-center gap-3">
        {/* Rewind 5s */}
        <ToolBtn title="Back 5s" onClick={() => {}} disabled={!hasClip}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.11"/>
          </svg>
        </ToolBtn>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          disabled={!hasClip}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition
            ${hasClip ? "bg-white hover:bg-slate-200 cursor-pointer" : "bg-[#444] cursor-not-allowed"}`}
        >
          {isPlaying ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#000">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#000">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          )}
        </button>

        {/* Forward 5s */}
        <ToolBtn title="Forward 5s" onClick={() => {}} disabled={!hasClip}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4.11"/>
          </svg>
        </ToolBtn>

        {/* Time display */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <span className="text-[#00d4d4]">{formatTime(currentTime)}</span>
          <span className="text-[#444]">|</span>
          <span className="text-[#666]">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="w-px h-5 bg-[#333] mx-1" />

      {/* Right: volume + fullscreen */}
      <div className="flex items-center gap-1">
        {/* Mute toggle */}
        <ToolBtn title="Mute/Unmute" onClick={onMuteToggle}>
          {isMuted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={volume > 0 ? "#00d4d4" : "#888"} strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>}
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </ToolBtn>

        {/* Volume slider */}
        <input
          type="range" min="0" max="1" step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => { onVolumeChange(parseFloat(e.target.value)); if (parseFloat(e.target.value) > 0 && isMuted) onMuteToggle(); }}
          className="w-16 h-1 accent-[#00d4d4] cursor-pointer"
        />

        {/* Fullscreen */}
        <ToolBtn title="Fullscreen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </ToolBtn>
        {/* Picture in picture */}
        <ToolBtn title="Mini Player">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <rect x="14" y="11" width="7" height="5" rx="1"/>
          </svg>
        </ToolBtn>
      </div>
    </div>
  );
}