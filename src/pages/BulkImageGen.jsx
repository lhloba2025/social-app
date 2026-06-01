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
// post, re-upload, pick one OR MORE sizes, auto-generate every row in every
// chosen size with the shared brand identity, then transfer all to the library
// tagged by the chosen platform(s) + caption.

const COL = {
  scene:     ["وصف المشهد", "المشهد", "scene", "description"],
  hook:      ["الهوك", "hook"],
  highlight: ["الكلمات المميزة", "الكلمة المميزة", "highlight", "highlights"],
  caption:   ["الكابشن", "caption", "post"],
};
function pick(row, names) {
  for (const k of Object.keys(row)) {
    if (names.includes(String(k).trim())) return String(row[k] ?? "").trim();
  }
  return "";
}
async function dataUrlToBlob(dataUrl) { return (await fetch(dataUrl)).blob(); }

export default function BulkImageGen({ ar }) {
  const [platforms, setPlatforms] = useState(["instagram"]);
  const [aspects, setAspects] = useState(["4:5"]); // one OR MORE sizes
  const [kit, setKit] = useState(loadKit);
  const [logo, setLogo] = useState(loadLogo);

  const [rows, setRows] = useState([]);
  const [jobs, setJobs] = useState([]);       // [{row, rowIndex, aspect}]
  const [results, setResults] = useState([]); // parallel to jobs: {status, dataUrl, error}
  const [generating, setGenerating] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState("");

  const togglePlatform = (id) => setPlatforms((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const toggleAspect = (id) => setAspects((a) => (a.includes(id) ? (a.length > 1 ? a.filter((x) => x !== id) : a) : [...a, id]));

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

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setResults([]); setJobs([]); setSavedCount(0);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parsed = json
        .map((r) => ({ scene: pick(r, COL.scene), hook: pick(r, COL.hook), highlight: pick(r, COL.highlight), caption: pick(r, COL.caption) }))
        .filter((r) => r.scene || r.hook || r.caption);
      if (parsed.length === 0) { setError(ar ? "الملف فاضي أو الأعمدة غير مطابقة للنموذج." : "Empty file or columns don't match."); return; }
      setRows(parsed);
    } catch (err) {
      setError((ar ? "تعذّرت قراءة الملف: " : "Couldn't read file: ") + (err?.message || err));
    } finally { e.target.value = ""; }
  };

  const generateAll = async () => {
    if (!rows.length) return;
    const newJobs = [];
    rows.forEach((row, i) => aspects.forEach((a) => newJobs.push({ row, rowIndex: i, aspect: a })));
    setJobs(newJobs);
    setGenerating(true); setError(""); setSavedCount(0);
    const res = newJobs.map(() => ({ status: "pending" }));
    setResults([...res]);
    for (let j = 0; j < newJobs.length; j++) {
      try {
        const { row, aspect } = newJobs[j];
        const prompt = buildPrompt({ scene: row.scene, hook: row.hook, highlight: row.highlight, aspect, kit });
        res[j] = { status: "done", dataUrl: await generateImage({ prompt, referenceImage: logo || undefined, aspectRatio: aspect }) };
      } catch (err) {
        res[j] = { status: "error", error: err?.message || String(err) };
      }
      setResults([...res]);
    }
    setGenerating(false);
  };

  const transferAll = async () => {
    const targets = platforms.length ? platforms : ["instagram"];
    setTransferring(true); setError("");
    let saved = 0;
    try {
      for (let j = 0; j < jobs.length; j++) {
        if (results[j]?.status !== "done") continue;
        const { row, aspect } = jobs[j];
        const blob = await dataUrlToBlob(results[j].dataUrl);
        const shrunk = await shrinkBlobToLimit(blob, { maxBytes: 9_500_000 });
        const file = new File([shrunk], `ai_${Date.now()}_${j}.png`, { type: shrunk.type || "image/png" });
        const { url } = await uploadFile({ file });
        const name = `${(row.hook || row.scene || "AI").slice(0, 34)} (${aspect})`;
        for (const platform of targets) {
          addLocalMedia({
            url, name, platform,
            post_id: `post_${Date.now()}_${j}_${platform}_${Math.random().toString(36).slice(2, 5)}`,
            caption_title: row.hook || "", caption_text: row.caption || "", position: 0, type: "image",
          });
          saved++;
        }
      }
      setSavedCount(saved);
    } catch (err) {
      setError((ar ? "تعذّر الترحيل: " : "Transfer failed: ") + (err?.message || err));
    } finally { setTransferring(false); }
  };

  const total = rows.length * aspects.length;
  const doneCount = results.filter((r) => r?.status === "done").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
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
          {/* Sizes (multi-select) */}
          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "المقاسات (اختر أكثر من واحد):" : "Sizes (pick one or more):"}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECTS.map((a) => {
                const active = aspects.includes(a.id);
                return (
                  <button key={a.id} onClick={() => toggleAspect(a.id)}
                    className={`py-2 rounded-lg text-[11px] font-bold transition ${active ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                    {ar ? a.ar : a.en}{active && " ✓"}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{ar ? "كل منشور يتولّد بكل مقاس اخترته (للفيد، الستوري… إلخ)." : "Each post is generated in every chosen size."}</p>
          </div>
        </div>
        <BrandKitControls ar={ar} onChange={(k, l) => { setKit(k); setLogo(l); }} />
      </div>

      {/* Steps */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
        <p className="text-[13px] font-bold text-white">{ar ? "الخطوات:" : "Steps:"}</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition">
            <Download className="w-4 h-4" /> {ar ? "١) نزّل النموذج (إكسل)" : "1) Download template"}
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-700/50 hover:bg-indigo-700/70 text-white font-semibold text-sm transition cursor-pointer">
            <Upload className="w-4 h-4" /> {ar ? "٢) ارفع الملف المعبّأ" : "2) Upload filled file"}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onUpload} />
          </label>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {ar ? "أعمدة النموذج: وصف المشهد · الهوك · الكلمات المميزة · الكابشن. كل صف = منشور."
              : "Columns: scene · hook · highlight · caption. One row = one post."}
        </p>
      </div>

      {error && <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2 text-[12px] text-red-200">{error}</div>}

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-slate-300 font-semibold">
              {ar ? `${rows.length} منشور × ${aspects.length} مقاس = ${total} صورة` : `${rows.length} posts × ${aspects.length} sizes = ${total} images`}
            </p>
            <button onClick={generateAll} disabled={generating}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold text-sm transition disabled:opacity-50 flex items-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? (ar ? `جارٍ التوليد… (${doneCount}/${total})` : `Generating… (${doneCount}/${total})`) : (ar ? `ولّد الكل (${total})` : `Generate all (${total})`)}
            </button>
          </div>

          {jobs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {jobs.map((job, j) => {
                const r = results[j];
                return (
                  <div key={j} className="bg-slate-800/60 rounded-lg overflow-hidden border border-slate-700">
                    <div className="aspect-square bg-slate-950 flex items-center justify-center relative">
                      {r?.status === "done" ? <img src={r.dataUrl} alt="" className="w-full h-full object-cover" />
                        : r?.status === "pending" ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        : r?.status === "error" ? <AlertCircle className="w-6 h-6 text-red-400" />
                        : <ImagePlus className="w-6 h-6 text-slate-700" />}
                      <span className="absolute top-1.5 end-1.5 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full" dir="ltr">{job.aspect}</span>
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] text-white truncate font-semibold">{job.row.hook || job.row.scene || `#${job.rowIndex + 1}`}</p>
                      {r?.status === "error" && <p className="text-[9px] text-red-300 truncate">{r.error}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {doneCount > 0 && !generating && (
            <button onClick={transferAll} disabled={transferring || savedCount > 0}
              className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${savedCount > 0 ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"} disabled:opacity-60`}>
              {transferring ? <Loader2 className="w-5 h-5 animate-spin" /> : savedCount > 0 ? <Check className="w-5 h-5" /> : <ImagePlus className="w-5 h-5" />}
              {savedCount > 0 ? (ar ? `تم ترحيل ${savedCount} للمكتبة` : `Transferred ${savedCount}`) : (ar ? `رحّل ${doneCount} صورة للمكتبة` : `Transfer ${doneCount} to library`)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
