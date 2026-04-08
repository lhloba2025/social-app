import React, { useState, useRef, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Download, Sparkles, Copy, Plus, ChevronDown, Save, Loader2, LayoutGrid, Undo2, Redo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localApi, uploadFile } from "@/api/localClient";
import StudioCanvas from "./StudioCanvas";
import TextPanel from "./panels/TextPanel";
import ShapesPanel from "./panels/ShapesPanel";
import ImagesPanel from "./panels/ImagesPanel";
import LogoLibraryPanel from "./panels/LogoLibraryPanel";
import BackgroundPanel from "./panels/BackgroundPanel";
import AIPanel from "./panels/AIPanel";
import IconsPanel from "./panels/IconsPanel.jsx";
import SymbolsPanel from "./panels/SymbolsPanel";
import HandDrawnPanel from "./panels/HandDrawnPanel";
import LayersPanel from "./panels/LayersPanel";
import CustomColorPicker from "./CustomColorPicker";
import AlignmentTools from "./AlignmentTools";
import { SIZES } from "./sizes";
import SizeSelector from "./SizeSelector";
import ShareModal from "./ShareModal";

const TABS = [
  { id: "text", labelAr: "نصوص", labelEn: "Text" },
  { id: "shapes", labelAr: "أشكال", labelEn: "Shapes" },
  { id: "icons", labelAr: "أيقونات", labelEn: "Icons" },
  { id: "symbols", labelAr: "رموز", labelEn: "Symbols" },
  { id: "logo", labelAr: "لوقو", labelEn: "Logo" },
  { id: "images", labelAr: "صور", labelEn: "Images" },
  { id: "bg", labelAr: "خلفية", labelEn: "BG" },
  { id: "ai", labelAr: "ذكاء", labelEn: "AI" },
  { id: "colors", labelAr: "ألوان", labelEn: "Colors" },
  { id: "size", labelAr: "مقاس", labelEn: "Size" },
  { id: "draw", labelAr: "رسم", labelEn: "Draw" },
  { id: "layers", labelAr: "طبقات", labelEn: "Layers" },
];

function genId() { return Math.random().toString(36).slice(2, 9); }

async function recolorToDataUrl(url, hexColor) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { data[i] = r; data[i + 1] = g; data[i + 2] = b; }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

const defaultText = () => ({
  id: genId(), text: "نص جديد", x: 50, y: 50,
  fontSize: 40, fontFamily: "Tajawal", color: "#ffffff",
  bold: false, italic: false, align: "center", shadow: false,
  opacity: 1, visible: true, bgColor: "", lineHeight: 1.4,
  rotation: 0, blur: 0, brightness: 100,
});

const defaultShape = (type) => ({
  id: genId(), shapeType: type, x: 20, y: 20, width: 25, height: 20,
  fillColor: "#8b5cf6", borderColor: "#ffffff", borderWidth: 0,
  opacity: 1, visible: true, rotation: 0, borderRadius: 0,
});

const defaultImage = (url, isSvg, svgContent) => ({
  id: genId(), url, x: 20, y: 20, width: 30, height: 30,
  opacity: 1, visible: true, rotation: 0, borderRadius: 0,
  blur: 0, dropShadow: false, isSvg, svgContent, svgColor: null,
  phoneFrame: false, phoneFrameColor: "#1e293b",
});

const DRAFT_KEY = "studio_draft";

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || null; } catch { return null; }
}

