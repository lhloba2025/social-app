import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

const STORAGE_KEY = "studio_favorite_colors";

export default function CustomColorPicker({ value, onChange, language }) {
  const isRtl = language === "ar";
  const [favorites, setFavorites] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState(value || "#ffffff");

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        setFavorites([]);
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites) => {
    setFavorites(newFavorites);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
  };

  const addToFavorites = () => {
    if (inputValue && !favorites.includes(inputValue)) {
      saveFavorites([...favorites, inputValue]);
      onChange(inputValue);
    }
  };

  const removeFromFavorites = (color) => {
    saveFavorites(favorites.filter(c => c !== color));
  };

  const handleColorClick = (color) => {
    onChange(color);
    setInputValue(color);
  };

  return (
    <div className="space-y-3">
      {/* Color Input */}
      <div className="space-y-2">
        <label className="text-slate-400 block text-sm font-semibold">
          {isRtl ? "🎨 اختر لوناً" : "🎨 Pick a Color"}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2">
            <input
              type="color"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                onChange(e.target.value);
              }}
              className="w-12 h-10 cursor-pointer bg-slate-700 border-0 rounded"
            />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                onChange(e.target.value);
              }}
              placeholder="#ffffff"
              className="flex-1 bg-transparent text-white text-sm outline-none"
              maxLength="7"
            />
          </div>
          <button
            onClick={addToFavorites}
            title={isRtl ? "إضافة إلى المفضلة" : "Add to favorites"}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Favorite Colors */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          <label className="text-slate-400 block text-sm font-semibold">
            {isRtl ? "⭐ الألوان المفضلة" : "⭐ Favorite Colors"}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {favorites.map((color) => (
              <div
                key={color}
                className="group relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500 transition"
              >
                <button
                  onClick={() => handleColorClick(color)}
                  style={{ backgroundColor: color }}
                  className="w-full h-12 flex items-center justify-center hover:opacity-80 transition"
                  title={color}
                >
                  <span className="text-xs font-semibold text-white drop-shadow opacity-0 group-hover:opacity-100 transition">
                    {color}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromFavorites(color);
                  }}
                  className="absolute -top-2 -right-2 p-1 rounded bg-red-600 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition"
                  title={isRtl ? "حذف" : "Delete"}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {favorites.length === 0 && (
        <div className="text-slate-500 text-xs text-center py-4 bg-slate-700/30 rounded-lg">
          {isRtl ? "لا توجد ألوان مفضلة بعد. أضف لوناً للبدء!" : "No favorite colors yet. Add one to get started!"}
        </div>
      )}
    </div>
  );
}