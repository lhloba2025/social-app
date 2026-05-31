// SocialPanel — live editor for the studio's social contact box.
//
// The box itself is a DOM overlay rendered inside StudioCanvas (see the
// "Social contact box overlay" section there). This panel only edits the
// state — drag, render and export all happen in the canvas. Same UX as
// the greeting-cards page so users don't relearn the feature when they
// switch between the two screens.
//
// Props:
//   • box        — current socialBox state object
//   • onUpdate   — partial-update fn: onUpdate({ key: value })
//   • language   — "ar" | "en"
//
// Backgrounds support both a single solid colour AND a two-stop gradient
// — switchable from this panel.

import React, { useState } from "react";
import { Trash2, Save, RotateCcw, X } from "lucide-react";
import { SOCIAL_PLATFORMS, findPlatform } from "../data/socialPlatforms.jsx";
import { loadSocialItems, clearSocialProfile, hasSocialProfile } from "@/utils/socialProfileStore";

const newId = () => Math.random().toString(36).slice(2, 9);

export default function SocialPanel({ box, onUpdate, language }) {
  const isRtl = language === "ar";
  // Guard — defensive default in case the editor mounts before the
  // editor's useState defaultArg lands. Should be exceedingly rare.
  if (!box) box = { items: [] };

  // Profile bookkeeping — controls whether the "restore" and "forget"
  // buttons appear. We re-check `hasSocialProfile` on every render
  // because clearing it (or saving via auto-persist) changes the
  // answer mid-session.
  const [profileExists, setProfileExists] = useState(() => hasSocialProfile());
  const [restoredFlash, setRestoredFlash] = useState(false);

  // Pull saved accounts back into the current box. Used when the user
  // emptied the items[] for one design and now wants their full list
  // back. Styling fields are left as-is so the user keeps any tweaks
  // they made for this specific design.
  const restoreSavedAccounts = () => {
    const saved = loadSocialItems();
    if (!saved || saved.length === 0) return;
    // Regenerate ids so React keys can't collide if there were dupes.
    const reIded = saved.map((it) => ({ ...it, id: newId() }));
    onUpdate({ items: reIded, show: true });
    setRestoredFlash(true);
    setTimeout(() => setRestoredFlash(false), 1800);
  };

  // Permanently wipe the saved profile. Doesn't touch the current box
  // — if the user wants the current design's box gone too, they can
  // empty items[] manually with the per-row delete buttons.
  const forgetSavedProfile = () => {
    if (!window.confirm(isRtl
      ? "حذف الملف المحفوظ نهائياً؟ لن يتم استعادة الحسابات في التصاميم القادمة."
      : "Permanently delete the saved profile? Future designs will start blank.")) return;
    clearSocialProfile();
    setProfileExists(false);
  };

  const addItem = (platformId) => {
    onUpdate({
      show: true,
      items: [...box.items, { id: newId(), platform: platformId, handle: "" }],
    });
  };
  const updateItem = (id, patch) =>
    onUpdate({ items: box.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const removeItem = (id) =>
    onUpdate({ items: box.items.filter((it) => it.id !== id) });
  const moveItem = (id, dir) => {
    const idx = box.items.findIndex((it) => it.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= box.items.length) return;
    const next = [...box.items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onUpdate({ items: next });
  };

  return (
    <div className="space-y-3 p-3" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header + show/hide */}
      <div className="bg-slate-800/60 border border-cyan-500/30 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            📱 {isRtl ? "بوكس التواصل الاجتماعي" : "Social contact box"}
          </h3>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={!!box.show}
              onChange={(e) => onUpdate({ show: e.target.checked })} />
            <span className="text-[10px] text-slate-300">{isRtl ? "إظهار" : "Show"}</span>
          </label>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          {isRtl
            ? "أضف منصاتك وحساباتك — يظهرون في بوكس واحد منسّق على الكانفس. اسحبه بالماوس لتغيير موقعه."
            : "Add platforms + handles — they show in one tidy box on the canvas. Drag to reposition."}
        </p>
      </div>

      {/* ── Saved-profile status banner ──────────────────────────────────
          Communicates the persistence behaviour explicitly: users wanted
          the social info to "just be there" without re-entering, and
          this banner reassures them it is. It also surfaces the two
          escape hatches — restore (re-load saved accounts) and forget
          (wipe the saved profile entirely). */}
      <div className={`rounded-lg p-2.5 border text-[11px] transition ${
        restoredFlash
          ? "bg-emerald-900/40 border-emerald-500/50 text-emerald-200"
          : profileExists
            ? "bg-emerald-900/20 border-emerald-700/30 text-emerald-300"
            : "bg-slate-800/40 border-slate-700 text-slate-400"
      }`}>
        <div className="flex items-start gap-2">
          <Save className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 leading-relaxed">
            {restoredFlash ? (
              <strong>{isRtl ? "✓ تمت استعادة الحسابات المحفوظة." : "✓ Saved accounts restored."}</strong>
            ) : profileExists ? (
              isRtl
                ? "حسابات التواصل تُحفظ تلقائياً وتعود في كل تصميم جديد."
                : "Your contact accounts auto-save and reload on every new design."
            ) : (
              isRtl
                ? "أضف حساباتك مرة واحدة — سيتم حفظها تلقائياً للتصاميم القادمة."
                : "Add your accounts once — they'll auto-save for future designs."
            )}
          </div>
        </div>
        {profileExists && (
          <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-emerald-700/20">
            <button
              onClick={restoreSavedAccounts}
              title={isRtl ? "إعادة تحميل الحسابات المحفوظة في هذا التصميم" : "Reload saved accounts into this design"}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200"
            >
              <RotateCcw className="w-3 h-3" />
              {isRtl ? "استعادة" : "Restore"}
            </button>
            <button
              onClick={forgetSavedProfile}
              title={isRtl ? "حذف الملف المحفوظ نهائياً" : "Delete the saved profile permanently"}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-700/60 hover:bg-red-700/40 text-slate-300 hover:text-red-200"
            >
              <X className="w-3 h-3" />
              {isRtl ? "نسيان الملف" : "Forget profile"}
            </button>
          </div>
        )}
      </div>

      {/* Platform picker */}
      <div>
        <label className="text-[10px] text-slate-400 block mb-1.5">{isRtl ? "أضف منصة:" : "Add a platform:"}</label>
        <div className="grid grid-cols-6 gap-1.5">
          {SOCIAL_PLATFORMS.map((p) => (
            <button key={p.id}
              onClick={() => addItem(p.id)}
              title={isRtl ? p.nameAr : p.nameEn}
              className="aspect-square rounded-lg overflow-hidden border border-slate-700 hover:scale-105 hover:border-cyan-300 transition"
            >
              <div className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: p.svg(p.brandColor, "#ffffff") }} />
            </button>
          ))}
        </div>
      </div>

      {/* Item list — 2-row layout per item so the handle input gets the
          full panel width. The studio's right sidebar is ~280px wide
          (vs 380px on the greeting-cards page), so a single-row item
          with icon + input + 3 action buttons squishes the input down
          to a useless 2-3 characters. Stacking the actions below frees
          ~50% more horizontal space for the handle. */}
      {box.items.length > 0 && (
        <div>
          <label className="text-[10px] text-slate-400 block mb-1.5">
            {isRtl ? `الحسابات (${box.items.length})` : `Accounts (${box.items.length})`}
          </label>
          <div className="space-y-2">
            {box.items.map((it, idx) => {
              const p = findPlatform(it.platform);
              if (!p) return null;
              return (
                <div key={it.id} className="bg-slate-800/60 rounded p-2 space-y-1.5">
                  {/* Row 1 — icon + handle input (input takes the rest) */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 flex-shrink-0"
                      dangerouslySetInnerHTML={{ __html: p.svg(p.brandColor, "#ffffff") }} />
                    <input
                      type="text"
                      value={it.handle}
                      onChange={(e) => updateItem(it.id, { handle: e.target.value })}
                      placeholder={isRtl ? p.placeholderAr : p.placeholderEn}
                      dir="ltr"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white min-w-0"
                    />
                  </div>
                  {/* Row 2 — platform name + actions (small, right-aligned). */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-500 truncate flex-1">
                      {isRtl ? p.nameAr : p.nameEn}
                    </span>
                    <button onClick={() => moveItem(it.id, -1)}
                      disabled={idx === 0}
                      title={isRtl ? "تحريك للأعلى" : "Move up"}
                      className="text-slate-400 hover:text-white disabled:opacity-30 px-1.5 rounded">▲</button>
                    <button onClick={() => moveItem(it.id, +1)}
                      disabled={idx === box.items.length - 1}
                      title={isRtl ? "تحريك للأسفل" : "Move down"}
                      className="text-slate-400 hover:text-white disabled:opacity-30 px-1.5 rounded">▼</button>
                    <button onClick={() => removeItem(it.id)}
                      title={isRtl ? "حذف" : "Delete"}
                      className="text-red-400 hover:text-red-300 px-1.5 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Layout + styling — only meaningful with at least one item */}
      {box.items.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            🎨 {isRtl ? "تنسيق البوكس" : "Box styling"}
          </h3>

          {/* Layout */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "ترتيب" : "Layout"}</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "vertical",   ar: "عمودي", en: "Vertical" },
                { id: "horizontal", ar: "أفقي",  en: "Horizontal" },
                { id: "grid",       ar: "شبكة",  en: "Grid" },
              ].map((m) => (
                <button key={m.id}
                  onClick={() => onUpdate({ layout: m.id })}
                  className={`py-1.5 rounded text-[10px] font-semibold transition ${
                    box.layout === m.id ? "bg-cyan-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}>
                  {isRtl ? m.ar : m.en}
                </button>
              ))}
            </div>
          </div>

          {/* Colour mode */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "نمط الألوان" : "Color mode"}</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "brand",   ar: "ألوان المنصات", en: "Brand" },
                { id: "mono",    ar: "موحد",           en: "Mono" },
                { id: "outline", ar: "إطار",           en: "Outline" },
              ].map((m) => (
                <button key={m.id}
                  onClick={() => onUpdate({ colorMode: m.id })}
                  className={`py-1.5 rounded text-[10px] font-semibold transition ${
                    box.colorMode === m.id ? "bg-cyan-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}>
                  {isRtl ? m.ar : m.en}
                </button>
              ))}
            </div>
          </div>

          {box.colorMode === "mono" && (
            <div className="flex items-center gap-2">
              <input type="color" value={box.monoColor}
                onChange={(e) => onUpdate({ monoColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-slate-800" />
              <label className="text-[10px] text-slate-400 flex-1">{isRtl ? "لون الأيقونات" : "Icon color"}</label>
            </div>
          )}

          {/* Sizing */}
          <div>
            <label className="text-[10px] text-slate-400 block">{isRtl ? "حجم الأيقونة" : "Icon size"}: {box.iconSize}%</label>
            <input type="range" min="3" max="20" step="0.5" value={box.iconSize}
              onChange={(e) => onUpdate({ iconSize: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block">{isRtl ? "المسافة" : "Spacing"}: {box.spacing}%</label>
            <input type="range" min="0" max="100" step="2" value={box.spacing}
              onChange={(e) => onUpdate({ spacing: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500" />
          </div>

          {/* Labels */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={box.showLabels}
              onChange={(e) => onUpdate({ showLabels: e.target.checked })} />
            <span className="text-[10px] text-slate-300">{isRtl ? "إظهار المعرفات بجانب الأيقونات" : "Show handles next to icons"}</span>
          </label>
          {box.showLabels && (
            <div className="flex items-center gap-2">
              <input type="color" value={box.textColor}
                onChange={(e) => onUpdate({ textColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-slate-800" />
              <label className="text-[10px] text-slate-400 flex-1">{isRtl ? "لون النص" : "Text color"}</label>
            </div>
          )}

          {/* ── Background (with gradient option) ──────────────────────
              Background can be off, a flat colour with opacity, or a
              two-stop linear gradient. Gradient picker only appears
              when the user opts in. */}
          <div className="bg-slate-900/60 rounded-lg p-2 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={box.bgEnabled}
                onChange={(e) => onUpdate({ bgEnabled: e.target.checked })} />
              <span className="text-[11px] text-slate-200 font-bold">
                🎨 {isRtl ? "خلفية مستديرة" : "Rounded background"}
              </span>
            </label>
            {box.bgEnabled && (
              <>
                {/* Solid vs gradient toggle */}
                <div className="grid grid-cols-2 gap-1 bg-slate-800/60 rounded p-1">
                  <button onClick={() => onUpdate({ bgMode: "solid" })}
                    className={`py-1 rounded text-[10px] font-bold transition ${
                      (box.bgMode || "solid") === "solid" ? "bg-cyan-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"
                    }`}>
                    {isRtl ? "لون واحد" : "Solid"}
                  </button>
                  <button onClick={() => onUpdate({ bgMode: "gradient" })}
                    className={`py-1 rounded text-[10px] font-bold transition ${
                      box.bgMode === "gradient" ? "bg-cyan-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"
                    }`}>
                    🌈 {isRtl ? "تدرّج" : "Gradient"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input type="color" value={box.bgColor}
                    onChange={(e) => onUpdate({ bgColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-slate-900" />
                  <label className="text-[10px] text-slate-400 flex-1">
                    {box.bgMode === "gradient" ? (isRtl ? "اللون 1" : "Color 1") : (isRtl ? "اللون" : "Color")}
                  </label>
                </div>

                {box.bgMode === "gradient" && (
                  <>
                    <div className="flex items-center gap-2">
                      <input type="color" value={box.bgGradColor2 || "#1e293b"}
                        onChange={(e) => onUpdate({ bgGradColor2: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer bg-slate-900" />
                      <label className="text-[10px] text-slate-400 flex-1">{isRtl ? "اللون 2" : "Color 2"}</label>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">{isRtl ? "اتجاه التدرّج" : "Angle"}: {box.bgGradAngle || 135}°</label>
                      <input type="range" min="0" max="360" step="5" value={box.bgGradAngle || 135}
                        onChange={(e) => onUpdate({ bgGradAngle: parseInt(e.target.value) })}
                        className="w-full accent-cyan-500" />
                    </div>
                    {/* Curated gradient presets */}
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "تدرّجات جاهزة" : "Presets"}</label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { c1: "#ec4899", c2: "#8b5cf6", a: 135 },
                          { c1: "#f59e0b", c2: "#ef4444", a: 135 },
                          { c1: "#10b981", c2: "#0d9488", a: 135 },
                          { c1: "#1e293b", c2: "#7c3aed", a: 135 },
                          { c1: "#fbbf24", c2: "#d4af37", a: 135 },
                          { c1: "#000000", c2: "#374151", a: 135 },
                        ].map((p, i) => (
                          <button key={i}
                            onClick={() => onUpdate({ bgColor: p.c1, bgGradColor2: p.c2, bgGradAngle: p.a })}
                            className="h-6 rounded border border-slate-600 hover:scale-105 transition"
                            style={{ background: `linear-gradient(${p.a}deg, ${p.c1}, ${p.c2})` }} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Opacity — only applies to solid mode; gradient is
                    composed of its own colour stops which already encode
                    transparency if the user picks rgba. */}
                {box.bgMode !== "gradient" && (
                  <div>
                    <label className="text-[10px] text-slate-400 block">{isRtl ? "الشفافية" : "Opacity"}: {Math.round((box.bgOpacity ?? 1) * 100)}%</label>
                    <input type="range" min="0.05" max="1" step="0.05" value={box.bgOpacity ?? 1}
                      onChange={(e) => onUpdate({ bgOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500" />
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 block">{isRtl ? "استدارة الزوايا" : "Corner radius"}: {box.bgRadius}%</label>
                  <input type="range" min="0" max="80" step="2" value={box.bgRadius}
                    onChange={(e) => onUpdate({ bgRadius: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">{isRtl ? "الحشو الداخلي" : "Padding"}: {box.bgPadding}%</label>
                  <input type="range" min="0" max="100" step="2" value={box.bgPadding}
                    onChange={(e) => onUpdate({ bgPadding: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500" />
                </div>
              </>
            )}
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block">X: {box.x.toFixed(1)}%</label>
              <input type="range" min="0" max="100" step="0.5" value={box.x}
                onChange={(e) => onUpdate({ x: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">Y: {box.y.toFixed(1)}%</label>
              <input type="range" min="0" max="100" step="0.5" value={box.y}
                onChange={(e) => onUpdate({ y: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block">{isRtl ? "دوران" : "Rotation"}: {box.rotation || 0}°</label>
            <input type="range" min="-180" max="180" value={box.rotation || 0}
              onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
              className="w-full accent-cyan-500" />
          </div>
          <p className="text-[10px] text-slate-500">
            {isRtl ? "💡 يمكنك سحب البوكس بالماوس مباشرة على الكانفس." : "💡 Drag the box directly on the canvas."}
          </p>
        </div>
      )}
    </div>
  );
}
