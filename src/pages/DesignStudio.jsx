import React, { useState, useEffect } from "react";
import SizeSelector from "@/components/studio/SizeSelector";
import StudioEditor from "@/components/studio/StudioEditor";

function parseJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return fallback; } }
  return val;
}

export default function DesignStudio({ language: propLanguage, onLanguageChange }) {
  const [language, setLanguage] = useState(() => propLanguage || localStorage.getItem("appLanguage") || "ar");

  React.useEffect(() => { if (propLanguage) setLanguage(propLanguage); }, [propLanguage]);

  // Check if we should load a saved design from sessionStorage
  const savedDesignStr = sessionStorage.getItem("studio_load_design");
  const savedDesign = savedDesignStr ? (() => { try { return JSON.parse(savedDesignStr); } catch { return null; } })() : null;
  
  // Check if we're editing media (image/video)
  const mediaToEditStr = sessionStorage.getItem("mediaToEdit");
  const editingMedia = mediaToEditStr ? (() => { try { return JSON.parse(mediaToEditStr); } catch { return null; } })() : null;
  const isNewDesign = new URLSearchParams(window.location.search).get("new") === "1";

  // If opening a saved design, go straight to editor
  const initialView = (savedDesign && !isNewDesign) ? "editor" : (editingMedia ? "editor" : "sizeSelector");
  const initialSize = savedDesign ? parseJson(savedDesign.size, null) : null;

  const [view, setView] = useState(initialView);
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [loadedDesign, setLoadedDesign] = useState(savedDesign && !isNewDesign ? savedDesign : null);
  const [mediaToEdit, setMediaToEdit] = useState(editingMedia || null);

  // Clear sessionStorage after reading
  useEffect(() => {
    sessionStorage.removeItem("studio_load_design");
    sessionStorage.removeItem("mediaToEdit");
  }, []);

  const handleSelectSize = (size) => {
    setSelectedSize(size);
    setView("editor");
  };

  const handleBack = () => {
    setLoadedDesign(null);
    setSelectedSize(null);
    setView("sizeSelector");
  };

  if (view === "sizeSelector") {
    return (
      <SizeSelector
        onSelect={handleSelectSize}
        language={language}
        setLanguage={setLanguage}
      />
    );
  }

  return (
    <StudioEditor
      size={selectedSize}
      language={language}
      onBack={handleBack}
      onChangeSize={setSelectedSize}
      loadedDesign={loadedDesign}
      mediaToEdit={mediaToEdit}
    />
  );
}