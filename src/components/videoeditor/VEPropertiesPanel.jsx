import React, { useState } from "react";

const FILTER_PRESETS = [
  { id: "none",    label: "None",    css: "" },
  { id: "vivid",   label: "Vivid",   css: "saturate(1.6) contrast(1.1)" },
  { id: "cinema",  label: "Cinema",  css: "contrast(1.3) saturate(0.8) brightness(0.95)" },
  { id: "drama",   label: "Drama",   css: "contrast(1.5) saturate(0.6) brightness(0.85)" },
  { id: "mono",    label: "Mono",    css: "grayscale(1) contrast(1.1)" },
  { id: "warm",    label: "Warm",    css: "sepia(0.4) saturate(1.3) brightness(1.05)" },
  { id: "cool",    label: "Cool",    css: "hue-rotate(200deg) saturate(1.2)" },
  { id: "faded",   label: "Faded",   css: "brightness(1.1) saturate(0.6) contrast(0.9)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.5) contrast(1.1) brightness(0.95)" },
  { id: "night",   label: "Night",   css: "brightness(0.65) contrast(1.35) hue-rotate(220deg)" },
  { id: "golden",  label: "Golden",  css: "sepia(0.7) saturate(1.5) brightness(1.1)" },
  { id: "retro",   label: "Retro",   css: "sepia(0.3) hue-rotate(-20deg) saturate(1.4)" },
];

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];
const TRANSITION_TYPES = ["none", "fade", "dissolve", "flash", "zoom"];
const FONT_FAMILIES_LATIN   = ["Arial", "Georgia", "Courier New", "Impact", "Verdana", "Times New Roman"];
const FONT_FAMILIES_ARABIC  = ["Cairo", "Tajawal", "Almarai", "Readex Pro", "Noto Kufi Arabic", "El Messiri", "Amiri", "Mada", "IBM Plex Sans Arabic", "Changa", "Reem Kufi", "Noto Naskh Arabic"];
const TEXT_ANIMATIONS = ["none", "fade", "slide-up", "slide-down", "zoom", "typewriter"];

const COLOR_PALETTE = [
  "#ffffff","#000000","#ff3b30","#ff9500","#ffcc00",
  "#34c759","#00c7be","#007aff","#5856d6","#ff2d55",
  "#af52de","#a2845e",
];

function Label({ children }) {
  return <p className="text-[10px] font-semibold text-[#aaa] uppercase tracking-wide mb-1">{children}</p>;
}

