import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, Loader2, Sparkles, ImagePlus, Check, AlertCircle } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import { addLocalMedia } from "@/utils/localMediaStore";
import { shrinkBlobToLimit } from "@/utils/imageConvert";
import { buildPrompt, generateImage, ASPECTS, loadKit, loadLogo } from "@/utils/imagePrompt";
import { PLATFORMS } from "@/components/BulkMediaUploadModal";
import BrandKitControls from "@/components/BrandKitControls";

// Bulk ("عام") tab: download an Excel template (4 columns), fill one row per
// post, re-upload, auto-generate every row with the shared brand identity, then
// transfer all to the library tagged by the chosen platform(s) + caption.

const COL = {
  scene:     ["وصف المشهد", "المشهد", "scene", "description"],
  hook:      ["الهوك", "hook"],
  highlight: ["الكلمات المميزة", "الكلمة المميزة", "highlight", "highlights"],
  caption:   ["الكابشن", "caption", "post"],
};
function pick(row, names) {
  for (const k of Object.keys(row)) {
    const key = String(k).trim();
    if (names.includes(key)) return String(row[k] ?? "").trim();
  }
  return "";
}

async function dataUrlToBlob(dataUrl) {
  const r = await fetch(dataUrl);
  return r.blob();
}

export default function BulkImageGen({ ar }) {
  const [platforms, setPlatforms] = useState(["instagram"]);
  const [aspect, setAspect] = useState("4:5");
  const [kit, setKit] = useState(loadKit);
  const [logo, setLogo] = useState(loadLogo);

  const [rows, setRows] = useState([]);       // [{scene, hook, highlight, caption}]
  const [results, setResults] = useState([]); // [{status, dataUrl, error}]
  const [generating, setGenerating] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState("");

  const togglePlatform = (id) =>
    setPlatforms((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  // ── Template download ────────────────────────────────────────────
  const downloadTemplate = () => {
    const headers = ["وصف المشهد", "الهوك", "الكلمات المميزة", "الكابشن"];
    const example = [
      "هاتف على رخام كريمي يعرض تطبيق حجز مواعيد أنيق، وردة وردية ناعمة بالخلفية، إضاءة دافئة",
      "صالونكِ يستاهل الأفضل",
      "صالونكِ، الأفضل",
      "أفضل تجربة لإدارة صالونك من مكان واحد — جرّبها اليوم 💜 #هوفيرا",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = [{ wch: 45 }, { wch: 28 }, { wch: 22 }, { wch: 45 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنشورات");
    XLSX.writeFile(wb, "نموذج_المنشورات.xlsx");
  };

  // ── Upload + parse ───────────────────────────────────────────────
  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setResults([]); setSavedCount(0);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parsed = json
        .map((r) => ({
          scene: pick(r, COL.scene),
          hook: pick(r, COL.hook),
          highlight: pick(r, COL.highlight),
          caption: pick(r, COL.caption),
        }))
        .filter((r) => r.scene || r.hook || r.caption); // drop empty rows
      if (parsed.length === 0) {
        setError(ar ? "الملف فاضي أو الأعمدة غير مطابقة للنموذج." : "Empty file or columns don't match the template.");
        return;
      }
      setRows(parsed);
    } catch (err) {
      setError((ar ? "تعذّرت قراءة الملف: " : "Couldn't read file: ") + (err?.message || err));
    } finally {
      e.target.value = ""; // allow re-uploading the same file
    }
  };

  // ── Generate all rows (sequential — gentler on the API) ──────────
  const generateAll = async () => {
    if (!rows.length) return;
    setGenerating(true); setError(""); setSavedCount(0);
    const res = rows.map(() => ({ status: "pending" }));
    setResults([...res]);
    for (let i = 0; i < rows.length; i++) {
      try {
        const prompt = buildPrompt({ scene: rows[i].scene, hook: rows[i].hook, highlight: rows[i].highlight, aspect, kit });
        const dataUrl = await generateImage({ prompt, referenceImage: logo || undefined, aspectRatio: aspect });
        res[i] = { status: "done", dataUrl };
      } catch (err) {
        res[i] = { status: "error", error: err?.message || String(err) };
      }
      setResults([...res]);
    }
    setGenerating(false);
  };

  // ── Transfer all generated to the library ────────────────────────
  const transferAll = async () => {
    const targets = platforms.length ? platforms : ["instagram"];
    setTransferring(true); setError("");
    let saved = 0;
    try {
      for (let i = 0; i < rows.length; i++) {
        if (results[i]?.status !== "done") continue;
        const blob = await dataUrlToBlob(results[i].dataUrl);
        const shrunk = await shrinkBlobToLimit(blob, { maxBytes: 9_500_000 });
        const file = new File([shrunk], `ai_${Date.now()}_${i}.png`, { type: shrunk.type || "image/png" });
        const { url } = await uploadFile({ file });
        const name = (rows[i].hook || rows[i].scene || "AI image").slice(0, 40);
        // One library post per platform so it shows under each platform's filter.
        for (const platform of targets) {
          addLocalMedia({
            url, name, platform,
            post_id: `post_${Date.now()}_${i}_${platform}_${Math.random().toString(36).slice(2, 5)}`,
            caption_title: rows[i].hook || "",
            caption_text: rows[i].caption || "",
            position: 0, type: "image",
          });
          saved++;
        }
      }
      setSavedCount(saved);
    } catch (err) {
      setError((ar ? "تعذّر الترحيل: " : "Transfer failed: ") + (err?.message || err));
    } finally {
      setTransferring(false);
    }
  };

  const doneCount = results.filter((r) => r?.status === "done").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Shared settings */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          {/* Platforms */}
          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "تُرحّل للمكتبة في قسم:" : "Save to library under:"}</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => {
                const active = platforms.includes(p.id);
                return (
                  <button key={p.id} onClick={() => togglePlatform(p.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition inline-flex items-center gap-1 ${active ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                    <span>{p.emoji}</span><span>{ar ? p.labelAr : p.label}</span>{active && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Size */}
          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "المقاس" : "Size"}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECTS.map((a) => (
                <button key={a.id} onClick={() => setAspect(a.id)}
                  className={`py-2 rounded-lg text-[11px] font-bold transition ${aspect === a.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                  {ar ? a.ar : a.en}
                </button>
              ))}
            </div>
          </div>
        </div>
        <BrandKitControls ar={ar} onChange={(k, l) => { setKit(k); setLogo(l); }} />
      </div>

      {/* Steps: template + upload */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
        <p className="text-[13px] font-bold text-white">{ar ? "الخطوات:" : "Steps:"}</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition">
            <Download className="w-4 h-4" /> {ar ? "١) نزّل النموذج (إكسل)" : "1) Download template (Excel)"}
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-700/50 hover:bg-indigo-700/70 text-white font-semibold text-sm transition cursor-pointer">
            <Upload className="w-4 h-4" /> {ar ? "٢) ارفع الملف المعبّأ" : "2) Upload filled file"}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onUpload} />
          </label>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {ar ? "أعمدة النموذج: وصف المشهد · الهوك · الكلمات المميزة · الكابشن. كل صف = منشور. (المنصة والألوان والخط من الإعدادات أعلاه — تنطبق على الكل.)"
              : "Columns: scene · hook · highlight words · caption. One row = one post."}
        </p>
      </div>

      {error && <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2 text-[12px] text-red-200">{error}</div>}

      {/* Rows + generate */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300 font-semibold">{ar ? `${rows.length} منشور في الملف` : `${rows.length} posts in file`}</p>
            <button onClick={generateAll} disabled={generating}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold text-sm transition disabled:opacity-50 flex items-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? (ar ? `جارٍ التوليد… (${doneCount}/${rows.length})` : `Generating… (${doneCount}/${rows.length})`) : (ar ? `ولّد الكل (${rows.length})` : `Generate all (${rows.length})`)}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {rows.map((row, i) => {
              const r = results[i];
              return (
                <div key={i} className="bg-slate-800/60 rounded-lg overflow-hidden border border-slate-700">
                  <div className="aspect-square bg-slate-950 flex items-center justify-center">
                    {r?.status === "done" ? (
                      <img src={r.dataUrl} alt="" className="w-full h-full object-cover" />
                    ) : r?.status === "pending" ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    ) : r?.status === "error" ? (
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    ) : (
                      <ImagePlus className="w-6 h-6 text-slate-700" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-white truncate font-semibold">{row.hook || row.scene || `#${i + 1}`}</p>
                    {r?.status === "error" && <p className="text-[9px] text-red-300 truncate">{r.error}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {doneCount > 0 && !generating && (
            <button onClick={transferAll} disabled={transferring || savedCount > 0}
              className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${savedCount > 0 ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"} disabled:opacity-60`}>
              {transferring ? <Loader2 className="w-5 h-5 animate-spin" /> : savedCount > 0 ? <Check className="w-5 h-5" /> : <ImagePlus className="w-5 h-5" />}
              {savedCount > 0
                ? (ar ? `تم ترحيل ${savedCount} للمكتبة` : `Transferred ${savedCount} to library`)
                : (ar ? `رحّل ${doneCount} منشور للمكتبة` : `Transfer ${doneCount} to library`)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
