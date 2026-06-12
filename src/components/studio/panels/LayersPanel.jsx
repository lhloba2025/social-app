import React, { useState } from "react";
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Type, Square, Image, Star, Pencil } from "lucide-react";

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

function LayerItem({ item, isSelected, isMultiSelected, onSelect, onMultiSelect, onToggleVisible, onToggleLock, onMoveUp, onMoveDown, onRename, isFirst, isLast, language, onHover }) {
  const isRtl = language === "ar";
  const Icon = TYPE_ICONS[item.type] || Square;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const getLabel = () => {
    if (item.layerName) return item.layerName;
    if (item.isLucideIcon) return item.iconName || (isRtl ? "أيقونة" : "Icon");
    if (item.isSocialIcon) return item.socialIconKey || (isRtl ? "أيقونة سوشيال" : "Social Icon");
    if (item.isText) return item.text || (isRtl ? "رمز" : "Symbol");
    if (item.isHandDrawn) return isRtl ? "رسم يدوي" : "Hand Drawn";
    return item.text || item.name || (isRtl ? TYPE_LABELS[item.type]?.ar : TYPE_LABELS[item.type]?.en) || item.type;
  };
  const label = getLabel();

  const handleClick = (e) => {
    if (editing) return;
    if (e.shiftKey) {
      onMultiSelect(item.id, item.type, e);
    } else {
      onSelect(item.id, item.type);
    }
  };

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(label);
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    if (draft.trim() && draft !== label) onRename(draft.trim());
  };

  return (
    <div
      onClick={handleClick}
      onDoubleClick={startEdit}
      onMouseEnter={() => onHover(item.id, item.type)}
      onMouseLeave={() => onHover(null, null)}
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition text-xs border ${
        isMultiSelected ? "" :
        isSelected ? "" : "bg-slate-50 hover:bg-slate-100"
      } ${item.locked ? "opacity-60" : ""}`}
      style={
        isMultiSelected ? { background: "rgba(168,85,247,0.10)", borderColor: "rgba(168,85,247,0.55)" } :
        isSelected ? { background: "rgba(79,70,229,0.08)", borderColor: "var(--hv-primary)" } :
        { borderColor: "var(--hv-border)" }
      }
    >
      <input
        type="checkbox"
        checked={isMultiSelected}
        onChange={(e) => { e.stopPropagation(); onMultiSelect(item.id, item.type, e); }}
        className="w-3 h-3 accent-purple-500 cursor-pointer flex-shrink-0"
      />
      <Icon className="w-3 h-3 text-slate-500 flex-shrink-0" />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="hv-input flex-1 px-1 text-xs"
        />
      ) : (
        <span className="flex-1 truncate" style={{ color: "var(--hv-text)" }} title={isRtl ? "نقر مزدوج لإعادة التسمية" : "Double-click to rename"}>{label}</span>
      )}

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={startEdit}
          className="text-slate-500 hover:text-indigo-600 transition"
          title={isRtl ? "إعادة تسمية" : "Rename"}
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={isFirst}
          className="text-slate-500 hover:text-indigo-600 disabled:opacity-20 transition"
          title={isRtl ? "للأمام" : "Move Up"}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={isLast}
          className="text-slate-500 hover:text-indigo-600 disabled:opacity-20 transition"
          title={isRtl ? "للخلف" : "Move Down"}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          className="text-slate-500 hover:text-indigo-600 transition"
        >
          {item.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
          className={`transition ${item.locked ? "text-amber-500 hover:text-amber-600" : "text-slate-500 hover:text-indigo-600"}`}
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
        <h3 className="font-semibold text-xs" style={{ color: "var(--hv-text)" }}>{isRtl ? "🗂️ الطبقات" : "🗂️ Layers"}</h3>
        <span className="text-[10px]" style={{ color: "var(--hv-text-faint)" }}>{allLayers.length} {isRtl ? "طبقة" : "layers"}</span>
      </div>

      {allLayers.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--hv-text-faint)" }}>{isRtl ? "لا توجد طبقات" : "No layers yet"}</p>
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
               onRename={(name) => getUpdateFn(item.type)(item.id, { layerName: name })}
               isFirst={isFirst(item)}
               isLast={isLast(item)}
               language={language}
               onHover={onHover}
             />
           ))}
         </div>
      )}

      <div className="mt-3 p-2 rounded text-[10px] border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}>
        <p>🔒 {isRtl ? "القفل يمنع تحريك الطبقة عن طريق الخطأ" : "Lock prevents accidental movement"}</p>
        <p className="mt-1">⬆⬇ {isRtl ? "الترتيب يحدد من يظهر فوق الآخر" : "Order controls what appears on top"}</p>
      </div>
    </div>
  );
}