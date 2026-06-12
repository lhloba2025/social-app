// @ts-nocheck
import React, { useRef, useEffect, useCallback } from "react";
import { Plus, Copy, Trash2, Eye, EyeOff, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Underline } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";
import FiltersPanel from "./FiltersPanel";
import BlendModesPanel from "./BlendModesPanel";

const FONTS = [
  // عربية أساسية
  { name: "Tajawal", label: "تجوال" },
  { name: "Cairo", label: "القاهرة" },
  { name: "Almarai", label: "المراعي" },
  { name: "Readex Pro", label: "ريدكس برو" },
  { name: "Noto Kufi Arabic", label: "نوتو كوفي" },
  { name: "El Messiri", label: "المسيري" },
  { name: "Mada", label: "مدى" },
  { name: "IBM Plex Sans Arabic", label: "IBM بلكس" },
  { name: "Changa", label: "تشانجا" },
  { name: "Rubik", label: "روبيك" },
  // خطوط كلاسيكية
  { name: "Amiri", label: "أميري" },
  { name: "Amiri Quran", label: "أميري قرآن" },
  { name: "Scheherazade New", label: "شهرزاد" },
  { name: "Reem Kufi", label: "ريم كوفي" },
  { name: "Noto Naskh Arabic", label: "نوتو نسخ" },
  { name: "Lateef", label: "لطيف" },
  { name: "Harmattan", label: "هرمطان" },
  // ديكورية
  { name: "Lalezar", label: "لالهزار" },
  { name: "Mirza", label: "ميرزا" },
  { name: "Katibeh", label: "كاتبة" },
  // ── خطوط اليد العربية (Arabic handwriting) ─────────────
  { name: "Aref Ruqaa",     label: "✍️ رقعة عارف" },
  { name: "Aref Ruqaa Ink", label: "✍️ رقعة حبر" },
  { name: "Marhey",         label: "✍️ مرحى" },
  { name: "Aladin",         label: "✍️ علاء الدين" },
  { name: "Gulzar",         label: "✍️ گلزار" },
  { name: "Rakkas",         label: "✍️ رقاص" },
  { name: "Lemonada",       label: "✍️ ليمونادا" },
  // ── خطوط اليد اللاتينية (English handwriting) ──────────
  { name: "Caveat",            label: "✍️ Caveat" },
  { name: "Pacifico",          label: "✍️ Pacifico" },
  { name: "Dancing Script",    label: "✍️ Dancing Script" },
  { name: "Kalam",             label: "✍️ Kalam" },
  { name: "Permanent Marker",  label: "✍️ Permanent Marker" },
  { name: "Shadows Into Light",label: "✍️ Shadows Into Light" },
  { name: "Satisfy",           label: "✍️ Satisfy" },
  { name: "Great Vibes",       label: "✍️ Great Vibes" },
  { name: "Indie Flower",      label: "✍️ Indie Flower" },
  { name: "Homemade Apple",    label: "✍️ Homemade Apple" },
  { name: "Patrick Hand",      label: "✍️ Patrick Hand" },
  { name: "Sacramento",        label: "✍️ Sacramento" },
  { name: "Architects Daughter",label: "✍️ Architects Daughter" },
  { name: "Gloria Hallelujah", label: "✍️ Gloria Hallelujah" },
  { name: "Just Another Hand", label: "✍️ Just Another Hand" },
  // لاتينية
  { name: "Arial", label: "Arial" },
  { name: "Georgia", label: "Georgia" },
  { name: "Verdana", label: "Verdana" },
];

const QUICK_COLORS = [
  "#ffffff", "#000000", "#f8fafc", "#1e293b",
  "#ef4444", "#dc2626", "#f97316", "#ea580c",
  "#eab308", "#ca8a04", "#22c55e", "#16a34a",
  "#3b82f6", "#2563eb", "#8b5cf6", "#7c3aed",
  "#ec4899", "#db2777", "#14b8a6", "#0d9488",
  "#f43f5e", "#6366f1", "#06b6d4", "#84cc16",
];
const QUICK_HIGHLIGHTS = ["transparent", "#fef08a", "#fde047", "#bbf7d0", "#86efac", "#bfdbfe", "#93c5fd", "#fecaca", "#fca5a5", "#e9d5ff", "#d8b4fe", "#fed7aa", "#fdba74", "#000000cc"];

