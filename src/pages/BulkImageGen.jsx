import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, Loader2, Sparkles, ImagePlus, Check, AlertCircle, CalendarClock } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import { addLocalMedia } from "@/utils/localMediaStore";
import { shrinkBlobToLimit } from "@/utils/imageConvert";
import { buildPrompt, generateImage, loadKit, loadLogo } from "@/utils/imagePrompt";
import { createScheduledPosts } from "@/utils/publishingService";
import { todayISO, toISODate } from "@/utils/localScheduleStore";
import BrandKitControls from "@/components/BrandKitControls";

const DEFAULT_TIMES = ["19:00", "13:00", "16:00", "21:00", "10:00", "12:00", "15:00", "18:00", "20:00", "22:00"];

// Content columns.
const COL = {
  scene:     ["وصف المشهد", "المشهد", "scene", "description"],
  hook:      ["الهوك", "hook"],
  highlight: ["الكلمات المميزة", "الكلمة المميزة", "highlight", "highlights"],
  caption:   ["الكابشن", "caption", "post"],
};
// Platform/placement columns — each cell holds the SIZE for that platform.
// "استوري" = a story on Instagram + Facebook.
const PLATFORM_COLS = [
  { names: ["انستقرام", "الستقرام", "انستجرام", "instagram"], platforms: ["instagram"], type: "feed", labelAr: "انستقرام" },
  { names: ["فيسبوك", "فيس بوك", "facebook"], platforms: ["facebook"], type: "feed", labelAr: "فيسبوك" },
  { names: ["تيك توك", "تيكتوك", "tiktok"], platforms: ["tiktok"], type: "feed", labelAr: "تيك توك" },
  { names: ["تويتر", "تويتر / x", "twitter", "x"], platforms: ["twitter"], type: "feed", labelAr: "تويتر" },
  { names: ["لينكدإن", "لينكدان", "linkedin"], platforms: ["linkedin"], type: "feed", labelAr: "لينكدإن" },
  { names: ["يوتيوب", "youtube"], platforms: ["youtube"], type: "feed", labelAr: "يوتيوب" },
  { names: ["سناب", "سناب شات", "snapchat"], platforms: ["snapchat"], type: "story", labelAr: "سناب" },
  { names: ["استوري", "ستوري", "story", "قصة"], platforms: ["instagram", "facebook"], type: "story", labelAr: "استوري" },
];

const VALID_ASPECTS = ["4:5", "1:1", "9:16", "16:9", "3:4", "4:3"];
const ASPECT_LABEL = { "4:5": "منشور 4:5", "1:1": "مربع 1:1", "9:16": "ستوري/ريلز 9:16", "16:9": "عريض 16:9", "3:4": "عمودي 3:4", "4:3": "أفقي 4:3" };
const ASPECT_RATIO = { "4:5": 0.8, "1:1": 1, "9:16": 0.5625, "16:9": 1.7778, "3:4": 0.75, "4:3": 1.3333 };
const NAME_TO_ASPECT = { "منشور": "4:5", "مربع": "1:1", "ستوري": "9:16", "ريلز": "9:16", "عريض": "16:9", "عمودي": "3:4", "أفقي": "4:3" };

function nearestAspect(r) {
  let best = "4:5", diff = Infinity;
  for (const id of VALID_ASPECTS) { const d = Math.abs(ASPECT_RATIO[id] - r); if (d < diff) { diff = d; best = id; } }
  return best;
}
// Extract an aspect id from a cell like "1080×1350 (4:5)" / "4:5" / "ستوري".
function parseAspectFromCell(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let m = s.match(/(\d{1,2})\s*[:：]\s*(\d{1,2})/);
  if (m) { const id = `${m[1]}:${m[2]}`; if (VALID_ASPECTS.includes(id)) return id; }
  m = s.match(/(\d{2,5})\s*[x×*]\s*(\d{2,5})/i);
  if (m) return nearestAspect((+m[1]) / (+m[2]));
  return NAME_TO_ASPECT[s] || NAME_TO_ASPECT[s.toLowerCase()] || null;
}
function pick(row, names) {
  for (const k of Object.keys(row)) if (names.includes(String(k).trim())) return String(row[k] ?? "").trim();
  return "";
}
// Fuzzy column match: a header counts as this platform if it CONTAINS the name
// (so "تويتر (X)" matches "تويتر", "انستقرام 📷" matches "انستقرام", etc.).
function cellRaw(row, names) {
  const lnames = names.map((n) => String(n).trim().toLowerCase()).filter((n) => n.length >= 3);
  for (const k of Object.keys(row)) {
    const kk = String(k).trim().toLowerCase();
    if (lnames.some((n) => kk.includes(n))) return row[k];
  }
  return "";
}
async function dataUrlToBlob(dataUrl) { return (await fetch(dataUrl)).blob(); }

