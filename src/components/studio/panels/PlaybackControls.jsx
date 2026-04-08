import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Rewind, 
  FastForward, 
  Repeat,
  Volume2,
  VolumeX
} from "lucide-react";

export default function PlaybackControls({ 
  isPlaying, 
  onPlayPause, 
  currentTime, 
  duration,
  onSeek,
  volume,
  onVolumeChange,
  onSkipBack,
  onSkipForward,
  language 
}) {
  const isRtl = language === "ar";
  
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSkipBack = () => {
    onSeek(Math.max(0, currentTime - 5));
  };

  const handleSkipForward = () => {
    onSeek(Math.min(duration, currentTime + 5));
  };

  const handleRewind = () => {
    onSeek(Math.max(0, currentTime - 1));
  };

  const handleFastForward = () => {
    onSeek(Math.min(duration, currentTime + 1));
  };

  return (
    <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
      {/* Playback buttons */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleSkipBack}
          title={isRtl ? "ارجع 5 ثواني" : "Skip back 5s"}
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleRewind}
          title={isRtl ? "ارجع ثانية" : "Rewind 1s"}
        >
          <Rewind className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant={isPlaying ? "secondary" : "default"}
          className="h-10 w-10 p-0 rounded-full"
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleFastForward}
          title={isRtl ? "قدم ثانية" : "Fast forward 1s"}
        >
          <FastForward className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleSkipForward}
          title={isRtl ? "قدم 5 ثواني" : "Skip forward 5s"}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Time display */}
      <div className="flex-1 flex items-center gap-2 bg-slate-900/50 rounded px-3 py-1">
        <span className="text-xs font-mono text-indigo-400">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs text-slate-500">/</span>
        <span className="text-xs font-mono text-slate-300">
          {formatTime(duration)}
        </span>
      </div>

      {/* Volume control */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => onVolumeChange(volume === 0 ? 100 : 0)}
        >
          {volume === 0 ? (
            <VolumeX className="w-4 h-4 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => onVolumeChange(parseInt(e.target.value))}
          className="w-20 h-1 rounded-lg appearance-none cursor-pointer bg-slate-700"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${volume}%, #334155 ${volume}%, #334155 100%)`
          }}
        />
      </div>
    </div>
  );
}