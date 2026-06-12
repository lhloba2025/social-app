import React, { useState, useRef } from "react";
import { Copy, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Upload, X, Loader2 } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";
import FiltersPanel from "./FiltersPanel";
import BlendModesPanel from "./BlendModesPanel";
import { uploadFile } from "@/api/localClient";
import { normalizeImageFile, isHeic } from "@/utils/imageConvert";
import { SAUDI_MAP_PATH, SAUDI_REGIONS } from "../data/saudiMapPath";

const SHAPE_TYPES = [
  { id: "rect", labelAr: "مستطيل", labelEn: "Rectangle" },
  { id: "circle", labelAr: "دائرة", labelEn: "Circle" },
  { id: "line", labelAr: "خط", labelEn: "Line" },
  { id: "triangle", labelAr: "مثلث", labelEn: "Triangle" },
  { id: "diamond", labelAr: "معين", labelEn: "Diamond" },
  { id: "star", labelAr: "نجمة", labelEn: "Star" },
  { id: "hexagon", labelAr: "سداسي", labelEn: "Hexagon" },
  { id: "pentagon", labelAr: "خماسي", labelEn: "Pentagon" },
  { id: "arrow", labelAr: "سهم", labelEn: "Arrow" },
  { id: "ellipse", labelAr: "بيضاوي", labelEn: "Ellipse" },
  { id: "rounded", labelAr: "مستطيل مستدير", labelEn: "Rounded" },
  // ── Wavy / professional photo-frame shapes (support fillImage) ──
  { id: "blob",         labelAr: "بقعة عضوية",  labelEn: "Blob"         },
  { id: "wave_shape",   labelAr: "إطار موجي",    labelEn: "Wave Frame"   },
  { id: "cloud",        labelAr: "سحابة",       labelEn: "Cloud"        },
  { id: "heart",        labelAr: "قلب",         labelEn: "Heart"        },
  { id: "splash",       labelAr: "رشة",         labelEn: "Splash"       },
  { id: "petal",        labelAr: "بتلة",        labelEn: "Petal"        },
  { id: "flower",       labelAr: "زهرة",        labelEn: "Flower"       },
  { id: "arch_top",     labelAr: "إطار قوسي",   labelEn: "Arch Top"     },
  { id: "tag",          labelAr: "بطاقة سعر",   labelEn: "Price Tag"    },
  { id: "shield",       labelAr: "درع",         labelEn: "Shield"       },
  { id: "ticket",       labelAr: "تذكرة",       labelEn: "Ticket"       },
  { id: "stadium",      labelAr: "قرص",         labelEn: "Stadium"      },
  { id: "chevron_shape",labelAr: "شيفرون",      labelEn: "Chevron"      },
  { id: "burst",        labelAr: "انفجار",      labelEn: "Burst"        },
  { id: "octagon",      labelAr: "مثمن",        labelEn: "Octagon"      },
  // ── Note stickers (sticky notes, speech bubbles, cards) ──
  { id: "sticky_note",   labelAr: "📝 ملاحظة لاصقة", labelEn: "Sticky Note"  },
  { id: "speech_bubble", labelAr: "💬 فقاعة حوار",   labelEn: "Speech Bubble"},
  { id: "thought_bubble",labelAr: "💭 فقاعة فكرة",    labelEn: "Thought"      },
  { id: "torn_paper",    labelAr: "📄 ورقة ممزقة",   labelEn: "Torn Paper"   },
  { id: "index_card",    labelAr: "🗂️ بطاقة فهرس",   labelEn: "Index Card"   },
  { id: "note_tape",     labelAr: "📌 ورقة ملصقة",   labelEn: "Tape Note"    },
  { id: "note_pin",      labelAr: "📍 ورقة مثبتة",   labelEn: "Pinned Note"  },
  // ── Device mockups (insert screen image into a phone/tablet/laptop) ──
  { id: "phone_mockup",  labelAr: "📱 موكاب آيفون",   labelEn: "iPhone Mockup" },
  { id: "tablet_mockup", labelAr: "🖥️ موكاب آيباد",   labelEn: "iPad Mockup"   },
  { id: "laptop_mockup", labelAr: "💻 موكاب لابتوب",  labelEn: "Laptop Mockup" },
  { id: "browser_window",labelAr: "🌐 نافذة متصفح",   labelEn: "Browser Window"},
  { id: "monitor_mockup",labelAr: "🖥️ شاشة مكتب",      labelEn: "Monitor"        },
  { id: "tv_mockup",     labelAr: "📺 تلفزيون",        labelEn: "TV"             },
  { id: "watch_mockup",  labelAr: "⌚ ساعة ذكية",      labelEn: "Smart Watch"    },
  { id: "car_side",      labelAr: "🚗 سيارة جانبي",    labelEn: "Car Side View"  },
  { id: "tshirt_mockup", labelAr: "👕 تيشيرت",         labelEn: "T-Shirt"        },
  // ── Country / region maps ────────────────────────────────────
  { id: "saudi_map",     labelAr: "🇸🇦 خريطة السعودية", labelEn: "Saudi Map"      },
  { id: "saudi_regions", labelAr: "🗺️ السعودية بالمناطق", labelEn: "Saudi (Regions)" },
  { id: "gcc_map",       labelAr: "🌍 خريطة الخليج",   labelEn: "GCC Map"        },
  { id: "arabia_map",    labelAr: "🗺️ شبه الجزيرة",    labelEn: "Arabian Peninsula" },
];

const DECO_SHAPE_TYPES = [
  { id: "chain", labelAr: "سلسلة", labelEn: "Chain" },
  { id: "rope", labelAr: "حبل", labelEn: "Rope" },
  { id: "arc_ribbon", labelAr: "شريط قوسي", labelEn: "Arc Ribbon" },
  { id: "wave_ribbon", labelAr: "شريط موجي", labelEn: "Wave" },
  { id: "ring_chain", labelAr: "حلقات", labelEn: "Rings" },
  { id: "dots_line", labelAr: "خط نقاط", labelEn: "Dots" },
  { id: "zigzag", labelAr: "متعرج", labelEn: "Zigzag" },
  { id: "crescent", labelAr: "هلال", labelEn: "Crescent" },
];

const DECO_IDS = new Set(DECO_SHAPE_TYPES.map(d => d.id));

