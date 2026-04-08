import React from "react";
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Type, Square, Image, Star } from "lucide-react";

const TYPE_ICONS = {
  text: Type,
  shape: Square,
  image: Image,
  logo: Star,
};

const TYPE_LABELS = {
  text: { ar: "نص", en: "Text" },
  shape: { ar: "شكل", en: "Shape" },
  image: { ar: "صورة", en: "Image" },
  logo: { ar: "لوقو", en: "Logo" },
};

function LayerItem({ item, isSelected, isMultiSelected, onSelect, onMultiSelect, onToggleVisible, onToggleLock, onMoveUp, onMoveDown, isFirst, isLast, language, onHover }) {
  const isRtl = language === "ar";
  const Icon = TYPE_ICONS[item.type] || Square;
  const getLabel = () => {
    if (item.isLucideIcon) return item.iconName || (isRtl ? "أيقونة" : "Icon");
    if (item.isSocialIcon) return item.socialIconKey || (isRtl ? "أيقونة سوشيال" : "Social Icon");
    if (item.isText) return item.text || (isRtl ? "رمز" : "Symbol");
    if (item.isHandDrawn) return isRtl ? "رسم يدوي" : "Hand Drawn";
    return item.text || item.name || (isRtl ? TYPE_LABELS[item.type]?.ar : TYPE_LABELS[item.type]?.en) || item.type;
  };
  const label = getLabel();

  const handleClick = (e) => {
    if (e.shiftKey) {
      onMultiSelect(item.id, item.type, e);
    } else {
      onSelect(item.id, item.type);
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => onHover(item.id, item.type)}
      onMouseLeave={() => onHover(null, null)}
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition text-xs ${
        isMultiSelected ? "bg-purple-600/30 border border-purple-500/50" :
        isSelected ? "bg-indigo-600/30 border border-indigo-500/50" : "bg-slate-700 hover:bg-slate-600"
      } ${item.locked ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={isMultiSelected}
        onChange={(e) => { e.stopPropagation(); onMultiSelect(item.id, item.type, e); }}
        className="w-3 h-3 accent-purple-500 cursor-pointer flex-shrink-0"
      />
      <Icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
      <span className="flex-1 truncate text-slate-200">{label}</span>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={isFirst}
          className="text-slate-400 hover:text-white disabled:opacity-20 transition"
          title={isRtl ? "للأمام" : "Move Up"}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={isLast}
          className="text-slate-400 hover:text-white disabled:opacity-20 transition"
          title={isRtl ? "للخلف" : "Move Down"}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          className="text-slate-400 hover:text-white transition"
        >
          {item.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
          className={`transition ${item.locked ? "text-yellow-400 hover:text-yellow-300" : "text-slate-400 hover:text-white"}`}
          title={item.locked ? (isRtl ? "فتح القفل" : "Unlock") : (isRtl ? "قفل" : "Lock")}
        >
          {item.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

export default function LayersPanel({
  textLayers, shapes, images, logos,
  selectedId, selectedType,
  onSelect, multiSelected, onMultiSelect, onHover,
  onUpdateText, onUpdateShape, onUpdateImage, onUpdateLogo,
  onReorderText, onReorderShape, onReorderImage, onReorderLogo,
  language,
}) {
  const isRtl = language === "ar";

  // Build flat layers list (top = front = last in array)
  const allLayers = [
    ...textLayers.map(l => ({ ...l, type: "text" })),
    ...logos.map(l => ({ ...l, type: "logo" })),
    ...images.map(l => ({ ...l, type: "image" })),
    ...shapes.map(l => ({ ...l, type: "shape" })),
  ].reverse(); // show front layers first

  const getUpdateFn = (type) => ({
    text: onUpdateText, shape: onUpdateShape, image: onUpdateImage, logo: onUpdateLogo,
  }[type]);

  const getReorderFn = (type) => ({
    text: onReorderText, shape: onReorderShape, image: onReorderImage, logo: onReorderLogo,
  }[type]);

  const getArray = (type) => ({
    text: textLayers, shape: shapes, image: images, logo: logos,
  }[type]);

  const handleMoveUp = (item) => {
    const arr = getArray(item.type);
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx < arr.length - 1) {
      const newArr = [...arr];
      [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      getReorderFn(item.type)(newArr);
    }
  };

  const handleMoveDown = (item) => {
    const arr = getArray(item.type);
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx > 0) {
      const newArr = [...arr];
      [newArr[idx], newArr[idx - 1]] = [newArr[idx - 1], newArr[idx]];
      getReorderFn(item.type)(newArr);
    }
  };

  const isFirst = (item) => {
    const arr = getArray(item.type);
    return arr[arr.length - 1]?.id === item.id;
  };

  const isLast = (item) => {
    const arr = getArray(item.type);
    return arr[0]?.id === item.id;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-400 font-semibold text-xs">{isRtl ? "🗂️ الطبقات" : "🗂️ Layers"}</h3>
        <span className="text-slate-500 text-[10px]">{allLayers.length} {isRtl ? "طبقة" : "layers"}</span>
      </div>

      {allLayers.length === 0 ? (
        <p className="text-slate-500 text-xs text-center py-4">{isRtl ? "لا توجد طبقات" : "No layers yet"}</p>
      ) : (
        <div className="space-y-1">
           {allLayers.map((item) => (
             <LayerItem
               key={`${item.type}-${item.id}`}
               item={item}
               isSelected={selectedId === item.id && selectedType === item.type}
               isMultiSelected={multiSelected.some(el => el.id === item.id && el.type === item.type)}
               onSelect={onSelect}
               onMultiSelect={onMultiSelect}
               onToggleVisible={() => getUpdateFn(item.type)(item.id, { visible: item.visible === false ? true : false })}
               onToggleLock={() => getUpdateFn(item.type)(item.id, { locked: !item.locked })}
               onMoveUp={() => handleMoveUp(item)}
               onMoveDown={() => handleMoveDown(item)}
               isFirst={isFirst(item)}
               isLast={isLast(item)}
               language={language}
               onHover={onHover}
             />
           ))}
         </div>
      )}

      <div className="mt-3 p-2 bg-slate-700/40 rounded text-[10px] text-slate-400">
        <p>🔒 {isRtl ? "القفل يمنع تحريك الطبقة عن طريق الخطأ" : "Lock prevents accidental movement"}</p>
        <p className="mt-1">⬆⬇ {isRtl ? "الترتيب يحدد من يظهر فوق الآخر" : "Order controls what appears on top"}</p>
      </div>
    </div>
  );
}