export default function StudioEditor({ size, language, onBack, onChangeSize, loadedDesign, mediaToEdit }) {
  const isRtl = language === "ar";
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("text");

  const draft = !loadedDesign ? loadDraft() : null;

  const [textLayers, setTextLayers] = useState(draft?.textLayers || []);
  const [shapes, setShapes] = useState(draft?.shapes || []);
  const [images, setImages] = useState(draft?.images || []);
  const imagesRef = React.useRef(images);
  // Keep imagesRef always in sync with images state
  useEffect(() => { imagesRef.current = images; }, [images]);
  const [logos, setLogos] = useState(draft?.logos || []);
  const [groups, setGroups] = useState(draft?.groups || []);
  const [bg, setBg] = useState(draft?.bg || { mode: "color", color: "#1e293b", gradientAngle: 135, gradientStops: null, imageUrl: null, imageOpacity: 1 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [multiSelected, setMultiSelected] = useState([]);
  const [scale, setScale] = useState(1);

  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [exportedImageUrl, setExportedImageUrl] = useState(null);
  const [designName, setDesignName] = useState(loadedDesign?.name || "");
  const qc = useQueryClient();
  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const canvasWrapperRef = useRef(null);

  // Undo/Redo history
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  // skipCount: how many upcoming useEffect triggers to skip (set before setState calls)
  const skipCountRef = useRef(0);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
    // We will trigger 6 state updates (textLayers, shapes, images, logos, groups, bg)
    // each triggers the useEffect once, so skip 6 saves
    skipCountRef.current = 6;
    setTextLayers(snap.textLayers);
    setShapes(snap.shapes);
    setImages(snap.images);
    imagesRef.current = snap.images;
    setLogos(snap.logos);
    setGroups(snap.groups);
    setBg(snap.bg);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];
    skipCountRef.current = 6;
    setTextLayers(snap.textLayers);
    setShapes(snap.shapes);
    setImages(snap.images);
    imagesRef.current = snap.images;
    setLogos(snap.logos);
    setGroups(snap.groups);
    setBg(snap.bg);
  }, []);

  useEffect(() => {
    if (!canvasWrapperRef.current || !size) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / size.width);
    });
    ro.observe(canvasWrapperRef.current);
    return () => ro.disconnect();
  }, [size?.width]);

  // Load groups when design is loaded
  useEffect(() => {
    if (loadedDesign?.groups) {
      try {
        const parsedGroups = typeof loadedDesign.groups === "string" 
          ? JSON.parse(loadedDesign.groups) 
          : loadedDesign.groups;
        setGroups(parsedGroups || []);
      } catch {
        setGroups([]);
      }
    }
  }, [loadedDesign?.id]);

  // Push history snapshot on every state change (debounced to avoid rapid saves during drag)
  const historyTimerRef = useRef(null);
  useEffect(() => {
    // If we're in the middle of an undo/redo restore, skip these triggers
    if (skipCountRef.current > 0) {
      skipCountRef.current -= 1;
      return;
    }
    // Debounce: wait 300ms after last change before saving snapshot
    clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      const snap = {
        textLayers: JSON.parse(JSON.stringify(textLayers)),
        shapes: JSON.parse(JSON.stringify(shapes)),
        images: JSON.parse(JSON.stringify(images)),
        logos: JSON.parse(JSON.stringify(logos)),
        groups: JSON.parse(JSON.stringify(groups)),
        bg: JSON.parse(JSON.stringify(bg)),
      };
      const history = historyRef.current;
      const index = historyIndexRef.current;
      // Don't push if identical to current
      if (index >= 0) {
        const last = history[index];
        if (JSON.stringify(last) === JSON.stringify(snap)) return;
      }
      history.splice(index + 1);
      history.push(snap);
      if (history.length > 100) history.shift();
      historyIndexRef.current = history.length - 1;
    }, 300);
    return () => clearTimeout(historyTimerRef.current);
  }, [textLayers, shapes, images, logos, groups, bg]);

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo), Ctrl+Shift+D (duplicate)
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z" && !isEditing) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z")) && !isEditing) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        if (!selectedId || !selectedType) return;
        if (selectedType === "shape") duplicateShape(selectedId);
        else if (selectedType === "image") duplicateImage(selectedId);
        else if (selectedType === "logo") duplicateLogo(selectedId);
        else if (selectedType === "text") duplicateText(selectedId);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [selectedId, selectedType, handleUndo, handleRedo]);

  // Auto-save draft to localStorage on every change
  useEffect(() => {
    if (loadedDesign) return; // don't overwrite draft when editing saved design
    const draft = { textLayers, shapes, images, logos, bg, groups };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [textLayers, shapes, images, logos, bg, groups]);

  // Load design data when opening saved design
  useEffect(() => {
   if (loadedDesign) {
     const parse = (val, fallback) => {
       if (!val) return fallback;
       if (typeof val === "string") { try { return JSON.parse(val); } catch { return fallback; } }
       return val;
     };
     setTextLayers(parse(loadedDesign.textLayers, []));
     setShapes(parse(loadedDesign.shapes, []));
     const loadedImages = parse(loadedDesign.images, []);
     setImages(loadedImages);
     imagesRef.current = loadedImages;

     // Load logos - restore svgContent from Logo library if missing
     const loadedLogos = parse(loadedDesign.logos, []);
     const restoreLogosSvg = async (logosArr) => {
       if (logosArr.every(l => !l.isSvg || l.svgContent)) {
         setLogos(logosArr);
         return;
       }
       // Fetch saved logos to get svgContent
       const savedLogos = await localApi.entities.Logo.list("-created_date", 100);
       const restored = logosArr.map((l) => {
         if (l.isSvg && !l.svgContent) {
           const match = savedLogos.find((sl) => sl.url === l.url);
           if (match?.svgContent) return { ...l, svgContent: match.svgContent };
         }
         return l;
       });
       setLogos(restored);
     };
     restoreLogosSvg(loadedLogos);

     const parsedBg = parse(loadedDesign.bg, null);
     if (parsedBg) setBg(parsedBg);
     setDesignName(loadedDesign.name || "");
   }
  }, [loadedDesign?.id]);

  // Load media to edit (image only - video goes to separate page)
  useEffect(() => {
    if (mediaToEdit?.url && mediaToEdit.type !== "video") {
      const img = defaultImage(mediaToEdit.url, false, null);
      setImages(p => { const next = [...p, img]; imagesRef.current = next; return next; });
      setSelectedId(img.id);
      setSelectedType("image");
      setActiveTab("images");
    }
  }, [mediaToEdit]);

  const captureThumbnail = async () => {
    if (!canvasRef.current) return null;
    try {
      const originalLogos = logos;

      if (logos.some(l => l.logoColor && !l.isSvg)) {
        const recoloredLogos = await Promise.all(
          logos.map(async (logo) => {
            if (logo.logoColor && !logo.isSvg) {
              const dataUrl = await recolorToDataUrl(logo.url, logo.logoColor);
              return { ...logo, _exportUrl: dataUrl };
            }
            return logo;
          })
        );
        await new Promise(resolve => {
          flushSync(() => setLogos(recoloredLogos));
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
      }

      await new Promise(resolve => {
        flushSync(() => setExporting(true));
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const element = canvasWrapRef.current;
      const rect = element.getBoundingClientRect();
      const clientW = rect.width;
      const clientH = rect.height;
      const exportScale = size.width / clientW;

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: exportScale,
        backgroundColor: null,
        logging: false,
        width: clientW,
        height: clientH,
        x: 0,
        y: 0,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });

      setLogos(originalLogos);
      setExporting(false);

      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { resolve(null); return; }
          const file = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
          const { file_url } = await uploadFile({ file });
          resolve(file_url);
        }, "image/jpeg", 0.85);
      });
    } catch (e) {
      console.error("Thumbnail capture failed:", e);
      setExporting(false);
      return null;
    }
  };

  const handleSave = async (forceNew = false) => {
    setSaving(true);
    try {
      const MAX_SVG = 50000;
      const cleanArr = (arr) => arr.map(({ _exportUrl, svgContent, ...rest }) => ({
        ...rest,
        ...(svgContent && svgContent.length <= MAX_SVG ? { svgContent } : {}),
      }));

      const thumbnailUrl = await captureThumbnail();

      const data = {
        name: designName || "تصميم بدون اسم",
        size: JSON.stringify(size),
        textLayers: JSON.stringify(textLayers),
        shapes: JSON.stringify(cleanArr(shapes)),
        images: JSON.stringify(cleanArr(images)),
        logos: JSON.stringify(cleanArr(logos)),
        groups: JSON.stringify(groups),
        bg: JSON.stringify(bg),
        ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
      };

      const isSameName = loadedDesign?.name === (designName || "تصميم بدون اسم");
      const shouldUpdate = loadedDesign?.id && (isSameName || forceNew === "update");

      if (shouldUpdate) {
        await localApi.entities.Design.update(loadedDesign.id, data);
      } else {
        await localApi.entities.Design.create(data);
      }

      qc.invalidateQueries({ queryKey: ["designs"] });
      localStorage.removeItem(DRAFT_KEY);
      setShowSaveModal(false);
      setShowOverwriteConfirm(false);
    } catch (e) {
      console.error("Save failed:", e);
      alert(isRtl ? "فشل الحفظ: " + e.message : "Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!loadedDesign?.id) {
      handleSave();
      return;
    }
    const isSameName = loadedDesign.name === (designName || "تصميم بدون اسم");
    if (isSameName) {
      setShowOverwriteConfirm(true);
    } else {
      handleSave();
    }
  };

  const handleSelectWithTabSwitch = useCallback((id, type, e) => {
    setSelectedId(id);
    setSelectedType(type);
    setMultiSelected([]);

    if (type === "text") setActiveTab("text");
    else if (type === "shape") setActiveTab("shapes");
    else if (type === "logo") setActiveTab("logo");
    else if (type === "image") {
      const img = imagesRef.current.find(i => i.id === id);
      if (img?.isSymbol) {
        setActiveTab("symbols");
      } else if (img?.isLucideIcon || img?.isText || img?.isSocialIcon) {
        setActiveTab("icons");
      } else if (img?.isHandDrawn) {
        setActiveTab("draw");
      } else {
        setActiveTab("images");
      }
    }
  }, []);

  const handleSelect = useCallback((id, type, e) => {
    // Handle multi-selection with Shift key
    if (e?.shiftKey) {
      if (multiSelected.find(el => el.id === id && el.type === type)) {
        setMultiSelected(multiSelected.filter(el => !(el.id === id && el.type === type)));
      } else {
        setMultiSelected([...multiSelected, { id, type }]);
      }
      return;
    }

    setSelectedId(id);
    setSelectedType(type);
    setMultiSelected([]);
  }, [multiSelected]);

  // Text ops
  const addText = () => { const t = defaultText(); setTextLayers(p => [...p, t]); setSelectedId(t.id); setSelectedType("text"); };
  const updateText = (id, data) => setTextLayers(p => p.map(l => l.id === id ? { ...l, ...data } : l));
  const deleteText = (id) => setTextLayers(p => p.filter(l => l.id !== id));
  const duplicateText = (id) => setTextLayers(p => { const l = p.find(t => t.id === id); if (!l) return p; return [...p, { ...l, id: genId(), x: l.x + 2, y: l.y + 2 }]; });

  // Shape ops
  const addShape = (type) => { const s = defaultShape(type); setShapes(p => [...p, s]); setSelectedId(s.id); setSelectedType("shape"); };
  const updateShape = (id, data) => setShapes(p => p.map(s => s.id === id ? { ...s, ...data } : s));
  const deleteShape = (id) => setShapes(p => p.filter(s => s.id !== id));
  const duplicateShape = (id) => setShapes(p => { const s = p.find(sh => sh.id === id); if (!s) return p; return [...p, { ...s, id: genId(), x: s.x + 2, y: s.y + 2 }]; });

  // Image ops
  const addImage = (data) => { const img = { ...defaultImage(data.url, data.isSvg, data.svgContent), ...data, id: undefined }; img.id = img.id || Math.random().toString(36).slice(2, 9); setImages(p => { const next = [...p, img]; imagesRef.current = next; return next; }); setSelectedId(img.id); setSelectedType("image"); if (data.isSymbol) setActiveTab("symbols"); else if (data.isLucideIcon || data.isText) setActiveTab("icons"); else setActiveTab("images"); };
  const updateImage = (id, data) => setImages(p => { const next = p.map(i => i.id === id ? { ...i, ...data } : i); imagesRef.current = next; return next; });
  const deleteImage = (id) => setImages(p => p.filter(i => i.id !== id));
  const duplicateImage = (id) => setImages(p => { const img = p.find(i => i.id === id); if (!img) return p; return [...p, { ...img, id: genId(), x: img.x + 2, y: img.y + 2 }]; });

  // Logo ops
  const addLogo = (data) => { const logo = defaultImage(data.url, data.isSvg, data.svgContent); setLogos(p => [...p, logo]); setSelectedId(logo.id); setSelectedType("logo"); };
  const updateLogo = (id, data) => setLogos(p => p.map(l => l.id === id ? { ...l, ...data } : l));
  const deleteLogo = (id) => setLogos(p => p.filter(l => l.id !== id));
  const duplicateLogo = (id) => setLogos(p => { const l = p.find(lg => lg.id === id); if (!l) return p; return [...p, { ...l, id: genId(), x: l.x + 2, y: l.y + 2 }]; });

  // Reorder ops
  const reorderText = (newArr) => setTextLayers(newArr);
  const reorderShapes = (newArr) => setShapes(newArr);
  const reorderImages = (newArr) => setImages(newArr);
  const reorderLogos = (newArr) => setLogos(newArr);

  // Group ops
  const groupElements = () => {
    if (multiSelected.length < 2) return;
    
    // Calculate center position of selected elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    multiSelected.forEach(({ id, type }) => {
      let el = null;
      if (type === "text") el = textLayers.find(l => l.id === id);
      else if (type === "shape") el = shapes.find(s => s.id === id);
      else if (type === "image") el = images.find(i => i.id === id);
      else if (type === "logo") el = logos.find(l => l.id === id);
      if (el) {
        minX = Math.min(minX, el.x || 0);
        minY = Math.min(minY, el.y || 0);
        maxX = Math.max(maxX, (el.x || 0) + (el.width || 20));
        maxY = Math.max(maxY, (el.y || 0) + (el.height || 15));
      }
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const groupId = genId();
    const newGroup = {
      id: groupId,
      elements: multiSelected.map(({ id, type }) => ({ elemId: id, elemType: type })),
      x: centerX,
      y: centerY,
      rotation: 0,
    };
    setGroups(p => [...p, newGroup]);
    setSelectedId(groupId);
    setSelectedType("group");
    setMultiSelected([]);
  };

  const ungroupElements = (groupId) => {
    setGroups(p => p.filter(g => g.id !== groupId));
    setSelectedId(null);
    setSelectedType(null);
  };

  const moveGroupElements = (groupId, deltaX, deltaY) => {
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    const newGroups = [...groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      x: (newGroups[groupIndex].x || 50) + deltaX,
      y: (newGroups[groupIndex].y || 50) + deltaY,
    };
    setGroups(newGroups);
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;

    const originalLogos = logos;

    if (logos.some(l => l.logoColor && !l.isSvg)) {
      const recoloredLogos = await Promise.all(logos.map(async (logo) => {
        if (logo.logoColor && !logo.isSvg) {
          const dataUrl = await recolorToDataUrl(logo.url, logo.logoColor);
          return { ...logo, _exportUrl: dataUrl };
        }
        return logo;
      }));
      await new Promise(resolve => {
        flushSync(() => setLogos(recoloredLogos));
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    }

    await new Promise(resolve => {
      flushSync(() => setExporting(true));
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const element = canvasWrapRef.current;
    const rect = element.getBoundingClientRect();
    const clientW = rect.width;
    const clientH = rect.height;
    const exportScale = size.width / clientW;

    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      scale: exportScale,
      backgroundColor: null,
      logging: false,
      width: clientW,
      height: clientH,
      x: 0,
      y: 0,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });

    setLogos(originalLogos);

    const dataUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.download = `design-${size.id || "custom"}.png`;
    link.href = dataUrl;
    link.click();

    setExportedImageUrl(dataUrl);
    setExporting(false);
    setShowShareModal(true);
  };

  const handleDownloadExported = () => {
    if (!exportedImageUrl) return;
    const link = document.createElement("a");
    link.download = `design-${size.id || "custom"}.png`;
    link.href = exportedImageUrl;
    link.click();
  };

  const handleCopyToSize = (targetSize) => {
    const oldRatio = size.height / size.width;
    const newRatio = targetSize.height / targetSize.width;
    const scaleX = targetSize.width / size.width;
    const scaleY = targetSize.height / size.height;

    // Adjust position: scale x and y proportionally to the new canvas size
    const adjustX = (x) => Math.max(1, Math.min(95, x * (scaleX / scaleY)));
    const adjustY = (y) => Math.max(1, Math.min(95, y * (oldRatio / newRatio)));

    setTextLayers(p => p.map(l => ({
      ...l,
      id: genId(),
      x: adjustX(l.x),
      y: adjustY(l.y),
      fontSize: Math.round(l.fontSize * Math.min(scaleX, scaleY)),
    })));

    setShapes(p => p.map(s => ({
      ...s,
      id: genId(),
      x: adjustX(s.x),
      y: adjustY(s.y),
      height: Math.min(s.height * (oldRatio / newRatio), 90),
    })));

    setImages(p => {
      const next = p.map(i => ({
        ...i,
        id: genId(),
        x: adjustX(i.x),
        y: adjustY(i.y),
      }));
      imagesRef.current = next;
      return next;
    });

    setLogos(p => p.map(l => ({
      ...l,
      id: genId(),
      x: adjustX(l.x),
      y: adjustY(l.y),
    })));

    onChangeSize(targetSize);
    setShowCopyModal(false);
  };

  const handleAiAddBg = (url) => { setBg(prev => ({ ...prev, mode: "image", imageUrl: url })); setActiveTab("bg"); };
  const handleAiAddImage = (url) => { addImage({ url, isSvg: false, svgContent: null }); setActiveTab("images"); };

  const getMultiSelectedElements = () => {
    return multiSelected.map(({ id, type }) => {
      let element = null;
      if (type === "text") element = textLayers.find(l => l.id === id);
      else if (type === "shape") element = shapes.find(s => s.id === id);
      else if (type === "image") element = images.find(i => i.id === id);
      else if (type === "logo") element = logos.find(l => l.id === id);
      return element ? { ...element, id, type } : null;
    }).filter(Boolean);
  };

  const handleAlignElement = (id, type, updates) => {
    if (type === "text") updateText(id, updates);
    else if (type === "shape") updateShape(id, updates);
    else if (type === "image") updateImage(id, updates);
    else if (type === "logo") updateLogo(id, updates);
  };

  if (!size) {
    return <SizeSelector language={language} setLanguage={() => {}} onSelect={(s) => { onChangeSize(s); setShowSizeSelector(false); }} />;
  }

  if (showSizeSelector) {
    return <SizeSelector language={language} setLanguage={() => {}} onSelect={(s) => { onChangeSize(s); setShowSizeSelector(false); }} />;
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <button onClick={() => navigate("/DesignLibraryPage")} title={isRtl ? "مكتبة التصاميم" : "Design Library"} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-700 transition text-slate-300 hover:text-white">
          <LayoutGrid className="w-4 h-4" />
          <span className="text-xs font-semibold hidden sm:block">{isRtl ? "المكتبة" : "Library"}</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm hidden sm:block">{isRtl ? "منشئ التصاميم" : "Design Studio"}</span>
        </div>

        <button
          onClick={() => setShowSizeSelector(true)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs transition"
        >
          {isRtl ? size.nameAr : size.nameEn}
          <span className="text-slate-400">{size.width}×{size.height}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        <div className="flex-1" />

        {/* Undo / Redo */}
        <button
          onClick={handleUndo}
          disabled={historyIndexRef.current <= 0}
          title={isRtl ? "تراجع (Ctrl+Z)" : "Undo (Ctrl+Z)"}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition disabled:opacity-30"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleRedo}
          disabled={historyIndexRef.current >= historyRef.current.length - 1}
          title={isRtl ? "إعادة (Ctrl+Y)" : "Redo (Ctrl+Y)"}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition disabled:opacity-30"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowCopyModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs transition"
        >
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden sm:block">{isRtl ? "نسخ لمقاس" : "Copy to Size"}</span>
        </button>

        <button
          onClick={() => { localStorage.removeItem(DRAFT_KEY); setTextLayers([]); setShapes([]); setImages([]); setLogos([]); setGroups([]); setBg({ mode: "color", color: "#1e293b" }); onBack(); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:block">{isRtl ? "جديد" : "New"}</span>
        </button>

        <button
          onClick={() => setShowSaveModal(true)}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-xs font-semibold transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span className="hidden sm:block">{isRtl ? "حفظ" : "Save"}</span>
        </button>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold transition disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? (isRtl ? "جاري..." : "Exporting...") : "PNG"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-64 flex-shrink-0 bg-slate-800 border-e border-slate-700 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex flex-wrap gap-0.5 p-2 border-b border-slate-700">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-1 rounded text-xs font-semibold transition ${
                  activeTab === tab.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {isRtl ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Panel content - keep all mounted to preserve contentEditable state */}
          <div className="flex-1 overflow-y-auto p-3">
            <div style={{ display: activeTab === "text" ? "block" : "none" }}>
              <TextPanel
                layers={textLayers}
                selectedId={selectedType === "text" ? selectedId : null}
                onSelect={(id) => handleSelectWithTabSwitch(id, "text")}
                onAdd={addText}
                onUpdate={updateText}
                onDelete={deleteText}
                onDuplicate={duplicateText}
                language={language}
              />
            </div>
            <div style={{ display: activeTab === "icons" ? "block" : "none" }}>
              <IconsPanel
                onAddIcon={addImage}
                selectedId={selectedType === "image" ? selectedId : null}
                onSelect={handleSelectWithTabSwitch}
                onDelete={deleteImage}
                onDuplicate={duplicateImage}
                images={images}
                onUpdate={updateImage}
                language={language}
              />
            </div>
            <div style={{ display: activeTab === "symbols" ? "block" : "none" }}>
              <SymbolsPanel
                onAdd={addImage}
                selectedId={selectedType === "image" ? selectedId : null}
                onSelect={handleSelectWithTabSwitch}
                onDelete={deleteImage}
                onDuplicate={duplicateImage}
                symbols={images}
                onUpdate={updateImage}
                language={language}
              />
            </div>
            <div style={{ display: activeTab === "shapes" ? "block" : "none" }}>
              <ShapesPanel
                shapes={shapes}
                selectedId={selectedType === "shape" ? selectedId : null}
                onSelect={(id) => handleSelectWithTabSwitch(id, "shape")}
                onAdd={addShape}
                onUpdate={updateShape}
                onDelete={deleteShape}
                onDuplicate={duplicateShape}
                onReorder={reorderShapes}
                language={language}
              />
            </div>
            <div style={{ display: activeTab === "logo" ? "block" : "none" }}>
              <LogoLibraryPanel
                logos={logos}
                selectedId={selectedType === "logo" ? selectedId : null}
                onSelect={(id) => handleSelectWithTabSwitch(id, "logo")}
                onAdd={addLogo}
                onUpdate={updateLogo}
                onDelete={deleteLogo}
                language={language}
              />
            </div>
            <div style={{ display: activeTab === "images" ? "block" : "none" }}>
              <ImagesPanel
                images={images.filter(i => !i.isLucideIcon && !i.isSocialIcon && !i.isHandDrawn && !i.isSymbol && !i.isText)}
                selectedId={selectedType === "image" && images.find(i => i.id === selectedId && !i.isLucideIcon && !i.isSocialIcon && !i.isHandDrawn && !i.isSymbol && !i.isText) ? selectedId : null}
                onSelect={(id) => handleSelectWithTabSwitch(id, "image")}
                onAdd={addImage}
                onUpdate={updateImage}
                onDelete={deleteImage}
                onDuplicate={duplicateImage}
                language={language}
                isLogo={false}
              />
            </div>

            <div style={{ display: activeTab === "bg" ? "block" : "none" }}>
              <BackgroundPanel bg={bg} onChange={setBg} language={language} />
            </div>
            <div style={{ display: activeTab === "ai" ? "block" : "none" }}>
              <AIPanel
                language={language}
                onAddAsBackground={handleAiAddBg}
                onAddAsImage={handleAiAddImage}
              />
            </div>
            <div style={{ display: activeTab === "draw" ? "block" : "none" }}>
              <HandDrawnPanel
                onAdd={addImage}
                selectedId={selectedType === "image" ? selectedId : null}
                onSelect={handleSelect}
                onDelete={deleteImage}
                onDuplicate={duplicateImage}
                drawings={images}
                onUpdate={updateImage}
                language={language}
              />
            </div>
            <div style={{ display: activeTab === "layers" ? "block" : "none" }}>
              <LayersPanel
                textLayers={textLayers}
                shapes={shapes}
                images={images}
                logos={logos}
                selectedId={selectedId}
                selectedType={selectedType}
                multiSelected={multiSelected}
                onSelect={(id, type) => handleSelect(id, type, { shiftKey: false })}
                onMultiSelect={(id, type, e) => {
                  if (e.shiftKey || (e.target?.type === "checkbox")) {
                    if (multiSelected.find(el => el.id === id && el.type === type)) {
                      setMultiSelected(multiSelected.filter(el => !(el.id === id && el.type === type)));
                    } else {
                      setMultiSelected([...multiSelected, { id, type }]);
                    }
                  }
                }}
                onHover={(id, type) => {
                  if (id && type) {
                    setSelectedId(id);
                    setSelectedType(type);
                  }
                }}
                onUpdateText={updateText}
                onUpdateShape={updateShape}
                onUpdateImage={updateImage}
                onUpdateLogo={updateLogo}
                onReorderText={reorderText}
                onReorderShape={reorderShapes}
                onReorderImage={reorderImages}
                onReorderLogo={reorderLogos}
                language={language}
              />
              <div className="mt-4 pt-4 border-t border-slate-700">
                <AlignmentTools
                  selectedElements={getMultiSelectedElements()}
                  onAlign={handleAlignElement}
                  language={language}
                  multiSelectedCount={multiSelected.length}
                  onGroup={groupElements}
                  selectedGroupId={selectedType === "group" ? selectedId : null}
                  onUngroup={ungroupElements}
                />
              </div>
            </div>
            <div style={{ display: activeTab === "colors" ? "block" : "none" }}>
              <CustomColorPicker
                value="#ffffff"
                onChange={() => {}}
                language={language}
              />
            </div>
            <div style={{ display: activeTab === "size" ? "block" : "none" }}>
              <div className="space-y-2">
                <p className="text-slate-400 text-xs">{isRtl ? "المقاس الحالي" : "Current Size"}: {size.width}×{size.height}</p>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {SIZES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { onChangeSize(s); }}
                      className={`w-full text-start px-3 py-2 rounded text-xs transition ${s.id === size.id ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"}`}
                    >
                      <span className="font-semibold">{isRtl ? s.nameAr : s.nameEn}</span>
                      <span className="text-slate-400 ms-2">{s.width}×{s.height}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-6">
          <div
            ref={canvasWrapperRef}
            style={{
              width: size.width > size.height ? "min(100%, 800px)" : "min(60%, 500px)",
              maxWidth: "100%",
            }}
          >
            <StudioCanvas
              canvasRef={canvasRef}
              containerRef={canvasWrapRef}
              size={size}
              bg={bg}
              shapes={shapes}
              images={images}
              logos={logos}
              textLayers={textLayers}
              selectedId={selectedId}
              selectedType={selectedType}
              onSelect={handleSelect}
              onUpdateShape={updateShape}
              onUpdateImage={updateImage}
              onUpdateLogo={updateLogo}
              onUpdateText={updateText}
              scale={scale}
              language={language}
              isExporting={exporting}
              groups={groups}
              onMoveGroup={moveGroupElements}
            />
          </div>
        </div>
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowSaveModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{isRtl ? "حفظ التصميم" : "Save Design"}</h3>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder={isRtl ? "اسم التصميم..." : "Design name..."}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white mb-4 outline-none focus:border-indigo-500"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm transition">
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={handleSaveClick} disabled={saving} className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRtl ? "حفظ" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite confirm modal */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowOverwriteConfirm(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">{isRtl ? "تأكيد الاستبدال" : "Confirm Overwrite"}</h3>
            <p className="text-slate-400 text-sm mb-5">
              {isRtl
                ? `سيتم استبدال التصميم "${loadedDesign?.name}" بالتصميم الحالي. هل أنت متأكد؟`
                : `This will overwrite "${loadedDesign?.name}". Are you sure?`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowOverwriteConfirm(false)} className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm transition">
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={() => handleSave("update")} disabled={saving} className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRtl ? "استبدال" : "Overwrite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          isRtl={isRtl}
          imageDataUrl={exportedImageUrl}
          onClose={() => setShowShareModal(false)}
          onDownload={handleDownloadExported}
        />
      )}

      {/* Copy to size modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowCopyModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{isRtl ? "نسخ لمقاس آخر" : "Copy to Another Size"}</h3>
            <div className="space-y-2">
              {SIZES.filter(s => s.id !== size.id && !s.isCustom).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleCopyToSize(s)}
                  className="w-full text-start px-3 py-2 rounded-lg bg-slate-700 hover:bg-indigo-600 transition text-sm"
                >
                  <span className="font-semibold">{isRtl ? s.nameAr : s.nameEn}</span>
                  <span className="text-slate-400 ms-2 text-xs">{s.width}×{s.height}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}