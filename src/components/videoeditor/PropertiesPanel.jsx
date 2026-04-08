import React from "react";

/**
 * PropertiesPanel — يظهر على اليمين عند تحديد أي عنصر
 * selectedItem: { type: "text"|"shape"|"sticker"|"clip", data: {...} }
 * onUpdate(id, changes) — يطبق التغييرات على العنصر المحدد
 * onDelete(id)
 */
export default function PropertiesPanel({ selectedItem, onUpdate, onDelete }) {
  if (!selectedItem) {
    return (
      <div className="w-56 bg-[#1e1e1e] border-l border-[#2a2a2a] flex flex-col items-center justify-center flex-shrink-0">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <p className="text-[11px] text-[#555]">حدد عنصراً لتعديله</p>
        </div>
      </div>
    );
  }

  const { type, data } = selectedItem;
  const id = data.id;

  const set = (changes) => onUpdate(id, changes);

  return (
    <div className="w-56 bg-[#1e1e1e] border-l border-[#2a2a2a] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
        <span className="text-[11px] font-bold text-[#aaa] uppercase tracking-wider">
          {type === "text" ? "📝 نص" : type === "shape" ? "🔷 شكل" : type === "sticker" ? "😀 ستيكر" : "🎬 Clip"}
        </span>
        <button onClick={() => onDelete(id)}
          className="text-[#555] hover:text-red-400 text-xs transition px-1 py-0.5 rounded hover:bg-red-400/10">
          حذف
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">

        {/* ── TEXT properties ── */}
        {type === "text" && (
          <>
            <Section label="النص">
              <textarea
                value={data.text || ""}
                onChange={e => set({ text: e.target.value })}
                rows={2}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white resize-none focus:outline-none focus:border-[#00d4d4]"
              />
            </Section>

            <Section label="الخط والحجم">
              <select value={data.font || "Arial"} onChange={e => set({ font: e.target.value })}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00d4d4] mb-2">
                {["Arial","Georgia","Impact","Courier New","Verdana","Trebuchet MS"].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input type="range" min={10} max={120} value={data.fontSize || 32}
                  onChange={e => set({ fontSize: +e.target.value })}
                  className="flex-1 h-1 accent-[#00d4d4]" />
                <span className="text-[10px] text-[#888] w-8">{data.fontSize || 32}px</span>
              </div>
            </Section>

            <Section label="اللون والخلفية">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[#888] w-12">لون النص</span>
                <input type="color" value={data.color || "#ffffff"}
                  onChange={e => set({ color: e.target.value })}
                  className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-[10px] text-[#888]">{data.color || "#ffffff"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#888] w-12">خلفية</span>
                <input type="color" value={data.bg === "transparent" || !data.bg ? "#000000" : data.bg}
                  onChange={e => set({ bg: e.target.value })}
                  className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
                <button onClick={() => set({ bg: "transparent" })}
                  className="text-[9px] text-[#555] hover:text-[#888] border border-[#333] rounded px-1 py-0.5">
                  بلا خلفية
                </button>
              </div>
            </Section>

            <Section label="التنسيق">
              <div className="flex gap-2">
                <FmtBtn active={data.bold} onClick={() => set({ bold: !data.bold })} label="B" title="عريض" bold />
                <FmtBtn active={data.italic} onClick={() => set({ italic: !data.italic })} label="I" title="مائل" italic />
                <FmtBtn active={data.align === "left"} onClick={() => set({ align: "left" })} label="←" title="يسار" />
                <FmtBtn active={!data.align || data.align === "center"} onClick={() => set({ align: "center" })} label="≡" title="وسط" />
                <FmtBtn active={data.align === "right"} onClick={() => set({ align: "right" })} label="→" title="يمين" />
              </div>
            </Section>

            <Section label="الموضع">
              <PosSliders data={data} set={set} />
            </Section>
          </>
        )}

        {/* ── SHAPE properties ── */}
        {type === "shape" && (
          <>
            <Section label="اللون">
              <div className="flex items-center gap-2">
                <input type="color" value={data.color || "#00d4d4"}
                  onChange={e => set({ color: e.target.value })}
                  className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-[10px] text-[#888]">{data.color || "#00d4d4"}</span>
              </div>
            </Section>

            <Section label="الحجم">
              <div className="flex items-center gap-2">
                <input type="range" min={20} max={200} value={data.size || 60}
                  onChange={e => set({ size: +e.target.value })}
                  className="flex-1 h-1 accent-[#00d4d4]" />
                <span className="text-[10px] text-[#888] w-8">{data.size || 60}px</span>
              </div>
            </Section>

            <Section label="الشفافية">
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={1} step={0.05} value={data.opacity ?? 1}
                  onChange={e => set({ opacity: +e.target.value })}
                  className="flex-1 h-1 accent-[#00d4d4]" />
                <span className="text-[10px] text-[#888] w-8">{Math.round((data.opacity ?? 1) * 100)}%</span>
              </div>
            </Section>

            <Section label="الموضع">
              <PosSliders data={data} set={set} />
            </Section>
          </>
        )}

        {/* ── STICKER properties ── */}
        {type === "sticker" && (
          <>
            <Section label="الستيكر الحالي">
              <span style={{ fontSize: 48 }}>{data.emoji}</span>
            </Section>

            <Section label="الحجم">
              <div className="flex items-center gap-2">
                <input type="range" min={20} max={120} value={data.emojiSize || 48}
                  onChange={e => set({ emojiSize: +e.target.value })}
                  className="flex-1 h-1 accent-[#00d4d4]" />
                <span className="text-[10px] text-[#888] w-8">{data.emojiSize || 48}px</span>
              </div>
            </Section>

            <Section label="الشفافية">
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={1} step={0.05} value={data.opacity ?? 1}
                  onChange={e => set({ opacity: +e.target.value })}
                  className="flex-1 h-1 accent-[#00d4d4]" />
                <span className="text-[10px] text-[#888] w-8">{Math.round((data.opacity ?? 1) * 100)}%</span>
              </div>
            </Section>

            <Section label="الموضع">
              <PosSliders data={data} set={set} />
            </Section>
          </>
        )}

        {/* ── CLIP properties ── */}
        {type === "clip" && (
          <>
            <Section label="اسم الكليب">
              <p className="text-xs text-white truncate">{data.name}</p>
            </Section>

            <Section label="الفلتر">
              <div className="flex flex-col gap-1.5">
                {[
                  { label: "بلا فلتر", value: "" },
                  { label: "أبيض وأسود", value: "grayscale(1)" },
                  { label: "دراما", value: "contrast(1.4) saturate(0.8)" },
                  { label: "دافئ", value: "sepia(0.5) saturate(1.3)" },
                  { label: "بارد", value: "hue-rotate(200deg) saturate(1.2)" },
                  { label: "ناعم", value: "brightness(1.1) blur(0.5px)" },
                ].map(f => (
                  <button key={f.value} onClick={() => set({ filter: f.value })}
                    className={`text-left px-2 py-1.5 rounded-lg text-xs transition border ${data.filter === f.value ? "border-[#00d4d4] text-[#00d4d4] bg-[#00d4d4]/10" : "border-[#333] text-[#888] hover:border-[#555] hover:text-white"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="السطوع">
              <div className="flex items-center gap-2">
                <input type="range" min={0.2} max={2} step={0.05} value={data.brightness ?? 1}
                  onChange={e => set({ brightness: +e.target.value })}
                  className="flex-1 h-1 accent-[#00d4d4]" />
                <span className="text-[10px] text-[#888] w-8">{Math.round((data.brightness ?? 1) * 100)}%</span>
              </div>
            </Section>

            <Section label="الشفافية">
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={1} step={0.05} value={data.opacity ?? 1}
                  onChange={e => set({ opacity: +e.target.value })}
                  className="flex-1 h-1 accent-[#00d4d4]" />
                <span className="text-[10px] text-[#888] w-8">{Math.round((data.opacity ?? 1) * 100)}%</span>
              </div>
            </Section>
          </>
        )}

      </div>
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">{label}</span>
      {children}
    </div>
  );
}

function FmtBtn({ active, onClick, label, title, bold, italic }) {
  return (
    <button title={title} onClick={onClick}
      className={`w-8 h-8 rounded-lg text-sm transition border flex items-center justify-center
        ${active ? "border-[#00d4d4] text-[#00d4d4] bg-[#00d4d4]/10" : "border-[#333] text-[#888] hover:border-[#555]"}`}
      style={{ fontWeight: bold ? "bold" : "normal", fontStyle: italic ? "italic" : "normal" }}>
      {label}
    </button>
  );
}

function PosSliders({ data, set }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#888] w-4">X</span>
        <input type="range" min={2} max={98} value={data.x ?? 50}
          onChange={e => set({ x: +e.target.value })}
          className="flex-1 h-1 accent-[#00d4d4]" />
        <span className="text-[10px] text-[#888] w-8">{Math.round(data.x ?? 50)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#888] w-4">Y</span>
        <input type="range" min={2} max={98} value={data.y ?? 50}
          onChange={e => set({ y: +e.target.value })}
          className="flex-1 h-1 accent-[#00d4d4]" />
        <span className="text-[10px] text-[#888] w-8">{Math.round(data.y ?? 50)}%</span>
      </div>
    </div>
  );
}