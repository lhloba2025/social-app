import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { uploadFile, fetchImageByUrl } from "@/api/localClient";
import { normalizeImageFile, isHeic, shrinkBlobToLimit } from "@/utils/imageConvert";
import { REAL_IMAGE_CATEGORIES, googleImagesUrl } from "../data/stockIllustrations.jsx";

// Shared "decorations" finder — paste an image (Ctrl+V) or an image URL straight
// onto the canvas, or open a transparent-PNG Google search by topic. `onAdd`
// receives an image payload ({ url }) exactly like ImagesPanel's upload flow.
export default function DecorationFinder({ onAdd, language }) {
  const isRtl = language === "ar";
  const [urlInput, setUrlInput] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [showFinder, setShowFinder] = useState(false);

  const addByUrl = async (rawUrl) => {
    const url = (rawUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error(isRtl ? "رابط غير صالح" : "Invalid URL");
    const dataUrl = await fetchImageByUrl(url);
    onAdd({ url: dataUrl });
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setAddingUrl(true);
    try { await addByUrl(urlInput); setUrlInput(""); }
    catch (err) { alert((isRtl ? "تعذّر جلب الصورة: " : "Couldn't fetch image: ") + (err?.message || err)); }
    finally { setAddingUrl(false); }
  };

  useEffect(() => {
    const onPaste = async (e) => {
      const t = e.target;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            e.preventDefault();
            try {
              let norm = isHeic(f) ? await normalizeImageFile(f) : f;
              // Cloudinary caps uploads at 10MB — shrink large pastes first.
              const shrunk = await shrinkBlobToLimit(norm, { maxBytes: 9_500_000 });
              const file = new File([shrunk], norm.name || "pasted.png", { type: shrunk.type || "image/png" });
              const { file_url } = await uploadFile({ file });
              onAdd({ url: file_url });
            } catch (err) { alert((isRtl ? "تعذّر لصق الصورة: " : "Paste failed: ") + (err?.message || err)); }
            return;
          }
        }
      }
      if (typing) return;
      const text = e.clipboardData?.getData("text")?.trim();
      if (text && /^https?:\/\//i.test(text)) {
        e.preventDefault();
        setAddingUrl(true);
        try { await addByUrl(text); }
        catch (err) { alert((isRtl ? "تعذّر جلب الصورة: " : "Couldn't fetch image: ") + (err?.message || err)); }
        finally { setAddingUrl(false); }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, onAdd]);

  return (
    <div className="bg-slate-800/60 border border-emerald-500/30 rounded-xl p-3 space-y-2.5 text-xs mb-3">
      <div className="flex items-center gap-1.5">
        <span className="text-emerald-400 text-sm">⚡</span>
        <span className="text-[12px] text-emerald-200 font-bold">{isRtl ? "إضافة صورة سريعة" : "Quick add image"}</span>
      </div>

      {/* Primary action: paste / type a link */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); } }}
          placeholder={isRtl ? "الصق رابط الصورة…" : "Paste image URL…"}
          dir="ltr"
          className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-2 text-[11px] text-white placeholder-slate-500 outline-none focus:border-emerald-400"
        />
        <button
          onClick={handleAddUrl}
          disabled={addingUrl || !urlInput.trim()}
          className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[11px] font-bold transition disabled:opacity-40 whitespace-nowrap"
        >
          {addingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : (isRtl ? "إضافة" : "Add")}
        </button>
      </div>

      {/* Secondary hint — one quiet line */}
      <p className="text-[10px] text-slate-400 leading-snug">
        {isRtl ? "أو انسخ صورة والصقها بـ Ctrl + V" : "Or copy an image and press Ctrl + V"}
      </p>

      <button
        onClick={() => setShowFinder((v) => !v)}
        className={`w-full py-1.5 rounded-lg text-[11px] font-semibold transition border ${showFinder ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200" : "bg-slate-900 border-slate-600 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200"}`}
      >
        🔍 {showFinder ? (isRtl ? "إخفاء البحث" : "Hide search") : (isRtl ? "ابحث عن صور PNG شفافة" : "Search transparent PNGs")}
      </button>
      {showFinder && (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1 pt-0.5">
          {REAL_IMAGE_CATEGORIES.map((cat) => (
            <div key={cat.en} className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-emerald-300/90 sticky top-0 bg-slate-900 py-0.5">
                {isRtl ? cat.ar : cat.en}
              </h4>
              <div className="grid grid-cols-4 gap-1.5">
                {cat.items.map((s) => (
                  <a
                    key={s.query}
                    href={googleImagesUrl(s.query)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-900 border border-slate-700 hover:border-emerald-300 transition"
                    title={isRtl ? s.ar : s.en}
                  >
                    <span className="text-lg leading-none">{s.emoji}</span>
                    <span className="text-[8.5px] font-semibold truncate w-full text-center">{isRtl ? s.ar : s.en}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[9px] text-slate-500 pt-1 border-t border-slate-800 leading-relaxed">
            {isRtl ? "افتح الموضوع → كليك يمين على الصورة → «نسخ الصورة» → ارجع والصقها بـ Ctrl+V." : "Open a topic → right-click image → Copy image → come back and Ctrl+V."}
          </p>
        </div>
      )}
    </div>
  );
}