export default function TextPanel({ layers, selectedId, onSelect, onAdd, onUpdate, onDelete, onDuplicate, language }) {
  const isRtl = language === "ar";
  const selected = layers.find((l) => l.id === selectedId);
  const editorRef = useRef(null);
  const lastIdRef = useRef(null);
  const panelRef = useRef(null);

  // Reset content when switching to a different layer
  useEffect(() => {
    if (!editorRef.current || !selected) return;
    editorRef.current.innerHTML = selected.richHtml || selected.text || "";
  }, [selected?.id]);

  // Sync font family and line-height only — font size is never applied to the editor
  useEffect(() => {
    if (!editorRef.current || !selected) return;
    editorRef.current.style.fontFamily = selected.fontFamily || "Tajawal";
    editorRef.current.style.lineHeight = String(selected.lineHeight || 1.4);
  }, [selected?.fontFamily, selected?.lineHeight]);

  // Capture selection before ANY mousedown on the panel (capture phase fires before children)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const handler = (e) => {
      if (editorRef.current?.contains(e.target)) return; // click inside editor — no need
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      }
    };
    panel.addEventListener("mousedown", handler, { capture: true });
    return () => panel.removeEventListener("mousedown", handler, { capture: true });
  }, []);

  const update = (key, val) => {
    if (!selected) return;
    onUpdate(selected.id, { [key]: val });
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    // Strip font-family and font-size from inline styles to prevent conflicts with layer props
    const spans = editorRef.current.querySelectorAll("span[style], font[style], div[style]");
    spans.forEach(el => {
      el.style.removeProperty("font-family");
      el.style.removeProperty("font-size");
    });
    update("richHtml", editorRef.current.innerHTML);
  };

  const savedSelectionRef = useRef(null);

  // Auto-save selection whenever it changes while editor is focused
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const saveSelectionFromDoc = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
        savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      }
    };

    const onFocus = () => document.addEventListener("selectionchange", saveSelectionFromDoc);
    const onBlur = () => document.removeEventListener("selectionchange", saveSelectionFromDoc);

    editor.addEventListener("focus", onFocus);
    editor.addEventListener("blur", onBlur);
    return () => {
      editor.removeEventListener("focus", onFocus);
      editor.removeEventListener("blur", onBlur);
      document.removeEventListener("selectionchange", saveSelectionFromDoc);
    };
  }, [selected?.id]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  const applyFormat = useCallback((cmd, value) => {
    if (!editorRef.current || !savedSelectionRef.current) return;

    // execCommand requires the contentEditable to be focused — if focus is
    // elsewhere (e.g. user typed in a hex input), restore it first.
    editorRef.current.focus();
    const sel = window.getSelection();
    const range = savedSelectionRef.current.cloneRange();
    sel.removeAllRanges();
    sel.addRange(range);

    // Get the current font family before applying format
    const currentFont = selected?.fontFamily || "Tajawal";

    // Apply the format
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(cmd, false, value || null);
    
    // Strip font-family from all styled spans so layer.fontFamily always controls the font
    const spans = editorRef.current.querySelectorAll("span[style], font[style]");
    spans.forEach(span => {
      span.style.removeProperty("font-family");
      span.style.removeProperty("font-size");
    });

    update("richHtml", editorRef.current.innerHTML);
  }, [selected?.id, selected?.fontFamily]);

  const applyTextColor = (color) => applyFormat("foreColor", color);
  const applyHighlight = (color) => {
    if (!editorRef.current || !savedSelectionRef.current) return;
    editorRef.current.focus();
    if (color === "transparent") {
      // Remove all highlight spans
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current.cloneRange());
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("removeFormat");
      update("richHtml", editorRef.current.innerHTML);
      return;
    }
    // Apply highlight using hiliteColor then convert background-color spans to inline style with line-height fix
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSelectionRef.current.cloneRange());
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("hiliteColor", false, color);
    // Fix: convert any block elements (div/p) with background-color to inline spans
    // Chrome sometimes wraps entire lines in <div style="background-color:..."> instead of inline <span>
    const allStyled = editorRef.current.querySelectorAll("div[style], p[style], span[style], font[style]");
    allStyled.forEach(el => {
      const bg = el.style.backgroundColor;
      if (!bg || bg === "transparent" || bg === "") return;
      const tagName = el.tagName.toLowerCase();
      if (tagName === "div" || tagName === "p") {
        // Convert block element to inline span
        const span = document.createElement("span");
        span.style.cssText = el.style.cssText;
        span.style.display = "inline";
        span.style.lineHeight = "inherit";
        span.style.verticalAlign = "baseline";
        span.style.padding = "0";
        span.innerHTML = el.innerHTML;
        el.replaceWith(span);
      } else {
        // Just fix existing inline elements
        el.style.display = "inline";
        el.style.lineHeight = "inherit";
        el.style.verticalAlign = "baseline";
        el.style.padding = "0";
      }
    });
    // Strip font-family and font-size added by styleWithCSS
    editorRef.current.querySelectorAll("span[style], font[style], div[style]").forEach(el => {
      el.style.removeProperty("font-family");
      el.style.removeProperty("font-size");
    });
    update("richHtml", editorRef.current.innerHTML);
  };

  const applyFontSize = (newSize) => {
    update("fontSize", newSize);
  };

  // Selection is already saved by the capture listener on the panel; just prevent focus loss then run
  const withSelection = (fn) => (e) => { e.preventDefault(); fn(); };

  const applySelectedFontSize = (sizePx) => {
    if (!editorRef.current || !savedSelectionRef.current) return;
    const range = savedSelectionRef.current.cloneRange();
    if (range.collapsed) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const fragment = range.extractContents();
    const span = document.createElement("span");
    span.style.fontSize = `${sizePx}px`;
    span.appendChild(fragment);
    range.insertNode(span);
    sel.removeAllRanges();
    update("richHtml", editorRef.current.innerHTML);
  };

  // Find & Replace state — operates on plain text of all layers
  const [findOpen, setFindOpen] = React.useState(false);
  const [findQuery, setFindQuery] = React.useState("");
  const [replaceVal, setReplaceVal] = React.useState("");

  const findMatchCount = React.useMemo(() => {
    if (!findQuery) return 0;
    const q = findQuery.toLowerCase();
    return layers.reduce((n, l) => {
      const plain = l.richHtml
        ? (() => { const d = document.createElement("div"); d.innerHTML = l.richHtml; return d.textContent || d.innerText || ""; })()
        : (l.text || "");
      const matches = plain.toLowerCase().split(q).length - 1;
      return n + matches;
    }, 0);
  }, [findQuery, layers]);

  const doReplaceAll = () => {
    if (!findQuery) return;
    const q = findQuery;
    const r = replaceVal;
    layers.forEach((l) => {
      if (l.richHtml) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        const next = l.richHtml.replace(re, r);
        if (next !== l.richHtml) onUpdate(l.id, { richHtml: next });
      }
      if (l.text) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        const next = l.text.replace(re, r);
        if (next !== l.text) onUpdate(l.id, { text: next });
      }
    });
  };

  return (
    <div ref={panelRef} className="space-y-3 text-xs">
      <div className="flex gap-1">
        <button
          onClick={onAdd}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          {isRtl ? "إضافة نص" : "Add Text"}
        </button>
        <button
          onClick={() => setFindOpen(o => !o)}
          title={isRtl ? "بحث واستبدال" : "Find & Replace"}
          className={`px-3 py-2 rounded-lg transition ${findOpen ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
        >
          🔍
        </button>
      </div>

      {findOpen && (
        <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded p-2 space-y-1.5">
          <input
            type="text"
            placeholder={isRtl ? "ابحث..." : "Find..."}
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-[var(--hv-text)]"
          />
          <input
            type="text"
            placeholder={isRtl ? "استبدل بـ..." : "Replace with..."}
            value={replaceVal}
            onChange={(e) => setReplaceVal(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-[var(--hv-text)]"
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 flex-1">
              {findQuery ? (isRtl ? `${findMatchCount} تطابق` : `${findMatchCount} matches`) : ""}
            </span>
            <button
              onClick={doReplaceAll}
              disabled={!findQuery || findMatchCount === 0}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition disabled:opacity-40"
            >
              {isRtl ? "استبدال الكل" : "Replace All"}
            </button>
          </div>
        </div>
      )}

      {/* Layer list */}
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {layers.map((l) => (
          <div
            key={l.id}
            onClick={() => onSelect(l.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition border ${
              l.id === selectedId ? "border-[var(--hv-primary)] bg-[rgba(79,70,229,0.08)]" : "bg-slate-50 hover:bg-slate-100 border-[var(--hv-border)]"
            }`}
          >
            <span
              className="flex-1 truncate text-[12px]"
              style={{ fontFamily: l.fontFamily, color:'var(--hv-text)' }}
            >
              {l.richHtml
                ? (() => { const d = document.createElement("div"); d.innerHTML = l.richHtml; return d.textContent || d.innerText || (isRtl ? "نص" : "Text"); })()
                : (l.text || (isRtl ? "نص" : "Text"))
              }
            </span>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(l.id, { visible: !l.visible }); }} className="text-slate-400 hover:text-[var(--hv-text)]">
              {l.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(l.id); }} className="text-slate-400 hover:text-[var(--hv-text)]">
              <Copy className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(l.id); }} className="text-red-400 hover:text-red-300">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Layer settings */}
      {selected && (
        <div className="space-y-3 border-t border-[var(--hv-border)] pt-3">

          {/* Rich text editor — fixed size, never reflects canvas font sizes */}
          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "✏️ حدّد نصاً لتلوينه" : "✏️ Select text to color it"}</label>
            <style>{`#studio-text-editor * { font-size: 13px !important; }`}</style>
            <div
              id="studio-text-editor"
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck={true}
              lang={isRtl ? "ar" : "en"}
              onInput={handleEditorInput}
              style={{
                fontFamily: selected.fontFamily || "Tajawal",
                direction: "auto",
                fontSize: "13px",
                minHeight: 48,
                lineHeight: selected.lineHeight || 1.4,
              }}
              className="w-full bg-slate-100 border border-slate-200 rounded p-2 text-[var(--hv-text)] outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick text color (word-level) */}
          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "🎨 لون النص المحدد" : "🎨 Selected text color"}</label>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="text"
                placeholder="#ffffff"
                dir="ltr"
                className="flex-1 bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-[var(--hv-text)] font-mono"
                onChange={(e) => {
                  let v = e.target.value.trim();
                  if (!v.startsWith("#")) v = "#" + v;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) applyTextColor(v);
                }}
              />
              <div className="w-7 h-7 rounded border border-slate-300 relative overflow-hidden flex-shrink-0 cursor-pointer">
                <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onInput={(e) => applyTextColor(e.target.value)} />
                <div className="w-full h-full bg-white" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COLORS.map(c => (
                <button key={c} onMouseDown={(e) => { e.preventDefault(); applyTextColor(c); }} title={c}
                  style={{ background: c, border: c === "#ffffff" ? "1px solid #475569" : "none" }}
                  className="w-6 h-6 rounded-full hover:scale-110 transition" />
              ))}
            </div>
          </div>

          {/* Highlight (word-level) */}
          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "🖊️ تظليل النص المحدد" : "🖊️ Highlight selected text"}</label>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="text"
                placeholder="#fef08a"
                dir="ltr"
                className="flex-1 bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-[var(--hv-text)] font-mono"
                onChange={(e) => {
                  let v = e.target.value.trim();
                  if (!v.startsWith("#")) v = "#" + v;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) applyHighlight(v);
                }}
              />
              <div className="w-7 h-7 rounded border border-slate-300 relative overflow-hidden flex-shrink-0 cursor-pointer">
                <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onInput={(e) => applyHighlight(e.target.value)} />
                <div className="w-full h-full bg-yellow-200" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_HIGHLIGHTS.map(c => (
                <button key={c} onMouseDown={(e) => { e.preventDefault(); applyHighlight(c); }} title={c === "transparent" ? "Remove" : c}
                  style={{ background: c === "transparent" ? "#1e293b" : c, border: "1px solid #475569" }}
                  className="w-6 h-6 rounded hover:scale-110 transition relative">
                  {c === "transparent" && <span className="text-slate-400 text-[10px] absolute inset-0 flex items-center justify-center">✕</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Selected text font size */}
          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "🔡 حجم النص المحدد" : "🔡 Selected Text Size"}</label>
            <div className="flex items-center gap-1 flex-wrap">
              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64].map((sz) => (
                <button
                  key={sz}
                  onMouseDown={withSelection(() => applySelectedFontSize(sz))}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-indigo-600 text-slate-600 hover:text-white transition"
                >
                  {sz}
                </button>
              ))}
              <input
                type="number"
                min="6"
                max="300"
                placeholder="px"
                className="w-14 bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)] text-[11px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = parseInt(e.target.value);
                    if (val > 0) applySelectedFontSize(val);
                  }
                }}
              />
            </div>
          </div>

          {/* Font size (whole layer) */}
          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "حجم الخط (الطبقة كلها)" : "Font Size (whole layer)"}</label>
            <div className="flex items-center gap-1 flex-wrap">
              {[12, 16, 20, 24, 32, 40, 48, 64, 80].map((sz) => (
                <button
                  key={sz}
                  onMouseDown={(e) => { e.preventDefault(); applyFontSize(sz); }}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${selected.fontSize === sz ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-indigo-600 text-slate-600 hover:text-white"}`}
                >
                  {sz}
                </button>
              ))}
              <input
                type="number"
                min="6"
                max="300"
                value={selected.fontSize || 24}
                className="w-16 bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)] text-[11px]"
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > 0) applyFontSize(val);
                }}
              />
            </div>
          </div>

          {/* Format buttons */}
          <div className="flex gap-2">
            <button
              onMouseDown={withSelection(() => applyFormat("bold"))}
              className="flex-1 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[var(--hv-text)] transition"
            >
              <Bold className="w-4 h-4 mx-auto" />
            </button>
            <button
              onMouseDown={withSelection(() => applyFormat("italic"))}
              className="flex-1 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[var(--hv-text)] transition"
            >
              <Italic className="w-4 h-4 mx-auto" />
            </button>
            <button
              onMouseDown={withSelection(() => applyFormat("underline"))}
              className="flex-1 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[var(--hv-text)] transition"
            >
              <Underline className="w-4 h-4 mx-auto" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); update("shadow", !selected.shadow); }}
              className={`flex-1 py-1.5 rounded border text-xs transition font-bold ${selected.shadow ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[var(--hv-text)]"}`}
            >S</button>
          </div>

          {/* Global text color (fallback for whole layer) */}
          <StudioColorPicker label={isRtl ? "لون النص الكامل" : "Whole Text Color"} value={selected.color} onChange={(v) => update("color", v)} />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-500">{isRtl ? "خلفية الطبقة" : "Layer Background"}</label>
              {selected.bgColor && selected.bgColor !== "transparent" && (
                <button
                  onClick={() => update("bgColor", "transparent")}
                  className="text-[10px] text-red-500 hover:text-red-400 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition"
                >
                  {isRtl ? "✕ حذف الخلفية" : "✕ Remove"}
                </button>
              )}
            </div>
            <StudioColorPicker value={selected.bgColor} onChange={(v) => update("bgColor", v)} />
            {selected.bgColor && selected.bgColor !== "transparent" && (
              <div className="mt-2">
                <label className="text-slate-500 block mb-1">
                  {isRtl ? `شفافية الخلفية: ${Math.round((selected.bgOpacity ?? 1) * 100)}%` : `Background Opacity: ${Math.round((selected.bgOpacity ?? 1) * 100)}%`}
                </label>
                <input type="range" min="0" max="1" step="0.05"
                  value={selected.bgOpacity ?? 1}
                  onChange={(e) => update("bgOpacity", parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "نوع الخط" : "Font Family"}</label>
            <select
              value={selected.fontFamily}
              onChange={(e) => {
                update("fontFamily", e.target.value);
                if (editorRef.current) {
                  editorRef.current.style.fontFamily = e.target.value;
                }
              }}
              className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)]"
              style={{ fontFamily: selected.fontFamily }}
            >
              {FONTS.map((f) => (
                <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>{f.label} — {f.name}</option>
              ))}
            </select>

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "تباعد الحروف" : "Letter Spacing"}: {selected.letterSpacing || 0}px</label>
            <input type="range" min="-5" max="20" step="0.5" value={selected.letterSpacing || 0}
              onChange={(e) => update("letterSpacing", parseFloat(e.target.value))} className="w-full" />
          </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "عرض البوكس" : "Text Box Width"}: {selected.textWidth || 90}%</label>
            <input type="range" min="10" max="100" value={selected.textWidth || 90}
              onChange={(e) => update("textWidth", parseInt(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "تباعد السطور" : "Line Height"}</label>
            <input
              type="number"
              step="0.1"
              value={selected.lineHeight || 1.4}
              onChange={(e) => update("lineHeight", parseFloat(e.target.value))}
              className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)]"
            />
          </div>

          {/* Curved text */}
          <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded p-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold" style={{color:'var(--hv-text)'}}>{isRtl ? "🌀 نص منحني" : "🌀 Curved Text"}</label>
              <button
                onClick={() => update("curve", { ...(selected.curve || { angle: 180 }), enabled: !selected.curve?.enabled })}
                className={`text-[10px] px-2 py-0.5 rounded transition ${selected.curve?.enabled ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {selected.curve?.enabled ? (isRtl ? "مفعّل" : "On") : (isRtl ? "إيقاف" : "Off")}
              </button>
            </div>
            {selected.curve?.enabled && (
              <>
                <label className="text-[10px] text-slate-500 block">{isRtl ? "زاوية القوس" : "Arc angle"}: {selected.curve.angle || 180}°</label>
                <input
                  type="range"
                  min="-340"
                  max="340"
                  step="5"
                  value={selected.curve.angle || 180}
                  onChange={(e) => update("curve", { ...selected.curve, angle: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
                <div className="flex flex-wrap gap-1">
                  {[60, 120, 180, 270, 360, -180].map(a => (
                    <button key={a} onClick={() => update("curve", { ...selected.curve, angle: a })}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-indigo-600 text-slate-600 hover:text-white transition">
                      {a}°
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "المحاذاة" : "Alignment"}</label>
            <div className="flex gap-1">
              {["right", "center", "left"].map((a) => {
                const Icon = a === "right" ? AlignRight : a === "center" ? AlignCenter : AlignLeft;
                return (
                  <button
                    key={a}
                    onClick={() => update("align", a)}
                    className={`flex-1 py-1.5 rounded border transition ${selected.align === a ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[var(--hv-text)]"}`}
                  >
                    <Icon className="w-4 h-4 mx-auto" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-500 block mb-1">{isRtl ? "شفافية" : "Opacity"}</label>
              <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1}
                onChange={(e) => update("opacity", parseFloat(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">{isRtl ? "دوران" : "Rotation"}</label>
              <input type="number" value={selected.rotation || 0}
                onChange={(e) => update("rotation", parseInt(e.target.value))}
                className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-500 block mb-1">X%</label>
              <input type="number" value={Math.round(selected.x)} onChange={(e) => update("x", parseFloat(e.target.value))}
                className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)]" />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Y%</label>
              <input type="number" value={Math.round(selected.y)} onChange={(e) => update("y", parseFloat(e.target.value))}
                className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)]" />
            </div>
          </div>

          <div className="flex gap-1 justify-center flex-wrap">
            {[
              { label: "↑", key: "y", delta: -1 },
              { label: "↓", key: "y", delta: 1 },
              { label: "←", key: "x", delta: -1 },
              { label: "→", key: "x", delta: 1 },
            ].map(({ label, key, delta }) => (
              <button key={label} onClick={() => update(key, (selected[key] || 0) + delta)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 border border-[var(--hv-border)] rounded text-[var(--hv-text)] text-sm">{label}</button>
            ))}
          </div>

          <FiltersPanel element={selected} onChange={(updated) => onUpdate(selected.id, updated)} language={language} />
          <BlendModesPanel element={selected} onChange={(updated) => onUpdate(selected.id, updated)} language={language} />
        </div>
      )}
    </div>
  );
}