export default function ShapesPanel({ shapes, selectedId, onSelect, onAdd, onUpdate, onDelete, onDuplicate, onReorder, language, decoMode = false, selectedRegion, onSelectRegion }) {
  const isRtl = language === "ar";
  const selected = shapes.find((s) => s.id === selectedId);
  const update = (key, val) => { if (selected) onUpdate(selected.id, { [key]: val }); };
  const [multiSelected, setMultiSelected] = useState([]);
  const [uploadingFill, setUploadingFill] = useState(false);
  const [uploadingRegion, setUploadingRegion] = useState(null);
  const fillImgRef = useRef();
  const regionImgRef = useRef();

  // Per-region style helpers for the multi-region Saudi map
  const setRegionStyle = (regionId, patch) => {
    if (!selected) return;
    const cur = selected.regionStyles || {};
    const next = { ...cur, [regionId]: { ...(cur[regionId] || {}), ...patch } };
    onUpdate(selected.id, { regionStyles: next });
  };
  const clearRegionStyle = (regionId) => {
    if (!selected) return;
    const next = { ...(selected.regionStyles || {}) };
    delete next[regionId];
    onUpdate(selected.id, { regionStyles: next });
  };
  const [distributeGap, setDistributeGap] = useState(5);
  const [distributeDir, setDistributeDir] = useState("h"); // h or v

  const toggleMultiSelect = (id, e) => {
    e.stopPropagation();
    setMultiSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Get working set: multiSelected if any, else single selected, else all visible
  const getTargets = () => {
    if (multiSelected.length > 0) return shapes.filter(s => multiSelected.includes(s.id));
    if (selected) return [selected];
    return [];
  };

  // Center selected shapes
  const centerH = () => {
    getTargets().forEach(s => onUpdate(s.id, { x: 50 - (s.width || 20) / 2 }));
  };
  const centerV = () => {
    getTargets().forEach(s => onUpdate(s.id, { y: 50 - (s.height || 15) / 2 }));
  };

  // Move selected shape away from center by distributeGap amount
  const distributeH = () => {
    if (!selected) return;
    const currentX = selected.x || 50;
    const center = 50;
    const direction = currentX >= center ? 1 : -1;
    onUpdate(selected.id, { x: center + direction * distributeGap - (selected.width || 20) / 2 });
  };

  const distributeV = () => {
    if (!selected) return;
    const currentY = selected.y || 50;
    const center = 50;
    const direction = currentY >= center ? 1 : -1;
    onUpdate(selected.id, { y: center + direction * distributeGap - (selected.height || 15) / 2 });
  };

  const moveShapeUp = (id) => {
    const idx = shapes.findIndex(s => s.id === id);
    if (idx < shapes.length - 1 && onReorder) {
      const newArr = [...shapes];
      [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      onReorder(newArr);
    }
  };

  const moveShapeDown = (id) => {
    const idx = shapes.findIndex(s => s.id === id);
    if (idx > 0 && onReorder) {
      const newArr = [...shapes];
      [newArr[idx], newArr[idx - 1]] = [newArr[idx - 1], newArr[idx]];
      onReorder(newArr);
    }
  };

  const moveSelectedUp = () => {
    if (multiSelected.length === 0 || !onReorder) return;
    const newArr = [...shapes];
    multiSelected.forEach(id => {
      const idx = newArr.findIndex(s => s.id === id);
      if (idx < newArr.length - 1) {
        [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      }
    });
    onReorder(newArr);
  };

  const moveSelectedDown = () => {
    if (multiSelected.length === 0 || !onReorder) return;
    const newArr = [...shapes];
    [...multiSelected].reverse().forEach(id => {
      const idx = newArr.findIndex(s => s.id === id);
      if (idx > 0) {
        [newArr[idx], newArr[idx - 1]] = [newArr[idx - 1], newArr[idx]];
      }
    });
    onReorder(newArr);
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Add shapes — shown only in normal mode */}
      {!decoMode && (
        <div className="grid grid-cols-3 gap-1">
          {SHAPE_TYPES.map((st) => (
            <button
              key={st.id}
              onClick={() => onAdd(st.id)}
              className="flex flex-col items-center gap-1 p-2 rounded bg-slate-50 hover:bg-indigo-600 border border-[var(--hv-border)] transition text-[var(--hv-text)] hover:text-white"
            >
              <ShapeIcon type={st.id} />
              <span className="text-[10px]">{isRtl ? st.labelAr : st.labelEn}</span>
            </button>
          ))}
        </div>
      )}

      {/* Decorative shapes — shown only in deco mode */}
      {decoMode && (
        <div>
          <p className="font-semibold mb-1" style={{color:'var(--hv-text-soft)'}}>✦ {isRtl ? "زخارف وحبال" : "Decorative"}</p>
          <div className="grid grid-cols-4 gap-1">
            {DECO_SHAPE_TYPES.map((st) => (
              <button
                key={st.id}
                onClick={() => onAdd(st.id)}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded bg-slate-50 hover:bg-purple-700 border border-[var(--hv-border)] transition text-[var(--hv-text)] hover:text-white"
              >
                <DecoIcon type={st.id} />
                <span className="text-[9px] text-center leading-tight">{isRtl ? st.labelAr : st.labelEn}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Align & Distribute */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-slate-500">{isRtl ? "محاذاة وتوزيع" : "Align & Distribute"}</p>
          {multiSelected.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-indigo-600 text-[10px]">{multiSelected.length} {isRtl ? "محدد" : "selected"}</span>
              <button onClick={() => setMultiSelected([])} className="text-slate-400 hover:text-red-500 text-[10px]">✕</button>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={centerH} disabled={getTargets().length === 0}
            className="flex-1 py-1.5 rounded bg-slate-50 hover:bg-indigo-600 hover:text-white text-[var(--hv-text)] border border-[var(--hv-border)] disabled:opacity-30 transition text-[10px] font-semibold">
            ⬌ {isRtl ? "أفقي" : "Ctr H"}
          </button>
          <button onClick={centerV} disabled={getTargets().length === 0}
            className="flex-1 py-1.5 rounded bg-slate-50 hover:bg-indigo-600 hover:text-white text-[var(--hv-text)] border border-[var(--hv-border)] disabled:opacity-30 transition text-[10px] font-semibold">
            ⬍ {isRtl ? "عمودي" : "Ctr V"}
          </button>
          <button onClick={() => { centerH(); centerV(); }} disabled={getTargets().length === 0}
            className="flex-1 py-1.5 rounded bg-slate-50 hover:bg-indigo-600 hover:text-white text-[var(--hv-text)] border border-[var(--hv-border)] disabled:opacity-30 transition text-[10px] font-semibold">
            ⊕ {isRtl ? "مركز" : "Both"}
          </button>
        </div>

        {/* Offset from center */}
        <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded-lg p-2 space-y-2">
          <label className="font-semibold block" style={{color:'var(--hv-text)'}}>{isRtl ? "المسافة عن السنتر%" : "Offset from center %"}</label>
          <input
            type="number" min="0" max="200" value={distributeGap}
            onChange={(e) => setDistributeGap(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)]"
          />
          <div className="flex gap-1">
            <button
              onClick={distributeH}
              disabled={!selected}
              className="flex-1 py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[11px] font-bold transition"
            >
              ↔ {isRtl ? "أفقي" : "Horizontal"}
            </button>
            <button
              onClick={distributeV}
              disabled={!selected}
              className="flex-1 py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[11px] font-bold transition"
            >
              ↕ {isRtl ? "عمودي" : "Vertical"}
            </button>
          </div>
        </div>
      </div>

      {/* Multi-select layer controls */}
      {multiSelected.length > 0 && (
        <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded-lg p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-indigo-600 text-xs font-semibold">{multiSelected.length} {isRtl ? "محدد" : "selected"}</span>
            <button onClick={() => setMultiSelected([])} className="text-slate-400 hover:text-red-500 text-xs">✕</button>
          </div>
          <div className="flex gap-1">
            <button onClick={moveSelectedUp} className="flex-1 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1">
              <ArrowUp className="w-3 h-3" /> {isRtl ? "أمام" : "Forward"}
            </button>
            <button onClick={moveSelectedDown} className="flex-1 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1">
              <ArrowDown className="w-3 h-3" /> {isRtl ? "خلف" : "Backward"}
            </button>
          </div>
        </div>
      )}

      {/* Shape list */}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {shapes.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition border text-[var(--hv-text)] ${
              multiSelected.includes(s.id) ? "border-purple-500 bg-purple-50" :
              s.id === selectedId ? "border-[var(--hv-primary)] bg-[rgba(79,70,229,0.08)]" : "bg-slate-50 hover:bg-slate-100 border-[var(--hv-border)]"
            }`}
          >
            <input
              type="checkbox"
              checked={multiSelected.includes(s.id)}
              onChange={(e) => toggleMultiSelect(s.id, e)}
              onClick={(e) => e.stopPropagation()}
              className="w-3 h-3 accent-purple-500 flex-shrink-0"
            />
            <ShapeIcon type={s.shapeType} size={12} />
            <span className="flex-1" style={{color:'var(--hv-text)'}}>{isRtl ? SHAPE_TYPES.find(st => st.id === s.shapeType)?.labelAr : SHAPE_TYPES.find(st => st.id === s.shapeType)?.labelEn}</span>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(s.id, { visible: !s.visible }); }} className="text-slate-400 hover:text-[var(--hv-text)]">
              {s.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(s.id); }} className="text-slate-400 hover:text-[var(--hv-text)]" title="Ctrl+D">
              <Copy className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); moveShapeUp(s.id); }} className="text-slate-400 hover:text-[var(--hv-text)]" title={isRtl ? "أمام" : "Bring Forward"}>
              <ArrowUp className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); moveShapeDown(s.id); }} className="text-slate-400 hover:text-[var(--hv-text)]" title={isRtl ? "خلف" : "Send Backward"}>
              <ArrowDown className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} className="text-red-400 hover:text-red-300">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Selected shape settings */}
      {selected && selected.shapeType === "saudi_regions" && (
        <div className="space-y-2 border-t border-[var(--hv-border)] pt-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-xs" style={{color:'var(--hv-text)'}}>{isRtl ? "🗺️ مناطق المملكة" : "🗺️ Saudi Regions"}</label>
            <span className="text-[10px] text-slate-500">{isRtl ? "13 منطقة" : "13 regions"}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            {isRtl
              ? "انقر منطقة من القائمة (أو من الخريطة مباشرة) ثم لوّنها أو أضف لها صورة."
              : "Pick a region from the list (or click it on the map), then color it or add an image."}
          </p>

          {/* Region list */}
          <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
            {SAUDI_REGIONS.map((r) => {
              const st = (selected.regionStyles || {})[r.id] || {};
              const isActive = selectedRegion === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRegion && onSelectRegion(r.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition border ${
                    isActive ? "border-[var(--hv-primary)] bg-[rgba(79,70,229,0.08)]" : "bg-slate-50 hover:bg-slate-100 border-[var(--hv-border)]"
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded flex-shrink-0 border border-slate-300 overflow-hidden"
                    style={{ background: st.fill || "#cbd5e1" }}
                  >
                    {st.image && <img src={st.image} alt="" className="w-full h-full object-cover" />}
                  </span>
                  <span className="flex-1 text-start truncate" style={{color:'var(--hv-text)'}}>{isRtl ? r.nameAr : r.nameEn}</span>
                  {(st.fill || st.image) && (
                    <span className="text-[9px] text-emerald-500">●</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected region controls */}
          {selectedRegion && (() => {
            const region = SAUDI_REGIONS.find((r) => r.id === selectedRegion);
            const st = (selected.regionStyles || {})[selectedRegion] || {};
            return (
              <div className="bg-[var(--hv-surface-2)] border border-indigo-500/40 rounded-lg p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600">{isRtl ? region?.nameAr : region?.nameEn}</span>
                  {(st.fill || st.image) && (
                    <button onClick={() => clearRegionStyle(selectedRegion)}
                      className="text-[10px] text-red-500 hover:text-red-400">
                      {isRtl ? "✕ إعادة تعيين" : "✕ Reset"}
                    </button>
                  )}
                </div>

                {/* Color */}
                <StudioColorPicker
                  label={isRtl ? "لون المنطقة" : "Region color"}
                  value={st.fill || "#cbd5e1"}
                  onChange={(v) => setRegionStyle(selectedRegion, { fill: v })}
                />

                {/* Image */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">{isRtl ? "صورة داخل المنطقة" : "Image inside region"}</label>
                  {st.image ? (
                    <div className="flex items-center gap-2">
                      <img src={st.image} alt="" className="w-12 h-12 object-cover rounded border border-slate-200" />
                      <button onClick={() => setRegionStyle(selectedRegion, { image: null })}
                        className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">
                        {isRtl ? "إزالة الصورة" : "Remove image"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setUploadingRegion(selectedRegion); regionImgRef.current?.click(); }}
                      disabled={uploadingRegion === selectedRegion}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded bg-slate-50 hover:bg-indigo-600 text-[var(--hv-text)] hover:text-white border border-[var(--hv-border)] text-[11px] font-semibold transition disabled:opacity-50"
                    >
                      {uploadingRegion === selectedRegion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {isRtl ? "رفع صورة للمنطقة" : "Upload region image"}
                    </button>
                  )}
                  {st.image && (
                    <div className="mt-1.5">
                      <label className="text-[10px] text-slate-500 block">{isRtl ? "تكبير الصورة" : "Image zoom"}: {st.imageScale || 100}%</label>
                      <input type="range" min="100" max="300" value={st.imageScale || 100}
                        onChange={(e) => setRegionStyle(selectedRegion, { imageScale: parseInt(e.target.value) })}
                        className="w-full accent-indigo-500" />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Quick actions */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                // Auto-color all regions with a distinct palette
                const palette = ["#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#6366f1","#8b5cf6","#ec4899","#f43f5e","#10b981","#0ea5e9","#a855f7"];
                const next = {};
                SAUDI_REGIONS.forEach((r, i) => {
                  next[r.id] = { ...((selected.regionStyles || {})[r.id] || {}), fill: palette[i % palette.length] };
                });
                onUpdate(selected.id, { regionStyles: next });
              }}
              className="flex-1 py-1.5 rounded bg-slate-50 hover:bg-indigo-600 hover:text-white border border-[var(--hv-border)] text-[10px] text-[var(--hv-text)] transition"
            >
              {isRtl ? "🎨 تلوين تلقائي" : "🎨 Auto-color"}
            </button>
            <button
              onClick={() => onUpdate(selected.id, { regionStyles: {} })}
              className="flex-1 py-1.5 rounded bg-slate-50 hover:bg-red-600 hover:text-white border border-[var(--hv-border)] text-[10px] text-[var(--hv-text)] transition"
            >
              {isRtl ? "↺ مسح الكل" : "↺ Clear all"}
            </button>
          </div>

          {/* Hidden region image input */}
          <input
            ref={regionImgRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={async (e) => {
              let file = e.target.files[0];
              const regionId = uploadingRegion;
              if (!file || !regionId) { setUploadingRegion(null); return; }
              try {
                if (isHeic(file)) file = await normalizeImageFile(file);
                const { file_url } = await uploadFile({ file });
                setRegionStyle(regionId, { image: file_url });
              } catch (err) {
                alert((isRtl ? "تعذّر رفع الصورة: " : "Upload failed: ") + (err?.message || err));
              } finally {
                setUploadingRegion(null);
                e.target.value = "";
              }
            }}
          />
        </div>
      )}

      {selected && (
        <div className="space-y-3 border-t border-[var(--hv-border)] pt-3">
          {/* Fill: Solid / Gradient */}
          <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded-lg p-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold" style={{color:'var(--hv-text)'}}>{isRtl ? "نوع التعبئة" : "Fill Type"}</label>
              <div className="flex gap-1">
                <button
                  onClick={() => update("fillMode", "solid")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${(!selected.fillMode || selected.fillMode === "solid") ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >{isRtl ? "لون" : "Solid"}</button>
                <button
                  onClick={() => update("fillMode", "gradient")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${selected.fillMode === "gradient" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >{isRtl ? "تدرج" : "Gradient"}</button>
                <button
                  onClick={() => update("fillMode", "stripes")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${selected.fillMode === "stripes" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >{isRtl ? "خطوط" : "Stripes"}</button>
              </div>
            </div>

            {(!selected.fillMode || selected.fillMode === "solid") && (
              <StudioColorPicker label={isRtl ? "لون التعبئة" : "Fill Color"} value={selected.fillColor} onChange={(v) => update("fillColor", v)} />
            )}

            {/* ── Mockup-specific color controls ───────────────────────── */}
            {["phone_mockup","tablet_mockup","laptop_mockup","browser_window","monitor_mockup","tv_mockup","watch_mockup"].includes(selected.shapeType) && (
              <div className="border border-indigo-200 rounded-lg p-2.5 space-y-2 bg-indigo-50">
                <p className="text-indigo-600 font-semibold text-[11px]">
                  {isRtl ? "🎨 لون جسم الجهاز (الإطار الخارجي)" : "🎨 Device Body Color"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    { c: "#1e293b", n: "أسود" }, { c: "#0f172a", n: "أسود غامق" },
                    { c: "#475569", n: "رمادي" }, { c: "#94a3b8", n: "فضي" },
                    { c: "#cbd5e1", n: "فضي فاتح" }, { c: "#fbbf24", n: "ذهبي" },
                    { c: "#f97316", n: "نحاسي" }, { c: "#dc2626", n: "أحمر" },
                    { c: "#2563eb", n: "أزرق" }, { c: "#7c3aed", n: "بنفسجي" },
                    { c: "#16a34a", n: "أخضر" }, { c: "#ec4899", n: "وردي" },
                  ].map(({ c }) => (
                    <button
                      key={c}
                      onClick={() => update("bezelColor", c)}
                      style={{ background: c }}
                      className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition ${selected.bezelColor === c ? "border-[var(--hv-primary)]" : "border-slate-300"}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selected.bezelColor || "#1e293b"}
                    onInput={(e) => update("bezelColor", e.target.value)}
                    className="w-8 h-7 rounded border border-slate-200 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={selected.bezelColor || "#1e293b"}
                    onChange={(e) => update("bezelColor", e.target.value)}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-[var(--hv-text)] font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {selected.shapeType === "watch_mockup" && (
              <p className="text-[10px] text-slate-500">
                {isRtl ? "💡 لون السوار يُتحكّم به من \"لون التعبئة\" أعلاه" : "💡 Band color is controlled by Fill Color above"}
              </p>
            )}

            {selected.shapeType === "car_side" && (
              <p className="text-[10px] text-slate-500">
                {isRtl ? "💡 لون السيارة يُتحكّم به من \"لون التعبئة\" أعلاه" : "💡 Car body color is controlled by Fill Color above"}
              </p>
            )}

            {selected.shapeType === "tshirt_mockup" && (
              <p className="text-[10px] text-slate-500">
                {isRtl ? "💡 لون التيشيرت من \"لون التعبئة\". ضع تصميمك على الصدر عبر \"تعبئة بصورة\"" : "💡 Shirt color uses Fill Color. Upload your design via Image Fill (chest area)"}
              </p>
            )}

            {selected.fillMode === "gradient" && (
              <>
                <StudioColorPicker label={isRtl ? "اللون الأول" : "Color 1"} value={selected.gradientColor1 || "#8b5cf6"} onChange={(v) => update("gradientColor1", v)} />
                <StudioColorPicker label={isRtl ? "اللون الثاني" : "Color 2"} value={selected.gradientColor2 || "#ec4899"} onChange={(v) => update("gradientColor2", v)} />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-500">{isRtl ? "زاوية التدرج" : "Gradient Angle"}</label>
                    <span className="text-indigo-600 font-bold">{selected.gradientAngle ?? 135}°</span>
                  </div>
                  <input type="range" min="0" max="360" value={selected.gradientAngle ?? 135}
                    onChange={(e) => update("gradientAngle", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  <div className="flex gap-1 mt-1">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map(v => (
                      <button key={v} onClick={() => update("gradientAngle", v)}
                        className={`flex-1 py-1 rounded text-[9px] transition ${(selected.gradientAngle ?? 135) === v ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
                        {v}°
                      </button>
                    ))}
                  </div>
                </div>
                {/* Gradient preview */}
                <div className="w-full h-6 rounded" style={{ background: `linear-gradient(${selected.gradientAngle ?? 135}deg, ${selected.gradientColor1 || "#8b5cf6"}, ${selected.gradientColor2 || "#ec4899"})` }} />
              </>
            )}

            {selected.fillMode === "stripes" && (() => {
              const sw = selected.stripeWidth ?? 10;
              const sa = selected.stripeAngle ?? 45;
              const sc = selected.stripeColor || "#ffffff";
              const sbg = selected.stripeBg || "#8b5cf6";
              const previewBg = `repeating-linear-gradient(${sa}deg, ${sc} 0px, ${sc} ${sw}px, ${sbg} ${sw}px, ${sbg} ${sw * 2}px)`;
              return (
                <>
                  <StudioColorPicker label={isRtl ? "لون الخط" : "Stripe Color"} value={sc} onChange={(v) => update("stripeColor", v)} />
                  <StudioColorPicker label={isRtl ? "لون الخلفية" : "Background Color"} value={sbg} onChange={(v) => update("stripeBg", v)} />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-500">{isRtl ? "عرض الخط" : "Stripe Width"}</label>
                      <span className="text-indigo-600 font-bold">{sw}px</span>
                    </div>
                    <input type="range" min="2" max="40" step="1" value={sw}
                      onChange={(e) => update("stripeWidth", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                    <div className="flex gap-1 mt-1">
                      {[4, 8, 12, 16, 24, 32].map(v => (
                        <button key={v} onClick={() => update("stripeWidth", v)}
                          className={`flex-1 py-1 rounded text-[10px] transition ${sw === v ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-500">{isRtl ? "زاوية الخطوط" : "Stripe Angle"}</label>
                      <span className="text-indigo-600 font-bold">{sa}°</span>
                    </div>
                    <input type="range" min="0" max="180" step="5" value={sa}
                      onChange={(e) => update("stripeAngle", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                    <div className="flex gap-1 mt-1">
                      {[0, 30, 45, 60, 90, 120, 135, 150].map(v => (
                        <button key={v} onClick={() => update("stripeAngle", v)}
                          className={`flex-1 py-1 rounded text-[9px] transition ${sa === v ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
                          {v}°
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Stripes preview */}
                  <div className="w-full h-8 rounded border border-slate-200" style={{ background: previewBg }} />
                </>
              );
            })()}
          </div>

          <StudioColorPicker label={isRtl ? "لون الحدود" : "Border Color"} value={selected.borderColor} onChange={(v) => update("borderColor", v)} />

          {/* Blur effect */}
          <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded-lg p-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold" style={{color:'var(--hv-text)'}}>{isRtl ? "ضبابية" : "Blur"}</label>
              <span className="text-indigo-600 font-bold">{selected.blur || 0}px</span>
            </div>
            <input type="range" min="0" max="40" step="0.5" value={selected.blur || 0}
              onChange={(e) => update("blur", parseFloat(e.target.value))} className="w-full accent-indigo-500" />
            <div className="flex gap-1">
              {[0, 3, 6, 10, 15, 20].map(v => (
                <button key={v} onClick={() => update("blur", v)}
                  className={`flex-1 py-1 rounded text-[10px] transition ${(selected.blur || 0) === v ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Drop shadow + Inner shadow */}
          <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded p-2 space-y-2">
            <label className="text-xs font-semibold" style={{color:'var(--hv-text)'}}>{isRtl ? "🌑 الظلال" : "🌑 Shadows"}</label>

            {/* Outer shadow */}
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{color:'var(--hv-text-soft)'}}>{isRtl ? "ظل خارجي" : "Drop shadow"}</span>
              <button
                onClick={() => update("outerShadow", { ...(selected.outerShadow || { x: 0, y: 6, blur: 12, spread: 0, color: "rgba(0,0,0,0.4)" }), enabled: !selected.outerShadow?.enabled })}
                className={`text-[10px] px-2 py-0.5 rounded transition ${selected.outerShadow?.enabled ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {selected.outerShadow?.enabled ? (isRtl ? "On" : "On") : (isRtl ? "Off" : "Off")}
              </button>
            </div>
            {selected.outerShadow?.enabled && (
              <div className="grid grid-cols-2 gap-2 pl-1">
                <div>
                  <label className="text-[10px] text-slate-500 block">X: {selected.outerShadow.x ?? 0}</label>
                  <input type="range" min="-30" max="30" value={selected.outerShadow.x ?? 0}
                    onChange={(e) => update("outerShadow", { ...selected.outerShadow, x: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Y: {selected.outerShadow.y ?? 6}</label>
                  <input type="range" min="-30" max="30" value={selected.outerShadow.y ?? 6}
                    onChange={(e) => update("outerShadow", { ...selected.outerShadow, y: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">{isRtl ? "تمويه" : "Blur"}: {selected.outerShadow.blur ?? 12}</label>
                  <input type="range" min="0" max="50" value={selected.outerShadow.blur ?? 12}
                    onChange={(e) => update("outerShadow", { ...selected.outerShadow, blur: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">{isRtl ? "اللون" : "Color"}</label>
                  <input type="color" value={(selected.outerShadow.color || "#000000").startsWith("rgba") ? "#000000" : selected.outerShadow.color}
                    onChange={(e) => update("outerShadow", { ...selected.outerShadow, color: e.target.value })} className="w-full h-7 rounded cursor-pointer" />
                </div>
              </div>
            )}

            {/* Inner shadow */}
            <div className="flex items-center justify-between pt-1 border-t border-[var(--hv-border)]">
              <span className="text-[11px]" style={{color:'var(--hv-text-soft)'}}>{isRtl ? "ظل داخلي" : "Inner shadow"}</span>
              <button
                onClick={() => update("innerShadow", { ...(selected.innerShadow || { x: 0, y: 4, blur: 8, spread: 0, color: "rgba(0,0,0,0.5)" }), enabled: !selected.innerShadow?.enabled })}
                className={`text-[10px] px-2 py-0.5 rounded transition ${selected.innerShadow?.enabled ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {selected.innerShadow?.enabled ? (isRtl ? "On" : "On") : (isRtl ? "Off" : "Off")}
              </button>
            </div>
            {selected.innerShadow?.enabled && (
              <div className="grid grid-cols-2 gap-2 pl-1">
                <div>
                  <label className="text-[10px] text-slate-500 block">X: {selected.innerShadow.x ?? 0}</label>
                  <input type="range" min="-30" max="30" value={selected.innerShadow.x ?? 0}
                    onChange={(e) => update("innerShadow", { ...selected.innerShadow, x: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Y: {selected.innerShadow.y ?? 4}</label>
                  <input type="range" min="-30" max="30" value={selected.innerShadow.y ?? 4}
                    onChange={(e) => update("innerShadow", { ...selected.innerShadow, y: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">{isRtl ? "تمويه" : "Blur"}: {selected.innerShadow.blur ?? 8}</label>
                  <input type="range" min="0" max="50" value={selected.innerShadow.blur ?? 8}
                    onChange={(e) => update("innerShadow", { ...selected.innerShadow, blur: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">{isRtl ? "اللون" : "Color"}</label>
                  <input type="color" value={(selected.innerShadow.color || "#000000").startsWith("rgba") ? "#000000" : selected.innerShadow.color}
                    onChange={(e) => update("innerShadow", { ...selected.innerShadow, color: e.target.value })} className="w-full h-7 rounded cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          {/* Border radius - all shapes except circle/ellipse/line */}
          {!["circle", "ellipse", "line"].includes(selected.shapeType) && (
            <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold" style={{color:'var(--hv-text)'}}>{isRtl ? "⬛ تدوير الحواف" : "⬛ Corner Radius"}</label>
                <span className="text-indigo-600 font-bold">{selected.borderRadius || 0}px</span>
              </div>
              <input type="range" min="0" max="200" step="1" value={selected.borderRadius || 0}
                onChange={(e) => update("borderRadius", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              <div className="flex gap-1 mt-1">
                {[0, 8, 16, 32, 99, 200].map(v => (
                  <button key={v} onClick={() => update("borderRadius", v)}
                    className={`flex-1 py-1 rounded text-[10px] transition ${selected.borderRadius === v ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
                    {v === 0 ? "■" : v === 200 ? "●" : v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-500 block mb-1">{isRtl ? "سماكة الحدود" : "Border Width"}</label>
              <input type="number" min="0" value={selected.borderWidth || 0}
                onChange={(e) => update("borderWidth", parseInt(e.target.value))}
                className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-500 block mb-1">{isRtl ? "العرض%" : "Width%"}</label>
              <input type="number" value={Math.round(selected.width)} onChange={(e) => update("width", parseFloat(e.target.value))}
                className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[var(--hv-text)]" />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">{isRtl ? "الارتفاع%" : "Height%"}</label>
              <input type="number" value={Math.round(selected.height)} onChange={(e) => update("height", parseFloat(e.target.value))}
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

          {/* Nudge arrows */}
          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "تحريك دقيق" : "Nudge"}</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: "↑", key: "y", delta: -1 },
                { label: "↓", key: "y", delta: 1 },
                { label: "←", key: "x", delta: -1 },
                { label: "→", key: "x", delta: 1 },
              ].map(({ label, key, delta }) => (
                <button key={label} onClick={() => update(key, (selected[key] || 0) + delta)}
                  className="py-1.5 bg-slate-100 hover:bg-slate-200 border border-[var(--hv-border)] rounded text-[var(--hv-text)]">{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "شفافية" : "Opacity"}: {Math.round((selected.opacity ?? 1) * 100)}%</label>
            <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1}
              onChange={(e) => update("opacity", parseFloat(e.target.value))}
              className="w-full accent-indigo-500" />
          </div>

          {/* ── Rotation (with slider + presets + manual input) ── */}
          <div className="border border-[var(--hv-border)] rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[11px]" style={{color:'var(--hv-text)'}}>
                🔄 {isRtl ? "دوران الشكل" : "Rotate Shape"}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={selected.rotation || 0}
                  onChange={(e) => update("rotation", parseInt(e.target.value) || 0)}
                  className="w-14 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-[var(--hv-text)] text-center"
                />
                <span className="text-slate-500 text-xs">°</span>
                {(selected.rotation || 0) !== 0 && (
                  <button
                    onClick={() => update("rotation", 0)}
                    className="text-[10px] text-slate-500 hover:text-[var(--hv-text)] bg-slate-100 px-1.5 py-0.5 rounded transition"
                    title={isRtl ? "إعادة لـ 0°" : "Reset to 0°"}
                  >↺</button>
                )}
              </div>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={selected.rotation || 0}
              onChange={(e) => update("rotation", parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="grid grid-cols-8 gap-0.5">
              {[-90, -45, 0, 30, 45, 90, 135, 180].map(deg => (
                <button
                  key={deg}
                  onClick={() => update("rotation", deg)}
                  className={`py-1 rounded text-[9px] font-semibold transition ${
                    (selected.rotation || 0) === deg
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  title={`${deg}°`}
                >
                  {deg}°
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => update("rotation", ((selected.rotation || 0) - 15))}
                className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] transition"
              >
                ↶ -15°
              </button>
              <button
                onClick={() => update("rotation", ((selected.rotation || 0) + 15))}
                className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] transition"
              >
                +15° ↷
              </button>
            </div>
          </div>

          {/* ── Text inside shape (rotates with the shape) ────────────── */}
          <div className="border border-indigo-200 rounded-lg p-2.5 space-y-2 bg-indigo-50">
            <div className="flex items-center justify-between">
              <label className="text-indigo-600 font-semibold text-[11px]">
                {isRtl ? "📝 نص داخل الشكل" : "📝 Text inside shape"}
              </label>
              {selected.text && (
                <button
                  onClick={() => update("text", "")}
                  className="text-[10px] text-slate-500 hover:text-red-500 bg-white border border-[var(--hv-border)] px-2 py-0.5 rounded transition"
                >
                  {isRtl ? "مسح" : "Clear"}
                </button>
              )}
            </div>
            <textarea
              value={selected.text || ""}
              onChange={(e) => update("text", e.target.value)}
              placeholder={isRtl ? "اكتب النص هنا..." : "Type text here..."}
              rows={2}
              className="w-full bg-white border border-[var(--hv-border)] rounded px-2 py-1.5 text-xs text-[var(--hv-text)] placeholder-slate-400 resize-none outline-none focus:border-indigo-500"
              style={{ fontFamily: selected.textFontFamily || "Tajawal" }}
            />
            {selected.text && (
              <>
                {/* Font family — full width */}
                <div>
                  <label className="text-slate-500 text-[10px] block mb-0.5">{isRtl ? "الخط" : "Font"}</label>
                  <select
                    value={selected.textFontFamily || "Tajawal"}
                    onChange={(e) => update("textFontFamily", e.target.value)}
                    className="w-full bg-white border border-[var(--hv-border)] rounded px-2 py-1 text-[11px] text-[var(--hv-text)]"
                  >
                    {["Tajawal","Cairo","Almarai","Readex Pro","El Messiri","Amiri","Reem Kufi","Lalezar","Aref Ruqaa","Marhey","Aladin","Caveat","Pacifico","Dancing Script","Permanent Marker","Satisfy","Indie Flower","Patrick Hand","Arial","Georgia"].map(f => (
                      <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                  </select>
                </div>

                {/* Size + color — single compact row */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-slate-500 text-[10px] block mb-0.5">{isRtl ? "حجم الخط" : "Size"}</label>
                    <input
                      type="number"
                      value={selected.textFontSize || 24}
                      onChange={(e) => update("textFontSize", parseInt(e.target.value) || 24)}
                      className="w-full bg-white border border-[var(--hv-border)] rounded px-2 py-1 text-xs text-[var(--hv-text)]"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <label className="text-slate-500 text-[10px] block mb-0.5">{isRtl ? "اللون" : "Color"}</label>
                    <input
                      type="color"
                      value={selected.textColor || "#ffffff"}
                      onInput={(e) => update("textColor", e.target.value)}
                      className="w-9 h-7 rounded cursor-pointer border border-slate-200 bg-transparent"
                      title={selected.textColor || "#ffffff"}
                    />
                  </div>
                </div>

                {/* Quick color swatches */}
                <div className="flex flex-wrap gap-1">
                  {["#ffffff","#000000","#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#fbbf24","#94a3b8"].map(c => (
                    <button
                      key={c}
                      onClick={() => update("textColor", c)}
                      style={{ background: c, border: c === "#ffffff" ? "1px solid #475569" : "none" }}
                      className={`w-5 h-5 rounded-full hover:scale-110 transition ${selected.textColor === c ? "ring-2 ring-indigo-400" : ""}`}
                      title={c}
                    />
                  ))}
                </div>

                {/* Style buttons */}
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => update("textBold", !selected.textBold)}
                    className={`py-1 rounded text-[11px] font-bold transition ${selected.textBold ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >B</button>
                  <button
                    onClick={() => update("textItalic", !selected.textItalic)}
                    className={`py-1 rounded text-[11px] italic transition ${selected.textItalic ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >I</button>
                  <button
                    onClick={() => update("textShadow", !selected.textShadow)}
                    className={`py-1 rounded text-[10px] transition ${selected.textShadow ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >{isRtl ? "ظل" : "Shadow"}</button>
                </div>

                {/* Alignment — combined into a single 3x2 grid */}
                <div>
                  <label className="text-slate-500 text-[10px] block mb-0.5">{isRtl ? "محاذاة أفقية" : "H Align"}</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { v: "left",   labelAr: "يسار",  labelEn: "Left"   },
                      { v: "center", labelAr: "وسط",   labelEn: "Center" },
                      { v: "right",  labelAr: "يمين",  labelEn: "Right"  },
                    ].map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => update("textAlign", opt.v)}
                        className={`py-1 rounded text-[10px] transition ${(selected.textAlign || "center") === opt.v ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >{isRtl ? opt.labelAr : opt.labelEn}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 text-[10px] block mb-0.5">{isRtl ? "محاذاة عمودية" : "V Align"}</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { v: "top",    labelAr: "أعلى",  labelEn: "Top"    },
                      { v: "middle", labelAr: "وسط",   labelEn: "Middle" },
                      { v: "bottom", labelAr: "أسفل",  labelEn: "Bottom" },
                    ].map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => update("textVAlign", opt.v)}
                        className={`py-1 rounded text-[10px] transition ${(selected.textVAlign || "middle") === opt.v ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >{isRtl ? opt.labelAr : opt.labelEn}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 text-[10px] block mb-0.5">
                    {isRtl ? `الحشو الداخلي: ${selected.textPadding ?? 8}%` : `Inner Padding: ${selected.textPadding ?? 8}%`}
                  </label>
                  <input type="range" min="0" max="30" step="0.5" value={selected.textPadding ?? 8}
                    onChange={(e) => update("textPadding", parseFloat(e.target.value))}
                    className="w-full accent-indigo-500" />
                </div>
              </>
            )}
          </div>

          {/* ── 3D / Extrude effect ──────────────────────────────────── */}
          {(() => {
            const td = selected.threeD || {};
            const updateTd = (patch) => update("threeD", { ...td, ...patch });
            const PRESETS_3D = [
              { name: "Off",       depth: 0,  angle: 135, color: "#1e1b4b" },
              { name: "Subtle",    depth: 3,  angle: 135, color: "#1e1b4b" },
              { name: "Medium",    depth: 6,  angle: 135, color: "#312e81" },
              { name: "Heavy",     depth: 10, angle: 135, color: "#1e1b4b" },
              { name: "Extreme",   depth: 12, angle: 135, color: "#0f172a" },
            ];
            return (
              <div className="border border-fuchsia-200 rounded-lg p-2.5 space-y-2 bg-fuchsia-50">
                <div className="flex items-center justify-between">
                  <span className="text-fuchsia-600 font-semibold text-[11px]">
                    {isRtl ? "🧊 تأثير ثلاثي الأبعاد" : "🧊 3D Extrude Effect"}
                  </span>
                  <button
                    onClick={() => updateTd({ enabled: !td.enabled, depth: td.depth || 10, angle: td.angle ?? 135, color: td.color || "#312e81" })}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${td.enabled ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {td.enabled ? (isRtl ? "مفعّل ✓" : "ON ✓") : (isRtl ? "معطّل" : "OFF")}
                  </button>
                </div>

                {/* Quick presets */}
                <div className="grid grid-cols-5 gap-1">
                  {PRESETS_3D.map(p => (
                    <button
                      key={p.name}
                      onClick={() => updateTd({ enabled: p.depth > 0, depth: p.depth, angle: p.angle, color: p.color })}
                      className={`py-1 rounded text-[9px] font-semibold transition ${td.depth === p.depth && (p.depth === 0 ? !td.enabled : td.enabled) ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {td.enabled && (
                  <>
                    <div>
                      <label className="text-slate-500 text-[10px] block mb-0.5">
                        {isRtl ? `العمق: ${td.depth ?? 10}px` : `Depth: ${td.depth ?? 10}px`}
                      </label>
                      <input
                        type="range" min="0" max="15" step="1"
                        value={Math.min(15, td.depth ?? 10)}
                        onChange={(e) => updateTd({ depth: parseInt(e.target.value) })}
                        className="w-full accent-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 text-[10px] block mb-0.5">
                        {isRtl ? `زاوية الإضاءة: ${td.angle ?? 135}°` : `Light angle: ${td.angle ?? 135}°`}
                      </label>
                      <input
                        type="range" min="0" max="360" step="5"
                        value={td.angle ?? 135}
                        onChange={(e) => updateTd({ angle: parseInt(e.target.value) })}
                        className="w-full accent-fuchsia-500"
                      />
                      <div className="flex gap-0.5 mt-1">
                        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                          <button
                            key={a}
                            onClick={() => updateTd({ angle: a })}
                            className={`flex-1 py-0.5 rounded text-[8px] transition ${(td.angle ?? 135) === a ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                          >{a}°</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-500 text-[10px] block mb-0.5">{isRtl ? "لون العمق" : "Depth Color"}</label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="color"
                          value={td.color || "#312e81"}
                          onInput={(e) => updateTd({ color: e.target.value })}
                          className="w-8 h-7 rounded cursor-pointer border border-slate-200 bg-transparent"
                        />
                        <div className="flex flex-wrap gap-1 flex-1">
                          {["#1e1b4b","#312e81","#0f172a","#1e293b","#7f1d1d","#7c2d12","#365314","#0c4a6e"].map(c => (
                            <button
                              key={c}
                              onClick={() => updateTd({ color: c })}
                              style={{ background: c }}
                              className={`w-5 h-5 rounded-full border-2 transition ${td.color === c ? "border-[var(--hv-primary)]" : "border-slate-300"}`}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {isRtl ? "💡 يعمل على كل الأشكال بما فيها رسماتك اليدوية" : "💡 Works on any shape — including your freehand drawings"}
                    </p>
                  </>
                )}
              </div>
            );
          })()}

          {/* ── أشكال مرنة / Flex Transform ── */}
          <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded-lg p-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-indigo-600 font-bold text-xs">
                {isRtl ? "✦ أشكال مرنة" : "✦ Flex Transform"}
              </label>
              <button
                onClick={() => { update("skewX", 0); update("skewY", 0); update("rotateX", 0); update("rotateY", 0); update("perspective", 800); }}
                className="text-[10px] text-slate-500 hover:text-[var(--hv-text)] bg-slate-100 px-2 py-0.5 rounded transition"
              >{isRtl ? "إعادة" : "Reset"}</button>
            </div>

            {/* Skew X */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-500 text-[11px]">{isRtl ? "ميل أفقي" : "Skew X"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.skewX || 0}°</span>
              </div>
              <input type="range" min="-60" max="60" step="1" value={selected.skewX || 0}
                onChange={(e) => update("skewX", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              <div className="flex gap-1 mt-1">
                {[-45, -30, -15, 0, 15, 30, 45].map(v => (
                  <button key={v} onClick={() => update("skewX", v)}
                    className={`flex-1 py-0.5 rounded text-[9px] transition ${(selected.skewX || 0) === v ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Skew Y */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-500 text-[11px]">{isRtl ? "ميل عمودي" : "Skew Y"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.skewY || 0}°</span>
              </div>
              <input type="range" min="-60" max="60" step="1" value={selected.skewY || 0}
                onChange={(e) => update("skewY", parseInt(e.target.value))} className="w-full accent-indigo-500" />
            </div>

            {/* 3D Rotate X */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-500 text-[11px]">{isRtl ? "3D أعلى/أسفل" : "3D Tilt X"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.rotateX || 0}°</span>
              </div>
              <input type="range" min="-80" max="80" step="1" value={selected.rotateX || 0}
                onChange={(e) => update("rotateX", parseInt(e.target.value))} className="w-full accent-purple-500" />
            </div>

            {/* 3D Rotate Y */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-500 text-[11px]">{isRtl ? "3D يمين/يسار" : "3D Tilt Y"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.rotateY || 0}°</span>
              </div>
              <input type="range" min="-80" max="80" step="1" value={selected.rotateY || 0}
                onChange={(e) => update("rotateY", parseInt(e.target.value))} className="w-full accent-purple-500" />
              <div className="flex gap-1 mt-1">
                {[-60, -40, -20, 0, 20, 40, 60].map(v => (
                  <button key={v} onClick={() => update("rotateY", v)}
                    className={`flex-1 py-0.5 rounded text-[9px] transition ${(selected.rotateY || 0) === v ? "bg-purple-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Perspective depth */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-500 text-[11px]">{isRtl ? "عمق المنظور" : "Perspective"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.perspective ?? 800}px</span>
              </div>
              <input type="range" min="100" max="1500" step="50" value={selected.perspective ?? 800}
                onChange={(e) => update("perspective", parseInt(e.target.value))} className="w-full accent-indigo-400" />
              <div className="flex gap-1 mt-1">
                {[200, 400, 600, 800, 1200].map(v => (
                  <button key={v} onClick={() => update("perspective", v)}
                    className={`flex-1 py-0.5 rounded text-[9px] transition ${(selected.perspective ?? 800) === v ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <label className="text-slate-500 text-[10px] block mb-1">{isRtl ? "قوالب سريعة" : "Quick Presets"}</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: isRtl ? "مائل" : "Slant", skewX: -20, skewY: 0, rotateX: 0, rotateY: 0 },
                  { label: isRtl ? "متوازي" : "Para", skewX: -25, skewY: 0, rotateX: 0, rotateY: 0 },
                  { label: isRtl ? "3D يمين" : "3D →", skewX: 0, skewY: 0, rotateX: 0, rotateY: 40, perspective: 500 },
                  { label: isRtl ? "3D يسار" : "3D ←", skewX: 0, skewY: 0, rotateX: 0, rotateY: -40, perspective: 500 },
                  { label: isRtl ? "3D فوق" : "3D ↑", skewX: 0, skewY: 0, rotateX: -35, rotateY: 0, perspective: 500 },
                  { label: isRtl ? "مستوي" : "Flat", skewX: 0, skewY: 0, rotateX: 0, rotateY: 0, perspective: 800 },
                ].map(p => (
                  <button key={p.label}
                    onClick={() => { update("skewX", p.skewX); update("skewY", p.skewY); update("rotateX", p.rotateX); update("rotateY", p.rotateY); if (p.perspective) update("perspective", p.perspective); }}
                    className="py-1 rounded text-[10px] bg-slate-100 hover:bg-indigo-600 text-slate-600 hover:text-white transition">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => onDuplicate(selected.id)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-100 hover:bg-indigo-600 text-slate-600 hover:text-white border border-[var(--hv-border)] transition">
            <Copy className="w-3.5 h-3.5" />
            {isRtl ? "نسخ الشكل (Ctrl+D)" : "Duplicate (Ctrl+D)"}
          </button>

          {/* Image Fill inside shape */}
          {selected.shapeType !== "arrow" && selected.shapeType !== "line" && (
            <div className="bg-[var(--hv-surface-2)] border border-[var(--hv-border)] rounded-lg p-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-xs" style={{color:'var(--hv-text)'}}>
                  {isRtl ? "🖼️ صورة داخل الشكل" : "🖼️ Image Fill"}
                </label>
                {selected.fillImage && (
                  <button onClick={() => { update("fillImage", null); update("imageOffsetX", 0); update("imageOffsetY", 0); update("imageScale", 100); }}
                    className="text-red-500 hover:text-red-400 text-xs flex items-center gap-0.5">
                    <X className="w-3 h-3" /> {isRtl ? "إزالة" : "Remove"}
                  </button>
                )}
              </div>

              {selected.fillImage ? (
                <img src={selected.fillImage} alt="" className="w-full h-16 object-cover rounded" />
              ) : (
                <button
                  onClick={() => fillImgRef.current?.click()}
                  disabled={uploadingFill}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {uploadingFill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingFill ? (isRtl ? "جاري الرفع..." : "Uploading...") : (isRtl ? "رفع صورة" : "Upload Image")}
                </button>
              )}
              <input
                ref={fillImgRef} type="file" accept="image/*,.heic,.heif" className="hidden"
                onChange={async (e) => {
                  let file = e.target.files[0];
                  if (!file || !selected) return;
                  setUploadingFill(true);
                  try {
                    if (isHeic(file)) file = await normalizeImageFile(file);
                    const { file_url } = await uploadFile({ file });
                    update("fillImage", file_url);
                  } catch (err) {
                    alert((isRtl ? "تعذّر رفع الصورة: " : "Image upload failed: ") + (err?.message || err));
                  } finally {
                    setUploadingFill(false);
                    e.target.value = "";
                  }
                }}
              />

              {selected.fillImage && (
                <>
                  <div>
                    <div className="flex justify-between text-slate-500 text-[10px] mb-0.5">
                      <span>{isRtl ? "حجم الصورة" : "Scale"}</span>
                      <span>{selected.imageScale || 100}%</span>
                    </div>
                    <input type="range" min="20" max="300" step="5" value={selected.imageScale || 100}
                      onChange={(e) => update("imageScale", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 text-[10px] mb-0.5">
                      <span>{isRtl ? "إزاحة أفقية" : "Offset X"}</span>
                      <span>{selected.imageOffsetX || 0}</span>
                    </div>
                    <input type="range" min="-50" max="50" step="1" value={selected.imageOffsetX || 0}
                      onChange={(e) => update("imageOffsetX", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 text-[10px] mb-0.5">
                      <span>{isRtl ? "إزاحة عمودية" : "Offset Y"}</span>
                      <span>{selected.imageOffsetY || 0}</span>
                    </div>
                    <input type="range" min="-50" max="50" step="1" value={selected.imageOffsetY || 0}
                      onChange={(e) => update("imageOffsetY", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <button onClick={() => fillImgRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-[var(--hv-border)] text-xs text-slate-600 transition">
                    <Upload className="w-3 h-3" /> {isRtl ? "تغيير الصورة" : "Change Image"}
                  </button>
                </>
              )}
            </div>
          )}

          <FiltersPanel element={selected} onChange={(updated) => onUpdate(selected.id, updated)} language={language} />
          <BlendModesPanel element={selected} onChange={(updated) => onUpdate(selected.id, updated)} language={language} />
        </div>
      )}
    </div>
  );
}

function ShapeIcon({ type, size = 16 }) {
  const s = size;
  if (type === "rect") return <div style={{ width: s, height: s * 0.75, border: "2px solid currentColor", borderRadius: 2 }} />;
  if (type === "rounded") return <div style={{ width: s, height: s * 0.75, border: "2px solid currentColor", borderRadius: s / 3 }} />;
  if (type === "circle") return <div style={{ width: s, height: s, border: "2px solid currentColor", borderRadius: "50%" }} />;
  if (type === "ellipse") return <div style={{ width: s * 1.3, height: s * 0.7, border: "2px solid currentColor", borderRadius: "50%" }} />;
  if (type === "line") return <div style={{ width: s, height: 2, backgroundColor: "currentColor" }} />;
  if (type === "triangle") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 15,15 1,15" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "diamond") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "star") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 10,6 15,6 11,10 13,15 8,11 3,15 5,10 1,6 6,6" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "pentagon") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 14,5 11,13 5,13 2,5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "hexagon") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="4,2 12,2 15,8 12,14 4,14 1,8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "arrow") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M2,8 L12,8 M10,6 L12,8 L10,10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
  if (type === "blob") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M50,5 C70,8 88,22 88,45 C92,65 78,85 60,90 C40,95 18,88 12,68 C8,48 18,28 32,15 C40,8 45,5 50,5 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "wave_shape") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M0,15 Q25,0 50,15 T100,15 L100,85 Q75,100 50,85 T0,85 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "cloud") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M22,72 C5,72 0,52 18,46 C15,28 38,22 42,40 C48,18 75,22 70,42 C88,40 95,62 80,72 L22,72 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "heart") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M50,90 C20,68 5,42 25,22 C40,12 50,28 50,38 C50,28 60,12 75,22 C95,42 80,68 50,90 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "splash") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,5 60,22 78,15 72,33 90,32 80,48 95,55 78,60 88,76 72,74 75,92 58,82 50,95 42,82 25,92 28,74 12,76 22,60 5,55 20,48 10,32 28,33 22,15 40,22" fill="none" stroke="currentColor" strokeWidth="5"/></svg>
  );
  if (type === "petal") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M50,5 Q88,40 50,95 Q12,40 50,5 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "flower") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M50,12 C62,8 72,22 65,35 C80,30 88,48 75,55 C82,68 65,78 55,68 C58,82 38,82 42,68 C32,78 18,68 25,55 C12,48 20,30 35,35 C28,22 38,8 50,12 Z" fill="none" stroke="currentColor" strokeWidth="5"/></svg>
  );
  if (type === "arch_top") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M5,95 L5,42 Q5,5 50,5 Q95,5 95,42 L95,95 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "tag") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M5,30 L25,5 L95,5 L95,95 L25,95 L5,70 Z" fill="none" stroke="currentColor" strokeWidth="6"/><circle cx="20" cy="50" r="6" fill="none" stroke="currentColor" strokeWidth="3"/></svg>
  );
  if (type === "shield") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M50,5 L90,15 L90,55 Q90,85 50,95 Q10,85 10,55 L10,15 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "ticket") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M5,5 L95,5 L95,40 Q88,50 95,60 L95,95 L5,95 L5,60 Q12,50 5,40 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "stadium") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M30,5 L70,5 Q95,5 95,50 Q95,95 70,95 L30,95 Q5,95 5,50 Q5,5 30,5 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "chevron_shape") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M5,5 L65,5 L95,50 L65,95 L5,95 L30,50 Z" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "burst") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="50,3 58,18 73,8 75,25 92,22 86,38 99,48 86,58 92,75 75,72 73,89 58,80 50,97 42,80 27,89 25,72 8,75 14,58 1,48 14,38 8,22 25,25 27,8 42,18" fill="none" stroke="currentColor" strokeWidth="4"/></svg>
  );
  if (type === "octagon") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="none" stroke="currentColor" strokeWidth="6"/></svg>
  );
  if (type === "sticky_note") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M5,5 L95,5 L95,80 L80,95 L5,95 Z" fill="none" stroke="currentColor" strokeWidth="6"/><path d="M95,80 L80,80 L80,95" fill="none" stroke="currentColor" strokeWidth="4"/></svg>
  );
  if (type === "speech_bubble") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M15,10 L85,10 Q95,10 95,25 L95,65 Q95,80 85,80 L40,80 L25,95 L28,80 L15,80 Q5,80 5,65 L5,25 Q5,10 15,10 Z" fill="none" stroke="currentColor" strokeWidth="5"/></svg>
  );
  if (type === "thought_bubble") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M30,15 C18,10 8,22 18,32 C5,38 8,55 22,55 C18,68 35,72 42,62 C50,72 70,70 70,58 C82,60 90,48 82,40 C92,30 80,18 70,25 C65,12 45,10 30,15 Z" fill="none" stroke="currentColor" strokeWidth="4"/><circle cx="32" cy="78" r="6" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="22" cy="92" r="3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
  );
  if (type === "torn_paper") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M5,15 L15,8 L25,16 L40,9 L55,17 L70,10 L82,18 L95,12 L95,85 L88,93 L75,86 L60,93 L48,85 L35,93 L20,86 L8,93 Z" fill="none" stroke="currentColor" strokeWidth="4"/></svg>
  );
  if (type === "index_card") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" rx="4" fill="none" stroke="currentColor" strokeWidth="5"/><line x1="5" y1="25" x2="95" y2="25" stroke="currentColor" strokeWidth="3"/><line x1="15" y1="45" x2="85" y2="45" stroke="currentColor" strokeWidth="2" opacity="0.6"/><line x1="15" y1="60" x2="85" y2="60" stroke="currentColor" strokeWidth="2" opacity="0.6"/><line x1="15" y1="75" x2="70" y2="75" stroke="currentColor" strokeWidth="2" opacity="0.6"/></svg>
  );
  if (type === "note_tape") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="10" y="15" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="5"/><polygon points="0,5 30,2 22,18 -2,12" fill="none" stroke="currentColor" strokeWidth="3"/><polygon points="100,5 70,2 78,18 102,12" fill="none" stroke="currentColor" strokeWidth="3"/></svg>
  );
  if (type === "note_pin") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="10" y="20" width="80" height="75" fill="none" stroke="currentColor" strokeWidth="5"/><circle cx="50" cy="15" r="7" fill="none" stroke="currentColor" strokeWidth="3"/><line x1="50" y1="22" x2="50" y2="30" stroke="currentColor" strokeWidth="3"/></svg>
  );
  if (type === "phone_mockup") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="28" y="5" width="44" height="90" rx="8" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="32" y="14" width="36" height="72" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5"/><rect x="42" y="7" width="16" height="3.5" rx="1.5" fill="currentColor"/></svg>
  );
  if (type === "tablet_mockup") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="12" y="14" width="76" height="72" rx="5" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="17" y="20" width="66" height="60" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5"/><circle cx="84" cy="50" r="1.2" fill="currentColor"/></svg>
  );
  if (type === "laptop_mockup") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="14" y="18" width="72" height="50" rx="3" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="18" y="22" width="64" height="42" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="M5,72 L95,72 L88,82 L12,82 Z" fill="none" stroke="currentColor" strokeWidth="3.5"/></svg>
  );
  if (type === "browser_window") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="6" y="18" width="88" height="68" rx="3" fill="none" stroke="currentColor" strokeWidth="4"/><line x1="6" y1="30" x2="94" y2="30" stroke="currentColor" strokeWidth="2"/><circle cx="13" cy="24" r="1.8" fill="currentColor"/><circle cx="20" cy="24" r="1.8" fill="currentColor"/><circle cx="27" cy="24" r="1.8" fill="currentColor"/></svg>
  );
  if (type === "monitor_mockup") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="8" y="14" width="84" height="56" rx="3" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="46" y="70" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M 30 84 L 70 84 L 75 92 L 25 92 Z" fill="none" stroke="currentColor" strokeWidth="3"/></svg>
  );
  if (type === "tv_mockup") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="6" y="14" width="88" height="62" rx="3" fill="none" stroke="currentColor" strokeWidth="4"/><line x1="40" y1="80" x2="60" y2="80" stroke="currentColor" strokeWidth="3"/><line x1="50" y1="76" x2="50" y2="84" stroke="currentColor" strokeWidth="3"/></svg>
  );
  if (type === "watch_mockup") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><rect x="42" y="8" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"/><rect x="32" y="28" width="36" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="42" y="72" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="72" cy="48" r="2" fill="currentColor"/></svg>
  );
  if (type === "car_side") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M 5 65 L 14 50 Q 22 38 40 36 L 60 36 Q 70 36 78 46 L 92 52 L 95 65 L 88 70 L 12 70 Z" fill="none" stroke="currentColor" strokeWidth="4"/><circle cx="28" cy="72" r="8" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="72" cy="72" r="8" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M 24 50 L 38 42 L 60 42 L 70 50" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
  );
  if (type === "tshirt_mockup") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M 25 18 L 38 12 Q 50 22 62 12 L 75 18 L 90 28 L 80 42 L 72 38 L 72 92 L 28 92 L 28 38 L 20 42 L 10 28 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/></svg>
  );
  if (type === "saudi_map") return (
    <svg width={s} height={s} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><path d={SAUDI_MAP_PATH} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
  );
  if (type === "saudi_regions") return (
    <svg width={s} height={s} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      {SAUDI_REGIONS.map((r, i) => (
        <path key={r.id} d={r.d} fill={["#a5b4fc","#fca5a5","#86efac","#fde047","#7dd3fc"][i % 5]}
          stroke="#fff" strokeWidth="0.6" strokeLinejoin="round" />
      ))}
    </svg>
  );
  if (type === "gcc_map") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M 8 22 L 12 15 L 17 10 L 24 6 L 33 4 L 44 4 L 54 5 L 63 7 L 71 12 L 77 19 L 81 27 L 81 33 L 80 36 L 83 38 L 86 36 L 90 38 L 89 44 L 85 46 L 82 47 L 86 49 L 91 51 L 95 56 L 96 64 L 94 73 L 89 81 L 81 86 L 73 83 L 65 80 L 56 82 L 47 84 L 38 87 L 32 86 L 28 80 L 25 72 L 22 62 L 19 51 L 15 39 L 11 27 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>
  );
  if (type === "arabia_map") return (
    <svg width={s} height={s} viewBox="0 0 100 100"><path d="M 6 18 L 11 11 L 18 6 L 28 3 L 42 2 L 56 3 L 67 6 L 75 12 L 81 20 L 84 28 L 84 34 L 81 38 L 78 42 L 81 44 L 87 45 L 92 49 L 95 56 L 96 64 L 94 73 L 91 81 L 86 87 L 78 92 L 68 94 L 56 95 L 44 95 L 34 93 L 27 89 L 22 82 L 19 73 L 16 62 L 13 50 L 10 38 L 7 26 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>
  );
  return null;
}

function DecoIcon({ type }) {
  const s = 20;
  if (type === "chain") return (
    <svg width={s} height={s} viewBox="0 0 40 16">
      {[0,1,2,3].map(i => i%2===0
        ? <ellipse key={i} cx={5+i*9} cy={8} rx={4} ry={6} fill="none" stroke="currentColor" strokeWidth="1.5"/>
        : <ellipse key={i} cx={5+i*9} cy={8} rx={6} ry={4} fill="none" stroke="currentColor" strokeWidth="1.5"/>
      )}
    </svg>
  );
  if (type === "rope") return (
    <svg width={s} height={s} viewBox="0 0 40 16">
      <path d="M2,5 C8,3 14,13 20,5 C26,3 32,13 38,5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M2,11 C8,13 14,3 20,11 C26,13 32,3 38,11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  if (type === "arc_ribbon") return (
    <svg width={s} height={s} viewBox="0 0 40 20">
      <path d="M2,18 Q20,2 38,18 L38,14 Q20,6 2,14 Z" fill="currentColor" opacity="0.8"/>
    </svg>
  );
  if (type === "wave_ribbon") return (
    <svg width={s} height={s} viewBox="0 0 40 16">
      <path d="M2,10 C8,4 14,14 20,8 C26,2 32,14 38,8 L38,12 C32,18 26,6 20,12 C14,18 8,8 2,14 Z" fill="currentColor" opacity="0.8"/>
    </svg>
  );
  if (type === "ring_chain") return (
    <svg width={s} height={s} viewBox="0 0 40 16">
      {[0,1,2,3].map(i => <circle key={i} cx={5+i*11} cy={8} r={5} fill="none" stroke="currentColor" strokeWidth="1.5"/>)}
    </svg>
  );
  if (type === "dots_line") return (
    <svg width={s} height={s} viewBox="0 0 40 16">
      {[0,1,2,3,4,5].map(i => <circle key={i} cx={3+i*7} cy={8} r={2.5} fill="currentColor"/>)}
    </svg>
  );
  if (type === "zigzag") return (
    <svg width={s} height={s} viewBox="0 0 40 16">
      <polyline points="2,12 8,4 14,12 20,4 26,12 32,4 38,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (type === "crescent") return (
    <svg width={s} height={s} viewBox="0 0 16 16">
      <path d="M8,2 A6,6 0 1 1 8,14 A4,4 0 1 0 8,2 Z" fill="currentColor"/>
    </svg>
  );
  return null;
}