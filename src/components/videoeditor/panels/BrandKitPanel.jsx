import React, { useState, useRef } from "react";

const DEFAULT_FONTS = ["Cairo", "Tajawal", "Montserrat", "Oswald", "Bebas Neue"];

export default function BrandKitPanel({ onAddText, onAddElement }) {
  const logoInputRef = useRef(null);
  const [logos, setLogos] = useState([]);
  const [brandColors, setBrandColors] = useState(["#00d4d4", "#ffffff", "#000000", "#ff6b35"]);
  const [newColor, setNewColor] = useState("#ff0000");
  const [brandFont, setBrandFont] = useState("Cairo");
  const [brandName, setBrandName] = useState("");

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogos(p => [...p, { id: Date.now(), name: file.name, url }]);
    e.target.value = "";
  };

  const addBrandColor = () => {
    if (!brandColors.includes(newColor)) {
      setBrandColors(p => [...p, newColor]);
    }
  };

  const removeColor = (c) => setBrandColors(p => p.filter(x => x !== c));

  const applyBrandText = (color) => {
    onAddText?.({
      text: brandName || "نص العلامة التجارية",
      font: brandFont,
      fontSize: 36,
      color,
      bold: true,
      italic: false,
      align: "center",
      bg: "transparent",
    });
  };

  return (
    <div className="flex flex-col gap-4 p-3 text-white">

      {/* Brand Name */}
      <div>
        <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider mb-1.5">اسم العلامة التجارية</p>
        <input
          value={brandName}
          onChange={e => setBrandName(e.target.value)}
          placeholder="اكتب اسم علامتك..."
          className="w-full bg-[#252525] border border-[#333] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#00d4d4] transition"
        />
      </div>

      {/* Brand Font */}
      <div>
        <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider mb-1.5">خط العلامة التجارية</p>
        <select
          value={brandFont}
          onChange={e => setBrandFont(e.target.value)}
          className="w-full bg-[#252525] border border-[#333] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#00d4d4]"
          style={{ fontFamily: brandFont }}
        >
          {DEFAULT_FONTS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </div>

      {/* Brand Colors */}
      <div>
        <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider mb-1.5">ألوان العلامة التجارية</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {brandColors.map(c => (
            <div key={c} className="relative group">
              <button
                onClick={() => applyBrandText(c)}
                className="w-9 h-9 rounded-xl border-2 border-[#333] hover:scale-110 transition"
                style={{ background: c }}
                title={c}
              />
              <button
                onClick={() => removeColor(c)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
              >✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="color"
            value={newColor}
            onChange={e => setNewColor(e.target.value)}
            className="w-10 h-9 rounded-lg cursor-pointer bg-transparent border-none"
          />
          <button
            onClick={addBrandColor}
            className="flex-1 py-1.5 rounded-xl bg-[#252525] hover:bg-[#2e2e2e] border border-[#333] text-xs text-white transition"
          >
            + إضافة لون
          </button>
        </div>
      </div>

      {/* Apply Brand Text */}
      <button
        onClick={() => applyBrandText(brandColors[0] || "#ffffff")}
        className="w-full py-2.5 rounded-xl bg-[#00d4d4] hover:bg-[#00bfbf] text-black font-bold text-sm transition"
      >
        + إضافة نص العلامة للفيديو
      </button>

      <div className="w-full h-px bg-[#2a2a2a]" />

      {/* Logo Upload */}
      <div>
        <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider mb-1.5">شعار العلامة التجارية</p>
        <button
          onClick={() => logoInputRef.current?.click()}
          className="w-full py-2.5 rounded-xl bg-[#252525] hover:bg-[#2e2e2e] border border-dashed border-[#444] hover:border-[#00d4d4]/50 text-[#888] text-xs transition flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          رفع الشعار (PNG/SVG)
        </button>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

        {logos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {logos.map(logo => (
              <div key={logo.id} className="relative group bg-[#252525] rounded-xl p-2 border border-[#333] hover:border-[#00d4d4]/40 transition">
                <img src={logo.url} alt={logo.name} className="w-full h-14 object-contain" />
                <button
                  onClick={() => setLogos(p => p.filter(l => l.id !== logo.id))}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-[9px] text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                >✕</button>
                <p className="text-[9px] text-[#666] truncate mt-1">{logo.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}