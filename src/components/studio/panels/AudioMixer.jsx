import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Trash2, Volume2, Zap } from "lucide-react";

export default function AudioMixer({ tracks, onUpdateTrack, language }) {
  const isRtl = language === "ar";
  const [expandedTrack, setExpandedTrack] = useState(null);
  const [eqPresets] = useState([
    {
      id: "flat",
      name: isRtl ? "مسطح" : "Flat",
      bands: { bass: 0, mids: 0, treble: 0 },
    },
    {
      id: "bass_boost",
      name: isRtl ? "تعزيز الباص" : "Bass Boost",
      bands: { bass: 10, mids: 0, treble: -5 },
    },
    {
      id: "bright",
      name: isRtl ? "مشرق" : "Bright",
      bands: { bass: -5, mids: 5, treble: 10 },
    },
    {
      id: "warm",
      name: isRtl ? "دافئ" : "Warm",
      bands: { bass: 5, mids: 8, treble: -3 },
    },
    {
      id: "podcast",
      name: isRtl ? "بودكاست" : "Podcast",
      bands: { bass: -5, mids: 10, treble: 5 },
    },
  ]);

  const handleTrackUpdate = (trackId, field, value) => {
    onUpdateTrack(trackId, { ...tracks.find(t => t.id === trackId), [field]: value });
  };

  const applyEQPreset = (trackId, preset) => {
    const track = tracks.find(t => t.id === trackId);
    onUpdateTrack(trackId, {
      ...track,
      eq: preset.bands,
    });
  };

  return (
    <div className="space-y-3">
      {/* معلومات عامة */}
      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
        <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          {isRtl ? "مكسر الصوت" : "Audio Mixer"}
        </div>
        <p className="text-xs text-slate-400">
          {isRtl
            ? "تحكم بمستويات الصوت وتطبيق معادل للتأثيرات الاحترافية"
            : "Control audio levels and apply EQ for professional sound"}
        </p>
      </div>

      {/* المسارات الصوتية */}
      <div className="space-y-2">
        {tracks.map((track) => (
          <div key={track.id} className="bg-slate-700/30 border border-slate-700 rounded-lg overflow-hidden">
            {/* رأس المسار */}
            <div
              onClick={() =>
                setExpandedTrack(
                  expandedTrack === track.id ? null : track.id
                )
              }
              className="p-2 cursor-pointer hover:bg-slate-700/50 transition flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="text-lg">
                    {track.type === "video" ? "📹" : "🎵"}
                  </span>
                  <span className="capitalize">
                    {track.type === "video"
                      ? isRtl
                        ? "الفيديو الرئيسي"
                        : "Main Video"
                      : track.name || "Audio"}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  {track.volume}% {track.fadeIn ? `| ${isRtl ? "تلاشي دخول" : "Fade In"}: ${track.fadeIn}s` : ""}
                </p>
              </div>
              <span className="text-slate-400">
                {expandedTrack === track.id ? "▼" : "▶"}
              </span>
            </div>

            {/* التفاصيل الموسعة */}
            {expandedTrack === track.id && (
              <div className="border-t border-slate-600 p-3 space-y-3 bg-slate-800/30">
                {/* مستوى الصوت الرئيسي */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300">
                      {isRtl ? "مستوى الصوت" : "Volume"}
                    </label>
                    <span className="text-xs text-cyan-400 font-semibold">
                      {track.volume}%
                    </span>
                  </div>
                  <Slider
                    value={[track.volume || 100]}
                    onValueChange={(val) =>
                      handleTrackUpdate(track.id, "volume", val[0])
                    }
                    min={0}
                    max={150}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Fade In */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <span>📈</span>
                      {isRtl ? "تلاشي الدخول" : "Fade In"}
                    </label>
                    <span className="text-xs text-indigo-400">
                      {track.fadeIn ? `${track.fadeIn}s` : isRtl ? "معطل" : "Off"}
                    </span>
                  </div>
                  <Slider
                    value={[track.fadeIn || 0]}
                    onValueChange={(val) =>
                      handleTrackUpdate(track.id, "fadeIn", val[0])
                    }
                    min={0}
                    max={5}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Fade Out */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <span>📉</span>
                      {isRtl ? "تلاشي الخروج" : "Fade Out"}
                    </label>
                    <span className="text-xs text-pink-400">
                      {track.fadeOut ? `${track.fadeOut}s` : isRtl ? "معطل" : "Off"}
                    </span>
                  </div>
                  <Slider
                    value={[track.fadeOut || 0]}
                    onValueChange={(val) =>
                      handleTrackUpdate(track.id, "fadeOut", val[0])
                    }
                    min={0}
                    max={5}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* EQ Presets */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1 mb-2">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    {isRtl ? "معادل الصوت" : "Equalizer"}
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {eqPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyEQPreset(track.id, preset)}
                        className="px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 transition"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* عناصر التحكم اليدوية في المعادل */}
                {(track.eq || {}).bass !== undefined && (
                  <div className="border-t border-slate-600 pt-3 space-y-2">
                    <p className="text-xs text-slate-400">
                      {isRtl ? "تحكم يدوي" : "Manual Control"}
                    </p>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">
                          {isRtl ? "باص" : "Bass"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {track.eq?.bass || 0}
                        </span>
                      </div>
                      <Slider
                        value={[track.eq?.bass || 0]}
                        onValueChange={(val) =>
                          handleTrackUpdate(track.id, "eq", {
                            ...track.eq,
                            bass: val[0],
                          })
                        }
                        min={-12}
                        max={12}
                        step={1}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">
                          {isRtl ? "الوسط" : "Mids"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {track.eq?.mids || 0}
                        </span>
                      </div>
                      <Slider
                        value={[track.eq?.mids || 0]}
                        onValueChange={(val) =>
                          handleTrackUpdate(track.id, "eq", {
                            ...track.eq,
                            mids: val[0],
                          })
                        }
                        min={-12}
                        max={12}
                        step={1}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">
                          {isRtl ? "الحدة" : "Treble"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {track.eq?.treble || 0}
                        </span>
                      </div>
                      <Slider
                        value={[track.eq?.treble || 0]}
                        onValueChange={(val) =>
                          handleTrackUpdate(track.id, "eq", {
                            ...track.eq,
                            treble: val[0],
                          })
                        }
                        min={-12}
                        max={12}
                        step={1}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* نصيحة */}
      <div className="text-xs text-slate-400 p-2 bg-slate-800/30 rounded border border-slate-700/50">
        💡 {isRtl
          ? "استخدم معادل الصوت لتحسين الوضوح وجودة الصوت في المشروع"
          : "Use EQ to enhance clarity and overall audio quality"}
      </div>
    </div>
  );
}