function Slider({ label, value, min, max, step = 1, def = 0, fmt, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  const isDefault = value === def;
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <div className="flex items-center justify-between h-4">
          <span className="text-[11px] text-[#ccc]">{label}</span>
          <div className="flex items-center gap-1">
            <span className={`text-[11px] font-mono w-9 text-right ${isDefault ? "text-[#777]" : "text-[#00d4d4]"}`}>
              {fmt ? fmt(value) : value}
            </span>
            {!isDefault && (
              <button
                onClick={() => onChange(def)}
                title="Reset"
                className="w-3.5 h-3.5 rounded-full border border-[#555] hover:border-[#00d4d4] text-[#888] hover:text-[#00d4d4] flex items-center justify-center transition"
              >
                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 .49-4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded cursor-pointer"
        style={{
          accentColor: "#00d4d4",
          background: `linear-gradient(to right, ${isDefault ? "#3a3a3a" : "#00d4d4"} ${pct}%, #252525 ${pct}%)`,
        }}
      />
    </div>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition
        ${active ? "border-[#00d4d4] text-[#00d4d4] bg-[#00d4d4]/10" : "border-[#333] text-[#aaa] hover:border-[#555] hover:text-white"}`}
    >
      {children}
    </button>
  );
}

function fmtDur(s) {
  if (!s || isNaN(s)) return "--";
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${parseFloat(sec) < 10 ? "0" : ""}${sec}`;
}

const TABS_AR = { color: "لون", transform: "تحويل", speed: "سرعة", audio: "صوت", transition: "انتقال", text: "نص", logo: "شعار" };
const TABS_EN = { color: "Color", transform: "Transform", speed: "Speed", audio: "Audio", transition: "Transition", text: "Text", logo: "Logo" };

export default function VEPropertiesPanel({ clip, onUpdateClip, lang = "ar" }) {
  const [tab, setTab] = useState("color");
  const ar = lang === "ar";
  const T = ar ? {
    selectClip: "اختر كليباً\nلتعديل خصائصه",
    tabNames: TABS_AR,
    // TEXT tab
    content: "النص", fontFamily: "الخط", fontSize: "حجم الخط",
    textColor: "لون النص", background: "خلفية", align: "محاذاة",
    positionY: "موضع Y", animation: "حركة",
    placeholder: "اكتب النص...",
    // LOGO tab
    position: "الموضع", sizeVisibility: "الحجم والشفافية",
    quickPositions: "مواضع سريعة", duration: "المدة (ثانية)",
    colorAdjust: "ضبط الألوان", tintColor: "لون التلوين",
    tintHint: "اختر لوناً لتلوين الشعار",
    scale: "حجم", opacity: "شفافية",
    brightness: "إضاءة", saturation: "إشباع", hueRotate: "دوران اللون",
    strength: "قوة",
    // COLOR tab
    filters: "فلاتر", adjustments: "تعديلات",
    resetAll: "إعادة ضبط الكل",
    exposure: "تعرض", contrast: "تباين",
    warmth: "دفء", tint: "درجة لون", sharpen: "حدة", fade: "تلاشي", vignette: "إطار",
    // TRANSFORM tab
    rotation: "دوران", flip: "قلب",
    flipH: "↔ أفقي", flipV: "↕ عمودي",
    resetTransforms: "إعادة ضبط التحويلات",
    // SPEED tab
    playbackSpeed: "سرعة التشغيل", presets: "اختيارات سريعة",
    // AUDIO tab
    clipVolume: "صوت الكليب", volume: "الصوت",
    fadeIn: "بداية تدريجية", fadeOut: "نهاية تدريجية",
    audioTip: "100% = الصوت الأصلي\n150% = مرفوع\nالتدريجي = دخول/خروج سلس",
    // TRANSITION tab
    transitionOut: "انتقال خروج", transitionIn: "انتقال دخول",
    transitionDuration: "مدة الانتقال",
    transitionTip: "fade — تلاشي للأسود\ndissolve — تلاشي متقاطع\nflash — وميض أبيض\nzoom — تكبير/تصغير",
    reset: "إعادة ضبط",
    // TEXT animations
    animations: { none: "بدون", fade: "تلاشي", "slide-up": "صعود", "slide-down": "هبوط", zoom: "تكبير", typewriter: "آلة كاتبة" },
    // Transitions
    transitions: { none: "بدون", fade: "تلاشي", dissolve: "ذوبان", flash: "وميض", zoom: "تكبير" },
  } : {
    selectClip: "Select a clip\nto edit properties",
    tabNames: TABS_EN,
    content: "Content", fontFamily: "Font Family", fontSize: "Font Size",
    textColor: "Text Color", background: "Background", align: "Align",
    positionY: "Position Y", animation: "Animation",
    placeholder: "Enter text...",
    position: "Position", sizeVisibility: "Size & Visibility",
    quickPositions: "Quick Positions", duration: "Duration (seconds)",
    colorAdjust: "Color Adjustments", tintColor: "Tint Color",
    tintHint: "Pick a color to tint the logo",
    scale: "Scale", opacity: "Opacity",
    brightness: "Brightness", saturation: "Saturation", hueRotate: "Hue Rotate",
    strength: "Strength",
    filters: "Filters", adjustments: "Adjustments",
    resetAll: "Reset All",
    exposure: "Exposure", contrast: "Contrast",
    warmth: "Warmth", tint: "Tint", sharpen: "Sharpen", fade: "Fade", vignette: "Vignette",
    rotation: "Rotation", flip: "Flip",
    flipH: "↔ Flip H", flipV: "↕ Flip V",
    resetTransforms: "Reset All Transforms",
    playbackSpeed: "Playback Speed", presets: "Presets",
    clipVolume: "Clip Volume", volume: "Volume",
    fadeIn: "Fade In", fadeOut: "Fade Out",
    audioTip: "Volume 100% = original\nVolume 150% = boosted\nFade in/out = smooth start/end",
    transitionOut: "Transition Out", transitionIn: "Transition In",
    transitionDuration: "Duration",
    transitionTip: "fade — fade to/from black\ndissolve — cross-dissolve\nflash — flash to white\nzoom — zoom in/out",
    reset: "Reset",
    animations: { none: "none", fade: "fade", "slide-up": "slide up", "slide-down": "slide down", zoom: "zoom", typewriter: "typewriter" },
    transitions: { none: "none", fade: "fade", dissolve: "dissolve", flash: "flash", zoom: "zoom" },
  };

  if (!clip) {
    return (
      <div className="w-full h-full bg-[#141414] border-l border-[#222] flex items-center justify-center">
        <p className="text-[11px] text-[#aaa] text-center px-5 leading-relaxed">
          {T.selectClip.split("\n").map((l, i) => <React.Fragment key={i}>{l}{i === 0 && <br />}</React.Fragment>)}
        </p>
      </div>
    );
  }

  const set = (patch) => onUpdateClip(clip.id, patch);
  const dur = (clip.type === "text" || clip.type === "logo")
    ? (clip.trimEnd ?? clip.duration ?? 5) - (clip.trimStart ?? 0)
    : ((clip.trimEnd ?? clip.duration) - (clip.trimStart ?? 0)) / (clip.speed ?? 1);

  // Determine available tabs based on clip type
  const tabs =
    clip.type === "text"  ? ["text", "transform", "transition"] :
    clip.type === "logo"  ? ["logo", "transform"] :
    clip.type === "audio" ? ["audio", "transition"] :
    ["color", "transform", "speed", "audio", "transition"];

  // Make sure current tab is valid for this clip type
  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  return (
    <div className="w-full h-full bg-[#141414] border-l border-[#222] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#222] flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px]">
          {clip.type === "video" ? "🎬" : clip.type === "audio" ? "🎵" : clip.type === "text" ? "T" : clip.type === "logo" ? "⬡" : "🖼"}
        </span>
        <span className="text-[11px] text-[#ddd] truncate flex-1">
          {clip.type === "text" ? (clip.textContent ?? "Text clip").slice(0, 20) : clip.name.replace(/\.[^.]+$/, "")}
        </span>
        <span className="text-[10px] text-[#888] font-mono">{fmtDur(dur)}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#222] flex-shrink-0 flex-wrap">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition min-w-0
              ${activeTab === t ? "border-[#00d4d4] text-[#00d4d4]" : "border-transparent text-[#888] hover:text-[#ccc]"}`}
          >
            {T.tabNames[t] ?? t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ─── TEXT TAB ─── */}
        {activeTab === "text" && (
          <div className="p-3 flex flex-col gap-3">
            <div>
              <Label>{T.content}</Label>
              <textarea
                value={clip.textContent ?? ""}
                onChange={e => set({ textContent: e.target.value })}
                rows={3}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded-lg text-white text-xs p-2 resize-none focus:outline-none focus:border-[#00d4d4] transition"
                placeholder={T.placeholder}
                dir="auto"
              />
            </div>

            <div>
              <Label>{T.fontFamily}</Label>
              <select
                value={clip.fontFamily ?? "Arial"}
                onChange={e => set({ fontFamily: e.target.value })}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded-lg text-[#aaa] text-[10px] px-2 py-1.5 focus:outline-none focus:border-[#00d4d4] transition cursor-pointer"
              >
                <optgroup label="─── عربي / Arabic ───" style={{ color: "#e8c87a" }}>
                  {FONT_FAMILIES_ARABIC.map(f => <option key={f} value={f}>{f}</option>)}
                </optgroup>
                <optgroup label="─── Latin ───" style={{ color: "#7ab8e8" }}>
                  {FONT_FAMILIES_LATIN.map(f => <option key={f} value={f}>{f}</option>)}
                </optgroup>
              </select>
            </div>

            <Slider label={T.fontSize} value={clip.fontSize ?? 40} min={10} max={120} step={1} def={40}
              fmt={v => `${v}px`} onChange={v => set({ fontSize: v })} />

            <div className="flex gap-2">
              <ToggleBtn active={clip.fontWeight === "bold"} onClick={() => set({ fontWeight: clip.fontWeight === "bold" ? "normal" : "bold" })}>
                <b>B</b>
              </ToggleBtn>
              <ToggleBtn active={clip.fontStyle === "italic"} onClick={() => set({ fontStyle: clip.fontStyle === "italic" ? "normal" : "italic" })}>
                <i>I</i>
              </ToggleBtn>
              <ToggleBtn
                active={(clip.textDirection ?? "ltr") === "rtl"}
                onClick={() => set({ textDirection: (clip.textDirection ?? "ltr") === "rtl" ? "ltr" : "rtl" })}
              >
                RTL عر
              </ToggleBtn>
            </div>

            <div>
              <Label>{T.textColor}</Label>
              <div className="grid grid-cols-6 gap-1 mb-1">
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => set({ fontColor: c })}
                    style={{ background: c }}
                    className={`w-full aspect-square rounded border-2 transition ${(clip.fontColor ?? "#ffffff") === c ? "border-[#00d4d4] scale-110" : "border-transparent hover:scale-105"}`}
                  />
                ))}
              </div>
              <input
                type="color"
                value={clip.fontColor ?? "#ffffff"}
                onChange={e => set({ fontColor: e.target.value })}
                className="w-full h-7 rounded cursor-pointer border border-[#2a2a2a] bg-transparent"
              />
            </div>

            <div>
              <Label>{T.background}</Label>
              <div className="flex gap-2 items-center mb-1">
                <input
                  type="color"
                  value={clip.textBgColor ?? "#000000"}
                  onChange={e => set({ textBgColor: e.target.value })}
                  className="w-8 h-7 rounded cursor-pointer border border-[#2a2a2a] bg-transparent flex-shrink-0"
                />
                <Slider label="" value={Math.round((clip.textBgOpacity ?? 0) * 100)} min={0} max={100} step={1} def={0}
                  fmt={v => `${v}%`} onChange={v => set({ textBgOpacity: v / 100 })} />
              </div>
            </div>

            <div>
              <Label>{T.align}</Label>
              <div className="flex gap-1">
                {["left", "center", "right"].map(a => (
                  <ToggleBtn key={a} active={(clip.textAlign ?? "center") === a} onClick={() => set({ textAlign: a })}>
                    {a === "left" ? "≡←" : a === "center" ? "≡" : "≡→"}
                  </ToggleBtn>
                ))}
              </div>
            </div>

            <div>
              <Label>{T.positionY}</Label>
              <Slider label="" value={clip.posY ?? 80} min={0} max={100} step={1} def={80}
                fmt={v => `${v}%`} onChange={v => set({ posY: v })} />
            </div>

            <div>
              <Label>{T.animation}</Label>
              <div className="grid grid-cols-2 gap-1">
                {TEXT_ANIMATIONS.map(a => (
                  <button
                    key={a}
                    onClick={() => set({ textAnimation: a })}
                    className={`py-1.5 rounded-lg text-[9px] border transition
                      ${(clip.textAnimation ?? "none") === a
                        ? "border-[#00d4d4] text-[#00d4d4] bg-[#00d4d4]/10"
                        : "border-[#333] text-[#bbb] hover:border-[#333] hover:text-white"}`}
                  >
                    {T.animations[a] ?? a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── LOGO TAB ─── */}
        {activeTab === "logo" && (
          <div className="p-3 flex flex-col gap-4">
            {clip.url && (
              <div className="rounded-xl overflow-hidden border border-[#333] bg-[#181818] flex items-center justify-center" style={{ height: 80 }}>
                <img src={clip.url} className="max-w-full max-h-full object-contain" alt="" />
              </div>
            )}

            <div>
              <Label>{T.position}</Label>
              <div className="flex flex-col gap-3">
                <Slider label="X" value={clip.posX ?? 85} min={0} max={100} step={1} def={85}
                  fmt={v => `${v}%`} onChange={v => set({ posX: v })} />
                <Slider label="Y" value={clip.posY ?? 10} min={0} max={100} step={1} def={10}
                  fmt={v => `${v}%`} onChange={v => set({ posY: v })} />
              </div>
            </div>

            <div className="h-px bg-[#1e1e1e]" />

            <div>
              <Label>{T.sizeVisibility}</Label>
              <div className="flex flex-col gap-3">
                <Slider label={T.scale} value={clip.scale ?? 100} min={5} max={200} step={1} def={100}
                  fmt={v => `${v}%`} onChange={v => set({ scale: v })} />
                <Slider label={T.opacity} value={Math.round((clip.opacity ?? 1) * 100)} min={0} max={100} step={1} def={100}
                  fmt={v => `${v}%`} onChange={v => set({ opacity: v / 100 })} />
              </div>
            </div>

            <div className="h-px bg-[#1e1e1e]" />

            <div>
              <Label>{T.quickPositions}</Label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: "↖ TL", posX: 10, posY: 10 },
                  { label: "↑ TC", posX: 50, posY: 10 },
                  { label: "↗ TR", posX: 90, posY: 10 },
                  { label: "← ML", posX: 10, posY: 50 },
                  { label: "⊙ C",  posX: 50, posY: 50 },
                  { label: "→ MR", posX: 90, posY: 50 },
                  { label: "↙ BL", posX: 10, posY: 90 },
                  { label: "↓ BC", posX: 50, posY: 90 },
                  { label: "↘ BR", posX: 90, posY: 90 },
                ].map(pos => (
                  <button
                    key={pos.label}
                    onClick={() => set({ posX: pos.posX, posY: pos.posY })}
                    className={`py-1.5 rounded-lg text-[9px] border transition
                      ${(clip.posX ?? 85) === pos.posX && (clip.posY ?? 10) === pos.posY
                        ? "border-[#e87ab8] text-[#e87ab8] bg-[#e87ab8]/10"
                        : "border-[#333] text-[#bbb] hover:border-[#3a3a3a] hover:text-white"}`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>{T.duration}</Label>
              <Slider label="" value={clip.trimEnd ?? clip.duration ?? 10} min={1} max={300} step={1} def={10}
                fmt={v => `${v}s`} onChange={v => set({ trimEnd: v, duration: v })} />
            </div>

            <div className="h-px bg-[#1e1e1e]" />

            <div>
              <Label>{T.colorAdjust}</Label>
              <div className="flex flex-col gap-3">
                <Slider label={T.brightness} value={clip.brightness ?? 0} min={-100} max={100} def={0}
                  onChange={v => set({ brightness: v })} />
                <Slider label={T.saturation} value={clip.saturation ?? 0} min={-100} max={100} def={0}
                  onChange={v => set({ saturation: v })} />
                <Slider label={T.hueRotate} value={clip.tint ?? 0} min={-100} max={100} def={0}
                  onChange={v => set({ tint: v })} />
              </div>
            </div>

            <div className="h-px bg-[#1e1e1e]" />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{T.tintColor}</Label>
                {(clip.logoTintStrength ?? 0) > 0 && (
                  <button
                    onClick={() => set({ logoTintStrength: 0 })}
                    className="text-[8px] text-[#888] hover:text-red-400 border border-[#2a2a2a] hover:border-red-400/30 px-1.5 py-0.5 rounded transition"
                  >{T.reset}</button>
                )}
              </div>
              <div className="flex gap-2 items-center mb-2">
                <input
                  type="color"
                  value={clip.logoTintColor ?? "#ff0000"}
                  onChange={e => set({ logoTintColor: e.target.value, logoTintStrength: clip.logoTintStrength > 0 ? clip.logoTintStrength : 50 })}
                  className="w-8 h-7 rounded cursor-pointer border border-[#2a2a2a] bg-transparent flex-shrink-0"
                />
                <input
                  type="text"
                  value={clip.logoTintColor ?? "#ff0000"}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                      set({ logoTintColor: v, logoTintStrength: (clip.logoTintStrength ?? 0) > 0 ? clip.logoTintStrength : 50 });
                    } else {
                      set({ logoTintColor: v });
                    }
                  }}
                  maxLength={7}
                  placeholder="#ff0000"
                  className="flex-1 h-7 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 text-[10px] text-[#aaa] font-mono focus:outline-none focus:border-[#444]"
                />
              </div>
              <Slider label={T.strength} value={clip.logoTintStrength ?? 0} min={0} max={100} def={0}
                fmt={v => `${v}%`} onChange={v => set({ logoTintStrength: v })} />
            </div>
          </div>
        )}

        {/* ─── COLOR TAB ─── */}
        {activeTab === "color" && (
          <div className="p-3 flex flex-col gap-4">
            <div>
              <Label>{T.filters}</Label>
              <div className="grid grid-cols-4 gap-1">
                {FILTER_PRESETS.map(p => {
                  const active = (clip.filterPreset ?? "none") === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => set({ filterPreset: p.id })}
                      className={`flex flex-col items-center gap-0.5 p-1 rounded-lg border transition
                        ${active ? "border-[#00d4d4] bg-[#00d4d4]/5" : "border-[#2a2a2a] hover:border-[#2a2a2a]"}`}
                    >
                      <div
                        className="w-full h-6 rounded overflow-hidden"
                        style={{ background: "linear-gradient(135deg,#f97316 0%,#a855f7 50%,#3b82f6 100%)", filter: p.css || "none" }}
                      />
                      <span className={`text-[7px] font-medium ${active ? "text-[#00d4d4]" : "text-[#aaa]"}`}>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-[#1e1e1e]" />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{T.adjustments}</Label>
                <button
                  onClick={() => set({ brightness: 0, contrast: 0, saturation: 0, warmth: 0, tint: 0, sharpen: 0, fade: 0, vignette: 0 })}
                  className="text-[8px] text-[#888] hover:text-red-400 border border-[#2a2a2a] hover:border-red-400/30 px-1.5 py-0.5 rounded transition"
                >
                  {T.resetAll}
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <Slider label={T.exposure}    value={clip.brightness  ?? 0} min={-100} max={100} def={0} onChange={v => set({ brightness:  v })} />
                <Slider label={T.contrast}    value={clip.contrast    ?? 0} min={-100} max={100} def={0} onChange={v => set({ contrast:    v })} />
                <Slider label={T.saturation}  value={clip.saturation  ?? 0} min={-100} max={100} def={0} onChange={v => set({ saturation:  v })} />
                <Slider label={T.warmth}      value={clip.warmth      ?? 0} min={-100} max={100} def={0} onChange={v => set({ warmth:      v })} />
                <Slider label={T.tint}        value={clip.tint        ?? 0} min={-100} max={100} def={0} onChange={v => set({ tint:        v })} />
                <Slider label={T.sharpen}     value={clip.sharpen     ?? 0} min={0}    max={100} def={0} onChange={v => set({ sharpen:     v })} />
                <Slider label={T.fade}        value={clip.fade        ?? 0} min={0}    max={100} def={0} onChange={v => set({ fade:        v })} />
                <Slider label={T.vignette}    value={clip.vignette    ?? 0} min={0}    max={100} def={0} onChange={v => set({ vignette:    v })} />
              </div>
            </div>
          </div>
        )}

        {/* ─── TRANSFORM TAB ─── */}
        {activeTab === "transform" && (
          <div className="p-3 flex flex-col gap-4">
            <Slider label={T.opacity}   value={Math.round((clip.opacity ?? 1) * 100)} min={0}   max={100} def={100} fmt={v => `${v}%`} onChange={v => set({ opacity: v / 100 })} />
            <Slider label={T.scale}     value={clip.scale    ?? 100}                  min={10}  max={300} def={100} fmt={v => `${v}%`} onChange={v => set({ scale: v })} />
            <Slider label={T.rotation}  value={clip.rotation ?? 0}                   min={-180} max={180} def={0}  fmt={v => `${v}°`} onChange={v => set({ rotation: v })} />

            {clip.type !== "text" && (
              <div>
                <Label>{T.flip}</Label>
                <div className="flex gap-2">
                  <ToggleBtn active={clip.flipH} onClick={() => set({ flipH: !(clip.flipH ?? false) })}>{T.flipH}</ToggleBtn>
                  <ToggleBtn active={clip.flipV} onClick={() => set({ flipV: !(clip.flipV ?? false) })}>{T.flipV}</ToggleBtn>
                </div>
              </div>
            )}

            <button
              onClick={() => set({ opacity: 1, scale: 100, rotation: 0, flipH: false, flipV: false })}
              className="w-full py-1.5 text-[9px] text-[#888] border border-[#2a2a2a] hover:border-[#2a2a2a] hover:text-white rounded-lg transition"
            >
              {T.resetTransforms}
            </button>
          </div>
        )}

        {/* ─── SPEED TAB ─── */}
        {activeTab === "speed" && (
          <div className="p-3 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label>{T.playbackSpeed}</Label>
              <span className={`text-sm font-bold ${(clip.speed ?? 1) !== 1 ? "text-[#00d4d4]" : "text-[#888]"}`}>
                {(clip.speed ?? 1).toFixed(2)}×
              </span>
            </div>
            <Slider
              label=""
              value={clip.speed ?? 1}
              min={0.1} max={4} step={0.05} def={1}
              fmt={v => `${v.toFixed(2)}×`}
              onChange={v => set({ speed: parseFloat(v.toFixed(2)) })}
            />
            <div>
              <Label>{T.presets}</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {SPEED_PRESETS.map(s => (
                  <button
                    key={s}
                    onClick={() => set({ speed: s })}
                    className={`py-2 rounded-lg text-[10px] font-semibold border transition
                      ${(clip.speed ?? 1) === s
                        ? "border-[#00d4d4] text-[#00d4d4] bg-[#00d4d4]/10"
                        : "border-[#333] text-[#bbb] hover:border-[#333] hover:text-white"}`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── AUDIO TAB ─── */}
        {activeTab === "audio" && (
          <div className="p-3 flex flex-col gap-4">
            <div>
              <Label>{T.clipVolume}</Label>
              <Slider
                label={T.volume}
                value={Math.round((clip.volume ?? 1) * 100)}
                min={0} max={150} step={1} def={100}
                fmt={v => `${v}%`}
                onChange={v => set({ volume: v / 100 })}
              />
            </div>

            <div>
              <Label>{T.fade}</Label>
              <div className="flex flex-col gap-3">
                <Slider label={T.fadeIn}  value={clip.fadeIn  ?? 0} min={0} max={5} step={0.1} def={0}
                  fmt={v => `${v.toFixed(1)}s`} onChange={v => set({ fadeIn: v })} />
                <Slider label={T.fadeOut} value={clip.fadeOut ?? 0} min={0} max={5} step={0.1} def={0}
                  fmt={v => `${v.toFixed(1)}s`} onChange={v => set({ fadeOut: v })} />
              </div>
            </div>

            <div className="bg-[#181818] rounded-xl p-3 border border-[#2a2a2a]">
              <p className="text-[9px] text-[#666] leading-relaxed">
                {T.audioTip.split("\n").map((l, i) => <React.Fragment key={i}>{l}{i < 2 && <br />}</React.Fragment>)}
              </p>
            </div>
          </div>
        )}

        {/* ─── TRANSITION TAB ─── */}
        {activeTab === "transition" && (
          <div className="p-3 flex flex-col gap-4">
            <div>
              <Label>{T.transitionOut}</Label>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {TRANSITION_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => set({ transitionOut: type })}
                    className={`py-2 rounded-lg text-[10px] border transition
                      ${(clip.transitionOut ?? "none") === type
                        ? "border-[#00d4d4] text-[#00d4d4] bg-[#00d4d4]/10"
                        : "border-[#333] text-[#bbb] hover:border-[#333] hover:text-white"}`}
                  >
                    {T.transitions[type] ?? type}
                  </button>
                ))}
              </div>

              {(clip.transitionOut && clip.transitionOut !== "none") && (
                <Slider
                  label={T.transitionDuration}
                  value={clip.transitionOutDuration ?? 0.5}
                  min={0.1} max={3} step={0.1} def={0.5}
                  fmt={v => `${v.toFixed(1)}s`}
                  onChange={v => set({ transitionOutDuration: v })}
                />
              )}
            </div>

            <div className="h-px bg-[#1e1e1e]" />

            <div>
              <Label>{T.transitionIn}</Label>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {TRANSITION_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => set({ transitionIn: type })}
                    className={`py-2 rounded-lg text-[10px] border transition
                      ${(clip.transitionIn ?? "none") === type
                        ? "border-[#00d4d4] text-[#00d4d4] bg-[#00d4d4]/10"
                        : "border-[#333] text-[#bbb] hover:border-[#333] hover:text-white"}`}
                  >
                    {T.transitions[type] ?? type}
                  </button>
                ))}
              </div>

              {(clip.transitionIn && clip.transitionIn !== "none") && (
                <Slider
                  label={T.transitionDuration}
                  value={clip.transitionInDuration ?? 0.5}
                  min={0.1} max={3} step={0.1} def={0.5}
                  fmt={v => `${v.toFixed(1)}s`}
                  onChange={v => set({ transitionInDuration: v })}
                />
              )}
            </div>

            <div className="bg-[#181818] rounded-xl p-3 border border-[#2a2a2a]">
              <p className="text-[9px] text-[#888] leading-relaxed">
                {T.transitionTip.split("\n").map((l, i) => {
                  const [name, ...rest] = l.split(" — ");
                  return <React.Fragment key={i}><span className="text-[#aaa]">{name}</span>{" — "}{rest.join(" — ")}{i < 3 && <br />}</React.Fragment>;
                })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
