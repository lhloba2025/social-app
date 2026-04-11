import React, { useRef, useState } from "react";
import { Upload, Film, Music, Image, Type, ImagePlus } from "lucide-react";

function fmtDur(s) {
  if (!s || isNaN(s)) return "--:--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function VEMediaPanel({ mediaFiles, onUpload, onAddToTimeline, onAddText, onAddLogo, lang = "ar" }) {
  const inputRef = useRef(null);
  const logoInputRef = useRef(null);
  const [over, setOver] = useState(false);
  const ar = lang === "ar";
  const T = ar ? {
    media: "الوسائط",
    dropHint: "انقر أو اسحب\nفيديو / صورة / صوت",
    addText: "إضافة نص",
    addLogo: "إضافة شعار / علامة مائية",
    noMedia: "لا توجد وسائط",
  } : {
    media: "Media",
    dropHint: "Click or drop\nvideo / image / audio",
    addText: "Add Text Overlay",
    addLogo: "Add Logo / Watermark",
    noMedia: "No media yet",
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files);
  };

  return (
    <div className="w-52 flex flex-col bg-[#1e1e1e] border-r border-[#383838] flex-shrink-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-[#383838] flex-shrink-0">
        <span className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest">{T.media}</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`mx-3 mt-3 mb-2 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-4 gap-1.5 transition flex-shrink-0
          ${over ? "border-[#00d4d4] bg-[#00d4d4]/8" : "border-[#383838] hover:border-[#3a3a3a]"}`}
      >
        <Upload size={15} className="text-[#888]" />
        <p className="text-[9px] text-[#888] text-center leading-relaxed">
          {T.dropHint.split("\n").map((line, i) => <React.Fragment key={i}>{line}{i === 0 && <br />}</React.Fragment>)}
        </p>
      </div>
      <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" multiple className="hidden"
        onChange={e => { onUpload(e.target.files); e.target.value = ""; }} />

      {/* Add Text button */}
      <button
        onClick={onAddText}
        className="mx-3 mb-1.5 flex items-center justify-center gap-2 py-2 rounded-xl border border-[#8a6a25]/50 text-[#e8c87a] hover:border-[#e8c87a] hover:bg-[#e8c87a]/5 transition text-[10px] font-semibold flex-shrink-0"
      >
        <Type size={13} />
        {T.addText}
      </button>

      {/* Add Logo button */}
      <button
        onClick={() => logoInputRef.current?.click()}
        className="mx-3 mb-3 flex items-center justify-center gap-2 py-2 rounded-xl border border-[#8a2a55]/50 text-[#e87ab8] hover:border-[#e87ab8] hover:bg-[#e87ab8]/5 transition text-[10px] font-semibold flex-shrink-0"
      >
        <ImagePlus size={13} />
        {T.addLogo}
      </button>
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files[0]) { onAddLogo(e.target.files[0]); e.target.value = ""; } }} />

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
        {mediaFiles.length === 0 && (
          <p className="text-[9px] text-[#666] text-center mt-4">{T.noMedia}</p>
        )}
        {mediaFiles.map(m => (
          <div
            key={m.id}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData("mediaFileId", m.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onAddToTimeline(m)}
            title={`${m.name} — click to add`}
            className="rounded-lg overflow-hidden bg-[#1e1e1e] border border-[#333] hover:border-[#00d4d4]/40 cursor-pointer transition group flex-shrink-0"
          >
            {/* Thumb */}
            <div className="w-full h-[68px] bg-[#0d0d0d] flex items-center justify-center relative overflow-hidden">
              {m.thumbnail
                ? <img src={m.thumbnail} className="w-full h-full object-cover" alt="" />
                : <div className="text-[#2a2a2a]">
                    {m.type === "video" ? <Film size={22} /> : m.type === "audio" ? <Music size={22} /> : <Image size={22} />}
                  </div>
              }
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="opacity-0 group-hover:opacity-100 transition drop-shadow-lg">
                  <polygon points="8 5 19 12 8 19 8 5" />
                </svg>
              </div>
            </div>
            {/* Info */}
            <div className="px-2 py-1 flex items-center gap-1.5">
              <span className="text-[9px]">{m.type === "video" ? "🎬" : m.type === "audio" ? "🎵" : "🖼"}</span>
              <span className="text-[9px] text-[#ccc] truncate flex-1">{m.name.replace(/\.[^.]+$/, "")}</span>
              <span className="text-[8px] text-[#888] font-mono flex-shrink-0">{fmtDur(m.duration)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
