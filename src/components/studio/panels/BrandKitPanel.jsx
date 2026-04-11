import React, { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "brand_kit_v1";

const ARABIC_FONTS = [
  { family: "Tajawal", label: "تجوال" },
  { family: "Cairo", label: "القاهرة" },
  { family: "Almarai", label: "المراعي" },
  { family: "Readex Pro", label: "ريدكس برو" },
  { family: "El Messiri", label: "المسيري" },
  { family: "Lalezar", label: "لالهزار" },
  { family: "Amiri", label: "أميري" },
  { family: "Mada", label: "مدى" },
  { family: "Changa", label: "تشانجا" },
  { family: "Mirza", label: "ميرزا" },
];

const DEFAULT_BRAND = {
  name: "علامتي التجارية",
  primaryColor: "#7c3aed",
  secondaryColor: "#2563eb",
  accentColor: "#f59e0b",
  bgColor: "#1e293b",
  colors: ["#7c3aed", "#2563eb", "#f59e0b", "#ffffff", "#1e293b"],
  primaryFont: "Cairo",
  secondaryFont: "Tajawal",
  bgRemovalKey: "",
};

function loadBrand() {
  try { return { ...DEFAULT_BRAND, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }; } catch { return DEFAULT_BRAND; }
}

function saveBrand(brand) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(brand)); } catch {}
}

// ─── مكوّن نقطة اللون ────────────────────────────────────────────────────────
function ColorDot({ color, onClick, label, small }) {
  return (
    <button
      onClick={() => onClick(color)}
      title={label || color}
      className={`rounded-full border-2 border-slate-600 hover:border-indigo-400 transition flex-shrink-0 ${small ? "w-6 h-6" : "w-8 h-8"}`}
      style={{ backgroundColor: color }}
    />
  );
}

export default function BrandKitPanel({ onApplyColor, onApplyFont, onApplyBg, language }) {
  const [brand, setBrand] = useState(loadBrand);
  const [editingKey, setEditingKey] = useState(null); // which color is being edited
  const [showApiInput, setShowApiInput] = useState(false);
  const [saved, setSaved] = useState(false);
  const colorInputRef = useRef(null);

  const update = (key, val) => {
    setBrand(prev => {
      const next = { ...prev, [key]: val };
      saveBrand(next);
      return next;
    });
  };

  const updateColor = (idx, val) => {
    setBrand(prev => {
      const colors = [...prev.colors];
      colors[idx] = val;
      const next = { ...prev, colors };
      saveBrand(next);
      return next;
    });
  };

  const addColor = () => {
    if (brand.colors.length >= 10) return;
    const next = { ...brand, colors: [...brand.colors, "#6366f1"] };
    setBrand(next);
    saveBrand(next);
  };

  const removeColor = (idx) => {
    if (brand.colors.length <= 1) return;
    const colors = brand.colors.filter((_, i) => i !== idx);
    const next = { ...brand, colors };
    setBrand(next);
    saveBrand(next);
  };

  const handleSave = () => {
    saveBrand(brand);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 text-sm">
      {/* اسم العلامة */}
      <div>
        <label className="text-slate-400 text-xs mb-1 block">اسم العلامة التجارية</label>
        <input
          type="text"
          value={brand.name}
          onChange={e => update("name", e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-indigo-500"
          placeholder="اسم العلامة..."
        />
      </div>

      {/* لوحة الألوان */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-300 text-xs font-semibold">🎨 ألوان العلامة</span>
          <button onClick={addColor} className="text-indigo-400 text-xs hover:text-indigo-300">+ إضافة</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {brand.colors.map((color, i) => (
            <div key={i} className="relative group">
              <input
                type="color"
                value={color}
                onChange={e => updateColor(i, e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <div
                className="w-8 h-8 rounded-full border-2 border-slate-600 hover:border-indigo-400 cursor-pointer transition"
                style={{ backgroundColor: color }}
                title={color}
              />
              <button
                onClick={() => removeColor(i)}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-xs hidden group-hover:flex items-center justify-center leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* أزرار التطبيق السريع */}
        <div className="mt-2 space-y-1">
          <p className="text-slate-500 text-xs">اضغط لتطبيق على العنصر المحدد:</p>
          <div className="flex flex-wrap gap-1.5">
            {brand.colors.map((color, i) => (
              <button
                key={i}
                onClick={() => onApplyColor(color)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs transition"
              >
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
                {color}
              </button>
            ))}
          </div>
          <button
            onClick={() => onApplyBg(brand.bgColor)}
            className="w-full px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 text-start flex items-center gap-2 transition mt-1"
          >
            <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: brand.bgColor }} />
            تطبيق كخلفية
            <input
              type="color"
              value={brand.bgColor}
              onChange={e => update("bgColor", e.target.value)}
              onClick={e => e.stopPropagation()}
              className="ms-auto w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
          </button>
        </div>
      </div>

      {/* الخطوط */}
      <div>
        <p className="text-slate-300 text-xs font-semibold mb-2">🔤 خطوط العلامة</p>
        <div className="space-y-2">
          {[
            { key: "primaryFont", label: "الخط الرئيسي" },
            { key: "secondaryFont", label: "الخط الثانوي" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-slate-400 text-xs mb-1 block">{label}</label>
              <div className="flex gap-1">
                <select
                  value={brand[key]}
                  onChange={e => update(key, e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-indigo-500"
                  style={{ fontFamily: brand[key] }}
                >
                  {ARABIC_FONTS.map(f => (
                    <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
                      {f.label} — {f.family}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onApplyFont(brand[key])}
                  className="px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-xs text-white transition"
                >
                  تطبيق
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* إزالة الخلفية API Key */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-slate-300 text-xs font-semibold">✂️ إزالة الخلفية (remove.bg)</p>
          <button onClick={() => setShowApiInput(p => !p)} className="text-slate-500 text-xs hover:text-slate-300">
            {showApiInput ? "إخفاء" : "تعديل"}
          </button>
        </div>
        {showApiInput ? (
          <input
            type="password"
            value={brand.bgRemovalKey}
            onChange={e => update("bgRemovalKey", e.target.value)}
            placeholder="مفتاح API من remove.bg..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-indigo-500"
          />
        ) : (
          <p className="text-slate-500 text-xs">
            {brand.bgRemovalKey ? "✓ تم إضافة مفتاح API" : "لا يوجد مفتاح — احصل على مفتاح مجاني من remove.bg"}
          </p>
        )}
      </div>

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        className={`w-full py-2 rounded-xl text-sm font-semibold transition ${
          saved ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
        }`}
      >
        {saved ? "✓ تم الحفظ" : "حفظ هوية العلامة"}
      </button>
    </div>
  );
}

// ─── دالة مساعدة لإزالة الخلفية (تُستخدم من ImagesPanel) ──────────────────
export async function removeBgWithKey(imageUrl, apiKey) {
  if (!apiKey) throw new Error("لم يتم إضافة مفتاح remove.bg في Brand Kit");
  const formData = new FormData();
  // إذا كان URL خارجياً → نرسله مباشرة
  if (imageUrl.startsWith("http")) {
    formData.append("image_url", imageUrl);
  } else {
    // data URL → نحوّله إلى Blob
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    formData.append("image_file", blob, "image.png");
  }
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.errors?.[0]?.title || "فشل إزالة الخلفية");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function getBrandKey() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.bgRemovalKey || ""; } catch { return ""; }
}
