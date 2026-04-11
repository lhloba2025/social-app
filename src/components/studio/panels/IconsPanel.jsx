import React, { useState, useMemo } from "react";
import { Search, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
import { ICON_MAP, ICON_CATEGORIES } from "../lucideIcons";
import { SOCIAL_ICONS } from "../socialIcons";
import StudioColorPicker from "../StudioColorPicker";

// Currencies library
const CURRENCIES = [
  { id: "dollar", name: "US Dollar", nameAr: "الدولار الأمريكي", icon: "$", color: "#00AA00" },
  { id: "euro", name: "Euro", nameAr: "اليورو", icon: "€", color: "#0066CC" },
  { id: "pound", name: "British Pound", nameAr: "الجنيه الإسترليني", icon: "£", color: "#FF0000" },
  { id: "yen", name: "Japanese Yen", nameAr: "الين الياباني", icon: "¥", color: "#C0C0C0" },
  { id: "rupee", name: "Indian Rupee", nameAr: "الروبية الهندية", icon: "₹", color: "#FF9500" },
  { id: "dirham", name: "UAE Dirham", nameAr: "الدرهم الإماراتي", icon: "د.إ", color: "#00AA00" },
  { id: "kuwaiti_dinar", name: "Kuwaiti Dinar", nameAr: "الدينار الكويتي", icon: "د.ك", color: "#00AA00" },
  { id: "qatari_riyal", name: "Qatari Riyal", nameAr: "الريال القطري", icon: "ر.ق", color: "#00AA00" },
  { id: "omani_rial", name: "Omani Rial", nameAr: "الريال العماني", icon: "ر.ع.", color: "#00AA00" },
  { id: "bahraini_dinar", name: "Bahraini Dinar", nameAr: "الدينار البحريني", icon: "د.ب", color: "#00AA00" },
  { id: "egyptian_pound", name: "Egyptian Pound", nameAr: "الجنيه المصري", icon: "ج.م", color: "#FF6347" },
  { id: "moroccan_dirham", name: "Moroccan Dirham", nameAr: "الدرهم المغربي", icon: "د.م.", color: "#00AA00" },
];

const CATEGORY_LABELS = {
  all:          { ar: "الكل",        en: "All" },
  social:       { ar: "سوشيال",      en: "Social" },
  business:     { ar: "أعمال",       en: "Business" },
  communication:{ ar: "تواصل",       en: "Comm." },
  tech:         { ar: "تقنية",       en: "Tech" },
  lifestyle:    { ar: "نمط حياة",   en: "Lifestyle" },
  media:        { ar: "ميديا",       en: "Media" },
  health:       { ar: "صحة",         en: "Health" },
  arrows:       { ar: "أسهم",        en: "Arrows" },
  misc:         { ar: "متنوع",       en: "Misc" },
  saudi:        { ar: "عملات",       en: "Currency" },
};

// All icon names (excluding SAR)
const ALL_ICON_NAMES = Object.values(ICON_CATEGORIES)
  .flat()
  .filter((n) => n !== "SAR")
  .filter((v, i, a) => a.indexOf(v) === i);

export default function IconsPanel({ onAddIcon, selectedId, onSelect, onDelete, onDuplicate, images, onUpdate, language }) {
  const isRtl = language === "ar";
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  // Icons on canvas
  const canvasIcons = images?.filter(i => (i.isLucideIcon || i.isSocialIcon || i.isText) && !i.isSymbol) || [];

  const selected = images?.find((i) => i.id === selectedId && (i.isLucideIcon || i.isText || i.isSocialIcon));
  const update = (key, val) => { if (selected) onUpdate(selected.id, { [key]: val }); };

  const getIconLabel = (img) => {
    if (img.isLucideIcon) return img.iconName || "Icon";
    if (img.isSocialIcon) return SOCIAL_ICONS[img.socialIconKey]?.label || img.socialIconKey;
    if (img.isText) return img.text || "Symbol";
    return "Icon";
  };

  const handleAdd = (name) => {
    if (name === "SAR") {
      onAddIcon({ isText: true, text: "\u20C1", fontSize: 48, textColor: "#ffffff", width: 12, height: 12 });
    } else {
      onAddIcon({ isLucideIcon: true, iconName: name, iconColor: "#ffffff", width: 12, height: 12 });
    }
  };

  const iconsToShow = useMemo(() => {
    let list = activeCategory === "all" ? ALL_ICON_NAMES : ICON_CATEGORIES[activeCategory] || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((n) => n.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, search]);

  const socialIconsToShow = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "social") return [];
    if (search.trim()) {
      const q = search.toLowerCase();
      return Object.keys(SOCIAL_ICONS).filter(k => SOCIAL_ICONS[k].label.toLowerCase().includes(q) || k.toLowerCase().includes(q));
    }
    return activeCategory === "social" ? Object.keys(SOCIAL_ICONS) : Object.keys(SOCIAL_ICONS);
  }, [activeCategory, search]);

  const currenciesToShow = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "saudi") return [];
    if (search.trim()) {
      const q = search.toLowerCase();
      return CURRENCIES.filter(c => c.name.toLowerCase().includes(q) || c.nameAr.toLowerCase().includes(q));
    }
    return activeCategory === "saudi" ? CURRENCIES : CURRENCIES;
  }, [activeCategory, search]);

  return (
    <div className="space-y-3 text-xs">

      {/* Canvas icons list */}
      {canvasIcons.length > 0 && (
        <div className="space-y-1">
          <p className="text-slate-400 font-semibold">{isRtl ? "🎯 أيقوناتك في الكانفاس" : "🎯 Your Canvas Icons"}</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {canvasIcons.map((img) => (
              <div
                key={img.id}
                onClick={() => onSelect(img.id, "image")}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
                  img.id === selectedId ? "bg-indigo-600/30 border border-indigo-500/50" : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                <span className="flex-1 truncate text-slate-200">{getIconLabel(img)}</span>
                <button onClick={(e) => { e.stopPropagation(); onUpdate(img.id, { visible: img.visible === false ? true : false }); }} className="text-slate-400 hover:text-white">
                  {img.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDuplicate(img.id); }} className="text-slate-400 hover:text-white">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(img.id); }} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-slate-400 font-semibold">{isRtl ? "🎯 مكتبة الأيقونات" : "🎯 Icons Library"}</h3>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isRtl ? "ابحث عن أيقونة..." : "Search icons..."}
          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 ps-7 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1">
        {Object.keys(CATEGORY_LABELS).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 rounded text-[10px] transition ${
              activeCategory === cat ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            {isRtl ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en}
          </button>
        ))}
      </div>

      {/* Icons grid */}
      <div className="grid grid-cols-5 gap-1.5 max-h-64 overflow-y-auto">
        {/* Currencies */}
        {currenciesToShow.map((currency) => (
          <button
            key={currency.id}
            onClick={() => onAddIcon({
              isText: true,
              text: currency.icon,
              textColor: currency.color,
              fontSize: 48,
              width: 12,
              height: 12,
            })}
            className="flex flex-col items-center gap-0.5 p-2 rounded bg-slate-700 hover:bg-indigo-600 transition text-slate-300 hover:text-white"
            title={isRtl ? currency.nameAr : currency.name}
          >
            <span className="text-lg font-bold">{currency.icon}</span>
            <span className="text-[7px] text-center truncate w-full">{isRtl ? currency.nameAr : currency.name}</span>
          </button>
        ))}

        {/* Social media icons */}
        {socialIconsToShow.map((key) => {
          const icon = SOCIAL_ICONS[key];
          return (
            <button
              key={key}
              onClick={() => onAddIcon({
                isSocialIcon: true,
                socialIconKey: key,
                iconColor: icon.color,
                width: 12, height: 12,
              })}
              className="flex flex-col items-center gap-0.5 p-2 rounded bg-slate-700 hover:bg-indigo-600 transition text-slate-300 hover:text-white"
              title={icon.label}
            >
              <span
                className="w-4 h-4 flex items-center justify-center"
                style={{ color: icon.color }}
                dangerouslySetInnerHTML={{ __html: icon.svg.replace('<svg ', '<svg width="16" height="16" ') }}
              />
              <span className="text-[7px] text-center truncate w-full">{icon.label}</span>
            </button>
          );
        })}

        {/* SAR special */}
        {(activeCategory === "all" || activeCategory === "saudi") && !search && (
          <button
            onClick={() => handleAdd("SAR")}
            className="flex flex-col items-center gap-0.5 p-2 rounded bg-slate-700 hover:bg-indigo-600 transition text-slate-300 hover:text-white"
            title="Saudi Riyal"
          >
            <span className="text-lg font-bold">&#x20C1;</span>
            <span className="text-[8px]">SAR</span>
          </button>
        )}

        {iconsToShow.map((name) => {
          const Icon = ICON_MAP[name];
          if (!Icon) return null;
          return (
            <button
              key={name}
              onClick={() => handleAdd(name)}
              className="flex flex-col items-center gap-0.5 p-2 rounded bg-slate-700 hover:bg-indigo-600 transition text-slate-300 hover:text-white"
              title={name}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[8px] text-center truncate w-full">{name}</span>
            </button>
          );
        })}

        {iconsToShow.length === 0 && (
          <p className="col-span-5 text-center text-slate-500 py-4">
            {isRtl ? "لا توجد نتائج" : "No results"}
          </p>
        )}
      </div>

      {/* Edit selected */}
      {selected && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          <p className="text-slate-400 font-semibold">{isRtl ? "✏️ تعديل الأيقونة المحددة" : "✏️ Edit selected"}</p>

          {selected.isLucideIcon && (
            <StudioColorPicker
              label={isRtl ? "🎨 لون الأيقونة" : "🎨 Icon Color"}
              value={selected.iconColor || "#ffffff"}
              onChange={(v) => update("iconColor", v)}
            />
          )}

          {selected.isSocialIcon && (
            <StudioColorPicker
              label={isRtl ? "🎨 لون الأيقونة" : "🎨 Icon Color"}
              value={selected.iconColor || SOCIAL_ICONS[selected.socialIconKey]?.color || "#ffffff"}
              onChange={(v) => update("iconColor", v)}
            />
          )}

          {selected.isText && (
            <StudioColorPicker
              label={isRtl ? "🎨 لون الرمز" : "🎨 Symbol Color"}
              value={selected.textColor || "#ffffff"}
              onChange={(v) => update("textColor", v)}
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "العرض%" : "Width%"}</label>
              <input type="number" value={Math.round(selected.width || 12)}
                onChange={(e) => update("width", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "الارتفاع%" : "Height%"}</label>
              <input type="number" value={Math.round(selected.height || 12)}
                onChange={(e) => update("height", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">X%</label>
              <input type="number" value={Math.round(selected.x || 0)}
                onChange={(e) => update("x", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Y%</label>
              <input type="number" value={Math.round(selected.y || 0)}
                onChange={(e) => update("y", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "شفافية" : "Opacity"}</label>
            <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1}
              onChange={(e) => update("opacity", parseFloat(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "دوران" : "Rotation"}</label>
            <input type="number" value={selected.rotation || 0}
              onChange={(e) => update("rotation", parseInt(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}