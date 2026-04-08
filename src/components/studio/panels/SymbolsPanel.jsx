import React, { useState } from "react";
import { Eye, EyeOff, Copy, Trash2, Grid2X2, Palette } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";

// Predefined symbols library - expanded
const SYMBOLS = [
  { id: "star", name: "Star", nameAr: "نجمة", icon: "⭐", color: "#FFD700" },
  { id: "heart", name: "Heart", nameAr: "قلب", icon: "❤️", color: "#FF0000" },
  { id: "check", name: "Check", nameAr: "علامة صح", icon: "✓", color: "#00AA00" },
  { id: "cross", name: "Cross", nameAr: "علامة خطأ", icon: "✕", color: "#FF0000" },
  { id: "plus", name: "Plus", nameAr: "إضافة", icon: "+", color: "#FFFFFF" },
  { id: "minus", name: "Minus", nameAr: "طرح", icon: "−", color: "#FFFFFF" },
  { id: "multiply", name: "Multiply", nameAr: "ضرب", icon: "×", color: "#FFFFFF" },
  { id: "divide", name: "Divide", nameAr: "قسمة", icon: "÷", color: "#FFFFFF" },
  { id: "arrow_right", name: "Arrow Right", nameAr: "سهم يمين", icon: "→", color: "#FFFFFF" },
  { id: "arrow_left", name: "Arrow Left", nameAr: "سهم يسار", icon: "←", color: "#FFFFFF" },
  { id: "arrow_up", name: "Arrow Up", nameAr: "سهم أعلى", icon: "↑", color: "#FFFFFF" },
  { id: "arrow_down", name: "Arrow Down", nameAr: "سهم أسفل", icon: "↓", color: "#FFFFFF" },
  { id: "double_arrow_right", name: "Double Arrow", nameAr: "سهم مزدوج", icon: "⇒", color: "#FFFFFF" },
  { id: "circle", name: "Circle", nameAr: "دائرة", icon: "●", color: "#FFFFFF" },
  { id: "square", name: "Square", nameAr: "مربع", icon: "■", color: "#FFFFFF" },
  { id: "diamond", name: "Diamond", nameAr: "معين", icon: "◆", color: "#FFFFFF" },
  { id: "triangle", name: "Triangle", nameAr: "مثلث", icon: "▲", color: "#FFFFFF" },
  { id: "triangle_down", name: "Triangle Down", nameAr: "مثلث للأسفل", icon: "▼", color: "#FFFFFF" },
  { id: "pentagon", name: "Pentagon", nameAr: "خماسي", icon: "⬠", color: "#FFFFFF" },
  { id: "hexagon", name: "Hexagon", nameAr: "سداسي", icon: "⬡", color: "#FFFFFF" },
  { id: "star_empty", name: "Star Empty", nameAr: "نجمة فارغة", icon: "☆", color: "#FFFFFF" },
  { id: "music", name: "Music", nameAr: "موسيقى", icon: "♪", color: "#8B5CF6" },
  { id: "music_double", name: "Music Double", nameAr: "موسيقى مزدوجة", icon: "♫", color: "#8B5CF6" },
  { id: "sun", name: "Sun", nameAr: "شمس", icon: "☀️", color: "#FFD700" },
  { id: "moon", name: "Moon", nameAr: "قمر", icon: "☾", color: "#E0E7FF" },
  { id: "cloud", name: "Cloud", nameAr: "سحابة", icon: "☁️", color: "#E0E7FF" },
  { id: "flower", name: "Flower", nameAr: "زهرة", icon: "✿", color: "#FF69B4" },
  { id: "clover", name: "Clover", nameAr: "ثلاثي الأوراق", icon: "🍀", color: "#00AA00" },
  { id: "snowflake", name: "Snowflake", nameAr: "ندفة ثلج", icon: "❄️", color: "#87CEEB" },
  { id: "fire", name: "Fire", nameAr: "نار", icon: "🔥", color: "#FF4500" },
  { id: "droplet", name: "Droplet", nameAr: "قطرة", icon: "💧", color: "#1E90FF" },
  { id: "leaf", name: "Leaf", nameAr: "ورقة", icon: "🍃", color: "#00AA00" },
  { id: "bug", name: "Bug", nameAr: "خطأ", icon: "🐛", color: "#00AA00" },
  { id: "check_mark_big", name: "Check Mark Big", nameAr: "علامة صح كبيرة", icon: "✔️", color: "#00AA00" },
  { id: "cross_mark", name: "Cross Mark", nameAr: "علامة X", icon: "✖️", color: "#FF0000" },
  { id: "question", name: "Question", nameAr: "استفهام", icon: "❓", color: "#FFD700" },
  { id: "exclamation", name: "Exclamation", nameAr: "تعجب", icon: "❗", color: "#FF0000" },
  { id: "warning", name: "Warning", nameAr: "تحذير", icon: "⚠️", color: "#FFD700" },
  { id: "lightbulb", name: "Lightbulb", nameAr: "فكرة", icon: "💡", color: "#FFD700" },
  { id: "target", name: "Target", nameAr: "هدف", icon: "🎯", color: "#FF6347" },
  { id: "bomb", name: "Bomb", nameAr: "قنبلة", icon: "💣", color: "#000000" },
  { id: "rocket", name: "Rocket", nameAr: "صاروخ", icon: "🚀", color: "#FF4500" },
  { id: "star_bright", name: "Bright Star", nameAr: "نجمة مشعة", icon: "✨", color: "#FFD700" },
  { id: "sparkles", name: "Sparkles", nameAr: "برق", icon: "⚡", color: "#FFFF00" },
  { id: "ribbon", name: "Ribbon", nameAr: "شريط", icon: "🎀", color: "#FF1493" },
  { id: "gift", name: "Gift", nameAr: "هدية", icon: "🎁", color: "#FF0000" },
  { id: "crown", name: "Crown", nameAr: "تاج", icon: "👑", color: "#FFD700" },
  { id: "medal", name: "Medal", nameAr: "ميدالية", icon: "🏅", color: "#FFD700" },
  { id: "trophy", name: "Trophy", nameAr: "كأس", icon: "🏆", color: "#FFD700" },
  { id: "lock", name: "Lock", nameAr: "قفل", icon: "🔒", color: "#FFD700" },
  { id: "unlock", name: "Unlock", nameAr: "فتح", icon: "🔓", color: "#00AA00" },
  { id: "key", name: "Key", nameAr: "مفتاح", icon: "🔑", color: "#FFD700" },
  { id: "phone", name: "Phone", nameAr: "هاتف", icon: "📱", color: "#000000" },
  { id: "email", name: "Email", nameAr: "بريد", icon: "✉️", color: "#FFFFFF" },
  { id: "calendar", name: "Calendar", nameAr: "تقويم", icon: "📅", color: "#FF0000" },
  { id: "clock", name: "Clock", nameAr: "ساعة", icon: "🕐", color: "#FFFFFF" },
  { id: "stopwatch", name: "Stopwatch", nameAr: "ساعة إيقاف", icon: "⏱️", color: "#FFFFFF" },
  { id: "hourglass", name: "Hourglass", nameAr: "رمل", icon: "⌛", color: "#C0C0C0" },
  { id: "pencil", name: "Pencil", nameAr: "قلم", icon: "✏️", color: "#FFD700" },
  { id: "paintbrush", name: "Paintbrush", nameAr: "فرشاة", icon: "🖌️", color: "#FF6347" },
  { id: "book", name: "Book", nameAr: "كتاب", icon: "📖", color: "#8B4513" },
  { id: "bookmark", name: "Bookmark", nameAr: "إشارة مرجعية", icon: "🔖", color: "#FF0000" },
  { id: "chart_up", name: "Chart Up", nameAr: "رسم بياني صاعد", icon: "📈", color: "#00AA00" },
  { id: "chart_down", name: "Chart Down", nameAr: "رسم بياني هابط", icon: "📉", color: "#FF0000" },
  { id: "pie_chart", name: "Pie Chart", nameAr: "رسم دائري", icon: "📊", color: "#FF8C00" },
  { id: "bar_chart", name: "Bar Chart", nameAr: "رسم أعمدة", icon: "📊", color: "#4169E1" },

  // Currencies
  { id: "sar", name: "Saudi Riyal", nameAr: "الريال السعودي", icon: "﷼", color: "#00AA00" },
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

  // Faces & Emotions
  { id: "face_smile", name: "Smiling Face", nameAr: "وجه مبتسم", icon: "😊", color: "#FFD700" },
  { id: "face_laugh", name: "Laughing Face", nameAr: "وجه يضحك", icon: "😂", color: "#FFD700" },
  { id: "face_joy", name: "Joy Face", nameAr: "وجه فرح", icon: "😄", color: "#FFD700" },
  { id: "face_happy", name: "Happy Face", nameAr: "وجه سعيد", icon: "🙂", color: "#FFD700" },
  { id: "face_grin", name: "Grinning Face", nameAr: "وجه مشع", icon: "😁", color: "#FFD700" },
  { id: "face_wink", name: "Winking Face", nameAr: "وجه يغمز", icon: "😉", color: "#FFD700" },
  { id: "face_sweat_smile", name: "Smile with Sweat", nameAr: "ابتسامة وعرق", icon: "😅", color: "#FFD700" },
  { id: "face_dizzy", name: "Dizzy Face", nameAr: "وجه مدهوش", icon: "😵", color: "#FFD700" },
  { id: "face_innocent", name: "Innocent Face", nameAr: "وجه بريء", icon: "😇", color: "#FFD700" },
  { id: "face_thinking", name: "Thinking Face", nameAr: "وجه يفكر", icon: "🤔", color: "#FFD700" },
  { id: "face_cool", name: "Cool Face", nameAr: "وجه ذكي", icon: "😎", color: "#FFD700" },
  { id: "face_unimpressed", name: "Unamused Face", nameAr: "وجه غير سعيد", icon: "😒", color: "#FFD700" },
  { id: "face_neutral", name: "Neutral Face", nameAr: "وجه محايد", icon: "😐", color: "#FFD700" },
  { id: "face_expressionless", name: "Expressionless", nameAr: "وجه بلا تعبير", icon: "😑", color: "#FFD700" },
  { id: "face_sad", name: "Sad Face", nameAr: "وجه حزين", icon: "☹️", color: "#FFD700" },
  { id: "face_worried", name: "Worried Face", nameAr: "وجه قلق", icon: "😟", color: "#FFD700" },
  { id: "face_confused", name: "Confused Face", nameAr: "وجه مرتبك", icon: "😕", color: "#FFD700" },
  { id: "face_scared", name: "Scared Face", nameAr: "وجه خائف", icon: "😨", color: "#FFD700" },
  { id: "face_annoyed", name: "Annoyed Face", nameAr: "وجه منزعج", icon: "😠", color: "#FFD700" },
  { id: "face_angry", name: "Angry Face", nameAr: "وجه غاضب", icon: "😡", color: "#FF0000" },
  { id: "face_rage", name: "Rage Face", nameAr: "وجه غضب شديد", icon: "🤬", color: "#FF0000" },
  { id: "face_cry", name: "Crying Face", nameAr: "وجه يبكي", icon: "😢", color: "#87CEEB" },
  { id: "face_sob", name: "Sob Face", nameAr: "وجه ينتحب", icon: "😭", color: "#87CEEB" },
  { id: "face_love", name: "Face with Heart Eyes", nameAr: "وجه بعينين حب", icon: "😍", color: "#FF1493" },
  { id: "face_kiss", name: "Kiss Face", nameAr: "وجه قبلة", icon: "😘", color: "#FFB6C1" },
  { id: "face_evil", name: "Smiling Imp", nameAr: "وجه شرير", icon: "😈", color: "#8B0000" },
  { id: "face_devil", name: "Devil Face", nameAr: "وجه شيطان", icon: "👿", color: "#8B0000" },
  { id: "face_sunglasses", name: "Face with Sunglasses", nameAr: "وجه بنظارات شمسية", icon: "😎", color: "#FFD700" },
  { id: "face_party", name: "Party Face", nameAr: "وجه احتفالي", icon: "🥳", color: "#FFD700" },
  { id: "face_sick", name: "Sick Face", nameAr: "وجه مريض", icon: "🤒", color: "#90EE90" },
  { id: "face_dead", name: "Skull", nameAr: "جمجمة", icon: "💀", color: "#FFFFFF" },
  { id: "face_alien", name: "Alien Face", nameAr: "وجه فضائي", icon: "👽", color: "#90EE90" },
  { id: "face_robot", name: "Robot Face", nameAr: "وجه روبوت", icon: "🤖", color: "#C0C0C0" },
  { id: "face_clown", name: "Clown Face", nameAr: "وجه مهرج", icon: "🤡", color: "#FF6347" },
  { id: "face_ghost", name: "Ghost", nameAr: "شبح", icon: "👻", color: "#FFFFFF" },
];

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function SymbolsPanel({ onAdd, selectedId, onSelect, onDelete, onDuplicate, symbols, onUpdate, language }) {
  const isRtl = language === "ar";
  const [gridView, setGridView] = useState(true);

  const selected = symbols?.find((s) => s.id === selectedId && s.isSymbol);
  const update = (key, val) => {
    if (selected) onUpdate(selected.id, { [key]: val });
  };

  const handleAddSymbol = (symbolTemplate) => {
    onAdd({
      isSymbol: true,
      symbolKey: symbolTemplate.id,
      text: symbolTemplate.icon,
      textColor: symbolTemplate.color,
      fontSize: 48,
      width: 12,
      height: 12,
      x: 50,
      y: 50,
      opacity: 1,
      rotation: 0,
    });
  };

  const canvasSymbols = symbols?.filter((s) => s.isSymbol) || [];

  return (
    <div className="space-y-3 text-xs">
      {/* Canvas symbols */}
      {canvasSymbols.length > 0 && (
        <div className="space-y-1">
          <p className="text-slate-400 font-semibold">{isRtl ? "🎭 رموزك على الكانفاس" : "🎭 Your Canvas Symbols"}</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {canvasSymbols.map((sym) => {
              const template = SYMBOLS.find((s) => s.id === sym.symbolKey);
              return (
                <div
                  key={sym.id}
                  onClick={() => onSelect(sym.id, "image")}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
                    sym.id === selectedId ? "bg-indigo-600/30 border border-indigo-500/50" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  <span className="text-lg">{sym.text}</span>
                  <span className="flex-1 truncate text-slate-200">{isRtl ? template?.nameAr : template?.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(sym.id, { visible: sym.visible === false ? true : false });
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    {sym.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDuplicate(sym.id); }} className="text-slate-400 hover:text-white">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(sym.id); }} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h3 className="text-slate-400 font-semibold">{isRtl ? "🎭 مكتبة الرموز" : "🎭 Symbols Library"}</h3>

      {/* View toggle */}
      <button
        onClick={() => setGridView(!gridView)}
        className="w-full flex items-center justify-center gap-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white transition"
      >
        <Grid2X2 className="w-3.5 h-3.5" />
        {gridView ? (isRtl ? "عرض القائمة" : "List View") : (isRtl ? "عرض الشبكة" : "Grid View")}
      </button>

      {/* Grid view */}
      {gridView && (
        <div className="grid grid-cols-5 gap-1.5 max-h-96 overflow-y-auto p-1">
          {SYMBOLS.map((sym) => (
            <button
              key={sym.id}
              onClick={() => handleAddSymbol(sym)}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded bg-slate-700 hover:bg-indigo-600 transition text-slate-300 hover:text-white"
              title={isRtl ? sym.nameAr : sym.name}
            >
              <span className="text-xl">{sym.icon}</span>
              <span className="text-[7px] text-center truncate w-full leading-tight">{isRtl ? sym.nameAr : sym.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* List view */}
      {!gridView && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {SYMBOLS.map((sym) => (
            <button
              key={sym.id}
              onClick={() => handleAddSymbol(sym)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-slate-700 hover:bg-indigo-600 transition text-slate-300 hover:text-white"
            >
              <span className="text-lg">{sym.icon}</span>
              <span className="text-xs flex-1">{isRtl ? sym.nameAr : sym.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Edit selected symbol */}
      {selected && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          <p className="text-slate-400 font-semibold">{isRtl ? "✏️ تعديل الرمز المحدد" : "✏️ Edit selected"}</p>

          <StudioColorPicker
            label={isRtl ? "🎨 لون الرمز" : "🎨 Symbol Color"}
            value={selected.textColor || "#FFFFFF"}
            onChange={(v) => update("textColor", v)}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "حجم الخط" : "Font Size"}</label>
              <input
                type="number"
                value={selected.fontSize || 48}
                onChange={(e) => update("fontSize", parseInt(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "العرض%" : "Width%"}</label>
              <input
                type="number"
                value={Math.round(selected.width || 8)}
                onChange={(e) => update("width", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">X%</label>
              <input
                type="number"
                value={Math.round(selected.x || 0)}
                onChange={(e) => update("x", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Y%</label>
              <input
                type="number"
                value={Math.round(selected.y || 0)}
                onChange={(e) => update("y", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "شفافية" : "Opacity"}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selected.opacity ?? 1}
              onChange={(e) => update("opacity", parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "دوران" : "Rotation"}</label>
            <input
              type="number"
              value={selected.rotation || 0}
              onChange={(e) => update("rotation", parseInt(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}