export default function BulkImageGen({ ar }) {
  const [kit, setKit] = useState(loadKit);
  const [logo, setLogo] = useState(loadLogo);

  const [rows, setRows] = useState([]);       // [{scene, hook, highlight, caption, targets:[{platforms,type,aspect,labelAr}]}]
  const [jobs, setJobs] = useState([]);       // unique images: [{rowIndex, aspect, row}]
  const [results, setResults] = useState([]); // parallel to jobs: {status, dataUrl, url, error}
  const [generating, setGenerating] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState("");

  const [schedStart, setSchedStart] = useState(todayISO());
  const [perDay, setPerDay] = useState(1);
  const [times, setTimes] = useState(["19:00"]);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  useEffect(() => {
    const pd = Math.max(1, Math.min(10, parseInt(perDay) || 1));
    setTimes((prev) => Array.from({ length: pd }, (_, j) => prev[j] || DEFAULT_TIMES[j] || "19:00"));
  }, [perDay]);

  const downloadTemplate = () => {
    const headers = ["وصف المشهد", "الهوك", "الكلمات المميزة", "الكابشن", "انستقرام", "فيسبوك", "تيك توك", "استوري", "تويتر", "لينكدإن", "يوتيوب", "سناب"];
    const ex = [
      "هاتف على رخام كريمي يعرض تطبيق حجز مواعيد أنيق، إضاءة دافئة، مساحة فاضية بالأعلى للشعار والهوك",
      "صالونكِ يستاهل الأفضل", "صالونكِ",
      "أفضل تجربة لإدارة صالونك من مكان واحد 💜 hovera.sa #هوفيرا",
      "1080×1350 (4:5)", "1080×1350 (4:5)", "1080×1920 (9:16)", "1080×1920 (9:16)", "1080×1350 (4:5)", "1080×1350 (4:5)", "1280×720 (16:9)", "1080×1920 (9:16)",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ex]);
    ws["!cols"] = Array(headers.length).fill({ wch: 18 });
    ws["!cols"][0] = { wch: 45 }; ws["!cols"][3] = { wch: 42 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنشورات");
    XLSX.writeFile(wb, "نموذج_المنشورات.xlsx");
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setResults([]); setJobs([]); setSavedCount(0); setScheduledCount(0);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const parsed = json.map((r) => {
        const targets = [];
        for (const col of PLATFORM_COLS) {
          const asp = parseAspectFromCell(cellRaw(r, col.names));
          if (asp) targets.push({ platforms: col.platforms, type: col.type, aspect: asp, labelAr: col.labelAr });
        }
        return { scene: pick(r, COL.scene), hook: pick(r, COL.hook), highlight: pick(r, COL.highlight), caption: pick(r, COL.caption), targets };
      }).filter((r) => (r.scene || r.hook || r.caption) && r.targets.length);
      if (!parsed.length) { setError(ar ? "الملف فاضي أو ما فيه أعمدة منصات معبّأة (انستقرام/فيسبوك/تيك توك/استوري...)." : "No filled platform columns found."); return; }
      setRows(parsed);
    } catch (err) {
      setError((ar ? "تعذّرت قراءة الملف: " : "Couldn't read file: ") + (err?.message || err));
    } finally { e.target.value = ""; }
  };

  // Unique aspects per row → one image each (reused across platforms of same size).
  const rowAspects = (row) => Array.from(new Set(row.targets.map((t) => t.aspect)));
  const jobIdx = (rowIndex, aspect) => jobs.findIndex((j) => j.rowIndex === rowIndex && j.aspect === aspect);

  const ensureUploaded = async (j) => {
    if (results[j]?.url) return results[j].url;
    const blob = await dataUrlToBlob(results[j].dataUrl);
    const shrunk = await shrinkBlobToLimit(blob, { maxBytes: 9_500_000 });
    const file = new File([shrunk], `ai_${Date.now()}_${j}.png`, { type: shrunk.type || "image/png" });
    const { url } = await uploadFile({ file });
    setResults((prev) => { const n = [...prev]; if (n[j]) n[j] = { ...n[j], url }; return n; });
    return url;
  };

  const generateAll = async () => {
    if (!rows.length) return;
    const newJobs = [];
    rows.forEach((row, i) => rowAspects(row).forEach((aspect) => newJobs.push({ rowIndex: i, aspect, row })));
    setJobs(newJobs);
    setGenerating(true); setError(""); setSavedCount(0); setScheduledCount(0);
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

  // Flatten all (row × target) into schedulable items.
  const allTargets = () => rows.flatMap((row, i) => row.targets.map((t) => ({ rowIndex: i, row, ...t })));

  const transferAll = async () => {
    setTransferring(true); setError("");
    let saved = 0;
    try {
      for (const t of allTargets()) {
        const j = jobIdx(t.rowIndex, t.aspect);
        if (j < 0 || results[j]?.status !== "done") continue;
        const url = await ensureUploaded(j);
        const name = `${(t.row.hook || t.row.scene || "AI").slice(0, 30)} (${t.labelAr})`;
        for (const platform of t.platforms) {
          addLocalMedia({
            url, name, platform,
            post_id: `post_${Date.now()}_${t.rowIndex}_${platform}_${Math.random().toString(36).slice(2, 5)}`,
            caption_title: t.row.hook || "", caption_text: t.row.caption || "", position: 0, type: "image",
          });
          saved++;
        }
      }
      setSavedCount(saved);
    } catch (err) {
      setError((ar ? "تعذّر الترحيل: " : "Transfer failed: ") + (err?.message || err));
    } finally { setTransferring(false); }
  };

  const scheduleAll = async () => {
    const items = allTargets().filter((t) => { const j = jobIdx(t.rowIndex, t.aspect); return j >= 0 && results[j]?.status === "done"; });
    if (!items.length) return;
    setScheduling(true); setError(""); setScheduledCount(0);
    try {
      const pd = Math.max(1, Math.min(10, parseInt(perDay) || 1));
      const [y, m, d] = schedStart.split("-").map(Number);
      const payloads = [];
      for (let k = 0; k < items.length; k++) {
        const t = items[k];
        const url = await ensureUploaded(jobIdx(t.rowIndex, t.aspect));
        const dt = new Date(y, (m || 1) - 1, (d || 1) + Math.floor(k / pd));
        const date = toISODate(dt), time = times[k % pd] || "19:00";
        const uid = `bulk_${Date.now()}_${k}_${Math.random().toString(36).slice(2, 5)}`;
        payloads.push({
          status: "scheduled", platforms: t.platforms, postType: t.type,
          caption: t.row.caption || t.row.hook || "",
          scheduleDate: date, scheduleTime: time, scheduledAt: `${date}T${time}`,
          media: { type: "image", url, thumbnail: url, name: (t.row.hook || "AI").slice(0, 40) },
          sourcePostId: uid, designId: uid,
        });
      }
      const res = await createScheduledPosts(payloads);
      setScheduledCount(res.persisted.length);
    } catch (err) {
      setError((ar ? "تعذّرت الجدولة: " : "Scheduling failed: ") + (err?.message || err));
    } finally { setScheduling(false); }
  };

  const totalImages = rows.reduce((s, row) => s + rowAspects(row).length, 0);
  const totalTargets = rows.reduce((s, row) => s + row.targets.length, 0);
  const doneCount = results.filter((r) => r?.status === "done").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2 text-[12px] text-slate-300 leading-relaxed">
          <p className="font-bold text-white">{ar ? "كيف يعمل تبويب «عام»:" : "How bulk works:"}</p>
          <p>{ar ? "كل صف = منشور. تكتب عمود لكل منصة وفيه مقاسها (مثل ملفك):" : "One row = a post. A column per platform with its size:"}</p>
          <p className="text-slate-400">{ar ? "انستقرام · فيسبوك · تيك توك · تويتر · لينكدإن · استوري." : "instagram · facebook · tiktok · twitter · linkedin · story."}</p>
          <p className="text-emerald-300/90">{ar ? "عمود «استوري» = ينشر ستوري (انستقرام + فيسبوك). الصور بنفس المقاس تُولّد مرة وحدة وتُستخدم لكل منصاتها (أوفر)." : "Same-size images are generated once and reused."}</p>
        </div>
        <BrandKitControls ar={ar} onChange={(k, l) => { setKit(k); setLogo(l); }} />
      </div>

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
      </div>

      {error && <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2 text-[12px] text-red-200">{error}</div>}

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-slate-300 font-semibold">
              {ar ? `${rows.length} منشور · ${totalImages} صورة · ${totalTargets} وجهة نشر` : `${rows.length} posts · ${totalImages} images · ${totalTargets} targets`}
            </p>
            <button onClick={generateAll} disabled={generating}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold text-sm transition disabled:opacity-50 flex items-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? (ar ? `جارٍ التوليد… (${doneCount}/${totalImages})` : `Generating… (${doneCount}/${totalImages})`) : (ar ? `ولّد الصور (${totalImages})` : `Generate (${totalImages})`)}
            </button>
          </div>

          {jobs.length > 0 && VALID_ASPECTS.filter((a) => jobs.some((j) => j.aspect === a)).map((aspect) => {
            const group = jobs.map((job, j) => ({ job, j })).filter(({ job }) => job.aspect === aspect);
            return (
              <div key={aspect} className="space-y-2">
                <p className="text-[12px] font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-1">
                  <span>{ASPECT_LABEL[aspect] || aspect}</span>
                  <span className="text-slate-500 font-normal">({group.length})</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {group.map(({ job, j }) => {
                    const r = results[j];
                    const uses = job.row.targets.filter((t) => t.aspect === job.aspect).map((t) => t.labelAr).join("، ");
                    return (
                      <div key={j} className="bg-slate-800/60 rounded-lg overflow-hidden border border-slate-700">
                        <div className="bg-slate-950 flex items-center justify-center relative w-full overflow-hidden" style={{ aspectRatio: job.aspect.replace(":", "/") }}>
                          {r?.status === "done" ? <img src={r.dataUrl} alt="" className="w-full h-full object-cover" />
                            : r?.status === "pending" ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                            : r?.status === "error" ? <AlertCircle className="w-6 h-6 text-red-400" />
                            : <ImagePlus className="w-6 h-6 text-slate-700" />}
                          <span className="absolute top-1.5 end-1.5 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full" dir="ltr">{job.aspect}</span>
                        </div>
                        <div className="p-2">
                          <p className="text-[11px] text-white truncate font-semibold">{job.row.hook || job.row.scene || `#${job.rowIndex + 1}`}</p>
                          <p className="text-[9px] text-slate-400 truncate">{uses}</p>
                          {r?.status === "error" && <p className="text-[9px] text-red-300 truncate">{r.error}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {doneCount > 0 && !generating && (
            <div className="space-y-4">
              <div className="bg-slate-900/40 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                <p className="text-[13px] font-bold text-white flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-indigo-300" />
                  {ar ? "جدولة الكل — كل صورة على منصتها ونوعها" : "Schedule all"}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">{ar ? "تاريخ البداية" : "Start date"}</label>
                    <input type="date" value={schedStart} min={todayISO()} onChange={(e) => setSchedStart(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">{ar ? "كم منشور في اليوم؟" : "Posts per day?"}</label>
                    <input type="number" min="1" max="10" value={perDay} onChange={(e) => setPerDay(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-semibold">{ar ? "أوقات النشر في اليوم" : "Times per day"}</label>
                  <div className="space-y-1.5 bg-slate-800/40 rounded-lg p-2">
                    {times.map((t, k) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-200 font-semibold w-16 flex-shrink-0">{ar ? `منشور ${k + 1}` : `Post ${k + 1}`}</span>
                        <input type="time" value={t} dir="ltr"
                          onChange={(e) => setTimes((prev) => { const n = prev.slice(); n[k] = e.target.value; return n; })}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[12px] text-white outline-none focus:border-indigo-500" />
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={scheduleAll} disabled={scheduling || scheduledCount > 0}
                  className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${scheduledCount > 0 ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white"} disabled:opacity-60`}>
                  {scheduling ? <Loader2 className="w-5 h-5 animate-spin" /> : scheduledCount > 0 ? <Check className="w-5 h-5" /> : <CalendarClock className="w-5 h-5" />}
                  {scheduledCount > 0 ? (ar ? `تمت جدولة ${scheduledCount} منشور` : `Scheduled ${scheduledCount}`) : (ar ? `جدولة الكل (${totalTargets})` : `Schedule all (${totalTargets})`)}
                </button>
              </div>

              <button onClick={transferAll} disabled={transferring || savedCount > 0}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${savedCount > 0 ? "bg-emerald-700 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-100"} disabled:opacity-60`}>
                {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : savedCount > 0 ? <Check className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
                {savedCount > 0 ? (ar ? `تم ترحيل ${savedCount} للمكتبة` : `Transferred ${savedCount}`) : (ar ? `أو رحّلها للمكتبة فقط` : `Or just save to library`)}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
