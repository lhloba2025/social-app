import React, { useState, useRef, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Download, Sparkles, Copy, Plus, ChevronDown, Save, Loader2, LayoutGrid, Undo2, Redo2, Grid3x3, Ruler } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as htmlToImage from "html-to-image";
import { useQueryClient } from "@tanstack/react-query";
import { localApi, uploadFile } from "@/api/localClient";
import { generateImage } from "@/utils/imagePrompt";
import StudioCanvas from "./StudioCanvas";
import TextPanel from "./panels/TextPanel";
import ShapesPanel from "./panels/ShapesPanel";
import DecorationFinder from "./panels/DecorationFinder";
import ImagesPanel from "./panels/ImagesPanel";
import LogoLibraryPanel from "./panels/LogoLibraryPanel";
import BackgroundPanel from "./panels/BackgroundPanel";
import AIPanel from "./panels/AIPanel";
import IconsPanel from "./panels/IconsPanel.jsx";
import SocialPanel from "./panels/SocialPanel.jsx";
import OffersPanel from "./panels/OffersPanel.jsx";
import MenuPanel from "./panels/MenuPanel.jsx";
import SymbolsPanel from "./panels/SymbolsPanel";
import HandDrawnPanel from "./panels/HandDrawnPanel";
import LayersPanel from "./panels/LayersPanel";
import TemplatesPanel from "./panels/TemplatesPanel";
import BrandKitPanel from "./panels/BrandKitPanel";
import TextEffectsPanel from "./panels/TextEffectsPanel";
import FramesPanel from "./panels/FramesPanel";
import CustomColorPicker from "./CustomColorPicker";
import AlignmentTools from "./AlignmentTools";
import { SIZES } from "./sizes";
import SizeSelector from "./SizeSelector";
import ShareModal from "./ShareModal";
import { applyProfileTo, saveSocialProfile } from "@/utils/socialProfileStore";

const DECO_TYPE_IDS = new Set(["chain","rope","arc_ribbon","wave_ribbon","ring_chain","dots_line","zigzag","crescent"]);

const TABS = [
  { id: "templates", labelAr: "قوالب", labelEn: "Templates" },
  { id: "text", labelAr: "نصوص", labelEn: "Text" },
  { id: "shapes", labelAr: "أشكال", labelEn: "Shapes" },
  { id: "deco", labelAr: "زخارف", labelEn: "Deco" },
  { id: "icons", labelAr: "أيقونات", labelEn: "Icons" },
  { id: "symbols", labelAr: "رموز", labelEn: "Symbols" },
  { id: "logo", labelAr: "لوقو", labelEn: "Logo" },
  { id: "social", labelAr: "تواصل", labelEn: "Social" },
  { id: "images", labelAr: "صور", labelEn: "Images" },
  { id: "bg", labelAr: "خلفية", labelEn: "BG" },
  { id: "frames", labelAr: "إطارات", labelEn: "Frames" },
  { id: "ai", labelAr: "ذكاء", labelEn: "AI" },
  { id: "colors", labelAr: "ألوان", labelEn: "Colors" },
  { id: "size", labelAr: "مقاس", labelEn: "Size" },
  { id: "draw", labelAr: "رسم", labelEn: "Draw" },
  { id: "layers", labelAr: "طبقات", labelEn: "Layers" },
  { id: "brand", labelAr: "البراند", labelEn: "Brand" },
  { id: "effects", labelAr: "تأثيرات", labelEn: "Effects" },
  { id: "offers", labelAr: "💰 عروض وأسعار", labelEn: "💰 Offers" },
  { id: "menu", labelAr: "📋 قائمة/منيو", labelEn: "📋 Menu" },
];

// The 18 tools, organised into logical clusters so the panel reads as tidy
// groups instead of one crowded row.
const TAB_GROUPS = [
  { labelAr: "العلامة",      labelEn: "Brand",    ids: ["brand", "logo", "social", "colors"] },
  { labelAr: "وسائط",       labelEn: "Media",    ids: ["images", "bg"] },
  { labelAr: "إضافة عناصر", labelEn: "Elements", ids: ["text", "shapes", "icons", "symbols", "deco", "frames", "draw"] },
  { labelAr: "العروض والأسعار", labelEn: "Offers & Pricing", ids: ["offers", "menu"] },
  { labelAr: "ترتيب",        labelEn: "Arrange",  ids: ["layers", "effects", "size"] },
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

// Read the saved Brand kit (from the "العلامة"/Brand panel) so new elements pick
// up the brand font + colour BY DEFAULT. Handles both the studio panel shape
// ({primaryColor, primaryFont, colors}) and the image-gen kit shape
// ({mainColor, font}) since they share the same storage key.
function loadBrandDefaults() {
  try {
    const b = JSON.parse(localStorage.getItem("brand_kit_v1") || "{}");
    return {
      font: b.primaryFont || b.font || "Tajawal",
      textColor: b.primaryColor || b.mainColor || "#ffffff",
      shapeColor: b.primaryColor || b.mainColor || (Array.isArray(b.colors) && b.colors[0]) || "#8b5cf6",
    };
  } catch {
    return { font: "Tajawal", textColor: "#ffffff", shapeColor: "#8b5cf6" };
  }
}

const defaultText = () => {
  const bd = loadBrandDefaults();
  return {
    id: genId(), text: "نص جديد", x: 50, y: 50,
    fontSize: 40, fontFamily: bd.font, color: bd.textColor,
    bold: false, italic: false, align: "center", shadow: false,
    opacity: 1, visible: true, bgColor: "", lineHeight: 1.4,
    rotation: 0, blur: 0, brightness: 100,
  };
};

const defaultShape = (type, canvasAspect = 1) => {
  // Mockups need specific aspect ratios so the device looks right out of the box
  let w = 25, h = 20 * canvasAspect;
  let fill = loadBrandDefaults().shapeColor;
  if (type === "phone_mockup")    { w = 25; h = 50 * canvasAspect; }
  if (type === "tablet_mockup")   { w = 40; h = 45 * canvasAspect; }
  if (type === "laptop_mockup")   { w = 50; h = 35 * canvasAspect; }
  if (type === "browser_window")  { w = 50; h = 40 * canvasAspect; }
  if (type === "monitor_mockup")  { w = 50; h = 50 * canvasAspect; }
  if (type === "tv_mockup")       { w = 55; h = 38 * canvasAspect; }
  if (type === "watch_mockup")    { w = 25; h = 45 * canvasAspect; fill = "#ec4899"; }
  if (type === "car_side")        { w = 50; h = 30 * canvasAspect; fill = "#1e293b"; }
  if (type === "tshirt_mockup")   { w = 40; h = 45 * canvasAspect; fill = "#ffffff"; }
  if (type === "saudi_map")       { w = 50; h = (50 / 1.143) * canvasAspect; fill = "#16a34a"; }
  if (type === "saudi_regions")   { w = 60; h = (60 / 1.143) * canvasAspect; fill = "#cbd5e1"; }
  if (type === "gcc_map")         { w = 55; h = 50 * canvasAspect; fill = "#16a34a"; }
  if (type === "arabia_map")      { w = 52; h = 55 * canvasAspect; fill = "#16a34a"; }
  return {
    id: genId(), shapeType: type, x: 20, y: 20, width: w, height: h,
    fillColor: fill, borderColor: "#ffffff", borderWidth: 0,
    opacity: 1, visible: true, rotation: 0, borderRadius: 0,
  };
};

// canvasAspect = canvasWidth / canvasHeight (e.g. 0.5625 for 9:16, 1.778 for 16:9)
// height% means % of canvas height. To appear proportional, we normalise:
//   height = width * canvasAspect  → same physical size for width and height
const defaultImage = (url, isSvg, svgContent, canvasAspect = 1) => ({
  id: genId(), url, x: 20, y: 20, width: 30, height: 30 * canvasAspect,
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
  const [drawMode, setDrawMode] = useState(false);

  const draft = !loadedDesign ? loadDraft() : null;

  // If draft has multiple pages, load the active page's data as initial state
  const draftPage = (draft?.pages && draft.pages.length > 0)
    ? (draft.pages[draft.currentPageIdx || 0] || draft.pages[0])
    : null;
  const initDraft = draftPage || draft;

  const [textLayers, setTextLayers] = useState(initDraft?.textLayers || []);
  const [shapes, setShapes] = useState(initDraft?.shapes || []);
  const [images, setImages] = useState(initDraft?.images || []);
  const imagesRef = React.useRef(images);
  // Keep imagesRef always in sync with images state
  useEffect(() => { imagesRef.current = images; }, [images]);
  const [logos, setLogos] = useState(initDraft?.logos || []);
  const [groups, setGroups] = useState(initDraft?.groups || []);
  const [bg, setBg] = useState(initDraft?.bg || { mode: "color", color: "#1e293b", gradientAngle: 135, gradientStops: null, imageUrl: null, imageOpacity: 1 });
  const [frames, setFrames] = useState(initDraft?.frames || []);
  // ── Social contact box ──────────────────────────────────────────────
  // One live, editable box per design — mirrors the GreetingCardsPage
  // implementation so the panel UI (and visual output) match exactly.
  // Lives as a single state object (not an array) because a design
  // realistically only needs one contact strip.
  // Default box used when the design has no saved socialBox AND no
  // social profile in localStorage. The profile (if any) overrides
  // these defaults — see `applyProfileTo` — so a returning user starts
  // with their accounts pre-populated and doesn't re-enter handles.
  const [socialBox, setSocialBox] = useState(() => {
    const defaultBox = {
      show: false,
      x: 50,
      y: 90,
      iconSize: 7,
      spacing: 30,
      layout: "vertical",
      colorMode: "brand",
      monoColor: "#ffffff",
      textColor: "#ffffff",
      bgEnabled: false,
      bgMode: "solid",          // "solid" | "gradient"
      bgColor: "#000000",
      bgGradColor2: "#1e293b",
      bgGradAngle: 135,
      bgOpacity: 0.4,
      bgRadius: 25,
      bgPadding: 35,
      showLabels: true,
      fontFamily: "Tajawal",
      rotation: 0,
      items: [],
    };
    // Resuming an existing design — preserve whatever was last saved
    // on that draft, including an empty items[] if that was the user's
    // choice on this specific design.
    if (initDraft?.socialBox) return initDraft.socialBox;
    // Fresh design — bootstrap from the user's saved profile (if any).
    return applyProfileTo(defaultBox);
  });

  // ─── Offers / pricing block — one self-contained, draggable price list ──
  const [offers, setOffers] = useState(() => {
    if (initDraft?.offers) return initDraft.offers;
    return {
      show: false,
      title: "عروض شهر يونيو",
      subtitle: "قائمة الأسعار",
      items: [
        { service: "الخدمة الأولى", price: "350", oldPrice: "380" },
        { service: "الخدمة الثانية", price: "400", oldPrice: "480" },
        { service: "الخدمة الثالثة", price: "500", oldPrice: "550" },
      ],
      currency: "ريال",
      accent: "#b76e79",
      textColor: "#5b2333",
      rowBg: "#ffffff",
      showOld: true,
      footer: "",
      fontFamily: "Tajawal",
      fontScale: 1,
      x: 50, y: 55, width: 72, rotation: 0,
    };
  });
  const updateOffers = (patch) => setOffers((o) => ({ ...o, ...patch }));

  // Services menu (sibling of offers — a clean price list, no discounts).
  const [menu, setMenu] = useState(() => {
    if (initDraft?.menu) return initDraft.menu;
    return {
      show: false,
      lang: "ar", style: "classic", columns: 1, autoFit: true,
      title: "قائمة الخدمات", titleEn: "Our Services",
      subtitle: "", subtitleEn: "",
      sections: [
        { title: "الشعر", titleEn: "Hair", items: [
          { name: "قص شعر", nameEn: "Haircut", icon: "💇", desc: "", price: "80" },
          { name: "صبغة كاملة", nameEn: "Full color", icon: "🎨", desc: "مع الترطيب", price: "250" },
        ] },
        { title: "العناية", titleEn: "Care", items: [
          { name: "مكياج سهرة", nameEn: "Evening makeup", icon: "💄", desc: "", price: "300" },
          { name: "مساج استرخاء", nameEn: "Relax massage", icon: "💆", desc: "", price: "200" },
        ] },
      ],
      currency: "ريال",
      accent: "#7c3aed", textColor: "#1e1b3a", bgColor: "#ffffff",
      showDots: true, footer: "", footerEn: "",
      fontFamily: "Tajawal", fontScale: 1,
      x: 50, y: 50, width: 70, rotation: 0,
    };
  });
  const updateMenu = (patch) => setMenu((m) => ({ ...m, ...patch }));

  // Auto-persist the profile whenever the box changes. We exclude
  // positional fields (x/y/show) inside the store, so moving the box
  // around on this design doesn't pollute future designs. A side
  // effect: if the user empties their accounts here, they're empty
  // next time too — by design (no save = no profile).
  useEffect(() => {
    saveSocialProfile(socialBox);
  }, [socialBox]);

  // ─── Multi-Page (كاروسيل / صفحات متعددة) ─────────────────────────────────
  const pagesData = useRef(null);
  if (!pagesData.current) {
    if (draft?.pages && Array.isArray(draft.pages) && draft.pages.length > 0) {
      pagesData.current = draft.pages;
    } else {
      pagesData.current = [{
        id: genId(), textLayers: draft?.textLayers || [], shapes: draft?.shapes || [],
        images: draft?.images || [], logos: draft?.logos || [],
        groups: draft?.groups || [],
        bg: draft?.bg || { mode: "color", color: "#1e293b", gradientAngle: 135, gradientStops: null, imageUrl: null, imageOpacity: 1 },
      }];
    }
  }
  const [currentPageIdx, setCurrentPageIdx] = useState(draft?.currentPageIdx || 0);
  const [pagesCount, setPagesCount] = useState(pagesData.current.length);
  // ──────────────────────────────────────────────────────────────────────────

  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [multiSelected, setMultiSelected] = useState([]);
  const [scale, setScale] = useState(1);

  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle"); // idle | saving | saved
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, id, type }
  const [selectedRegion, setSelectedRegion] = useState(null); // active region id for multi-region map
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  // When the user arrived here from "صمّم بالمنشئ" inside Greeting Cards, show a
  // one-click button to send the current design back as the card template.
  const [greetingReturnMode] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("greetingReturn") === "1");
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [exportedImageUrl, setExportedImageUrl] = useState("");
  const [designName, setDesignName] = useState(loadedDesign?.name || "");
  // Inline AI image generation (inside the "صور" tab).
  const [aiImgPrompt, setAiImgPrompt] = useState("");
  const [aiImgBusy, setAiImgBusy] = useState(false);
  const [aiImgErr, setAiImgErr] = useState("");
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z" && !isEditing) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z")) && !isEditing) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Duplicate (Ctrl+D) — works for all selection types
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D") && !isEditing) {
        e.preventDefault();
        if (!selectedId || !selectedType) return;
        if (selectedType === "shape") duplicateShape(selectedId);
        else if (selectedType === "image") duplicateImage(selectedId);
        else if (selectedType === "logo") duplicateLogo(selectedId);
        else if (selectedType === "text") duplicateText(selectedId);
        return;
      }

      // Z-order shortcuts
      // Ctrl+] = bring forward, Ctrl+[ = send backward
      // Ctrl+Shift+] = bring to front, Ctrl+Shift+[ = send to back
      if ((e.ctrlKey || e.metaKey) && !isEditing && (e.key === "]" || e.key === "[")) {
        e.preventDefault();
        if (e.shiftKey) zOrder(e.key === "]" ? "front" : "back");
        else zOrder(e.key === "]" ? "forward" : "backward");
        return;
      }

      // Esc — clear selection
      if (e.key === "Escape" && !isEditing) {
        setSelectedId(null);
        setSelectedType(null);
        setMultiSelected([]);
        return;
      }

      // Delete / Backspace — delete selected element
      if ((e.key === "Delete" || (e.key === "Backspace" && (e.ctrlKey || e.metaKey))) && !isEditing && selectedId) {
        e.preventDefault();
        if (selectedType === "shape") deleteShape(selectedId);
        else if (selectedType === "image") deleteImage(selectedId);
        else if (selectedType === "logo") deleteLogo(selectedId);
        else if (selectedType === "text") deleteText(selectedId);
        setSelectedId(null);
        setSelectedType(null);
        return;
      }

      // Arrow keys — nudge selected element (1% normally, 5% with Shift)
      if (!isEditing && selectedId && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        let dx = 0, dy = 0;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;

        if (selectedType === "text") {
          const l = textLayers.find(t => t.id === selectedId);
          if (l) updateText(selectedId, { x: Math.max(0, Math.min(100, (l.x || 0) + dx)), y: Math.max(0, Math.min(100, (l.y || 0) + dy)) });
        } else if (selectedType === "shape") {
          const s = shapes.find(sh => sh.id === selectedId);
          if (s) updateShape(selectedId, { x: Math.max(0, Math.min(100, (s.x || 0) + dx)), y: Math.max(0, Math.min(100, (s.y || 0) + dy)) });
        } else if (selectedType === "image") {
          const i = images.find(im => im.id === selectedId);
          if (i) updateImage(selectedId, { x: Math.max(0, Math.min(100, (i.x || 0) + dx)), y: Math.max(0, Math.min(100, (i.y || 0) + dy)) });
        } else if (selectedType === "logo") {
          const l = logos.find(lg => lg.id === selectedId);
          if (l) updateLogo(selectedId, { x: Math.max(0, Math.min(100, (l.x || 0) + dx)), y: Math.max(0, Math.min(100, (l.y || 0) + dy)) });
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [selectedId, selectedType, handleUndo, handleRedo, textLayers, shapes, images, logos]);

  // Auto-save draft to localStorage on every change
  useEffect(() => {
    if (loadedDesign) return; // don't overwrite draft when editing saved design
    setAutoSaveStatus("saving");
    // Sync current page into pagesData before persisting
    const _draftExisting = pagesData.current[currentPageIdx];
    pagesData.current[currentPageIdx] = {
      id: _draftExisting?.id || genId(),
      textLayers: JSON.parse(JSON.stringify(textLayers)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      images: JSON.parse(JSON.stringify(images)),
      logos: JSON.parse(JSON.stringify(logos)),
      groups: JSON.parse(JSON.stringify(groups)),
      bg: JSON.parse(JSON.stringify(bg)),
      ...(_draftExisting?.thumbnail ? { thumbnail: _draftExisting.thumbnail } : {}),
    };
    // Strip thumbnails from pages before storing — base64 images fill up localStorage (5MB limit)
    const draftPages = pagesData.current.map(({ thumbnail, ...rest }) => rest);
    const draft = { textLayers, shapes, images, logos, bg, groups, offers, menu, pages: draftPages, currentPageIdx };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSavedAt(Date.now());
      setAutoSaveStatus("saved");
    } catch {
      // Quota exceeded — save minimal draft without pages
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ textLayers, shapes, images, logos, bg, groups, currentPageIdx }));
        setLastSavedAt(Date.now());
        setAutoSaveStatus("saved");
      } catch { setAutoSaveStatus("idle"); }
    }
  }, [textLayers, shapes, images, logos, bg, groups, offers, menu]);

  // Tick to keep "Xs ago" label fresh
  const [, setTickCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTickCount(c => c + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const formatSavedAgo = () => {
    if (!lastSavedAt) return isRtl ? "غير محفوظ" : "Not saved";
    const diff = Math.floor((Date.now() - lastSavedAt) / 1000);
    if (diff < 5) return isRtl ? "محفوظ الآن" : "Saved just now";
    if (diff < 60) return isRtl ? `محفوظ قبل ${diff} ث` : `Saved ${diff}s ago`;
    const m = Math.floor(diff / 60);
    if (m < 60) return isRtl ? `محفوظ قبل ${m} د` : `Saved ${m}m ago`;
    return isRtl ? "محفوظ" : "Saved";
  };

  // Load design data when opening saved design
  useEffect(() => {
   if (loadedDesign) {
     const parse = (val, fallback) => {
       if (!val) return fallback;
       if (typeof val === "string") { try { return JSON.parse(val); } catch { return fallback; } }
       return val;
     };

     // Helper: restore svgContent for SVG logos from the Logo library
     const restoreLogosSvg = async (logosArr, applyFn) => {
       if (logosArr.every(l => !l.isSvg || l.svgContent)) { applyFn(logosArr); return; }
       const savedLogos = await localApi.entities.Logo.list("-created_date", 100);
       const restored = logosArr.map((l) => {
         if (l.isSvg && !l.svgContent) {
           const match = savedLogos.find((sl) => sl.url === l.url);
           if (match?.svgContent) return { ...l, svgContent: match.svgContent };
         }
         return l;
       });
       applyFn(restored);
     };

     // Parse the bg field (strip legacy __pages if present)
     const parsedBg = parse(loadedDesign.bg, null);
     const { __pages: _legacyPages, ...cleanBg } = parsedBg || {};

     // Load pages from dedicated `pages` column (new format), fallback to bg.__pages (old format)
     const pagesFromCol = parse(loadedDesign.pages, null);
     const pagesFromBg = _legacyPages;
     const extractedPages = (Array.isArray(pagesFromCol) && pagesFromCol.length > 0)
       ? pagesFromCol
       : (Array.isArray(pagesFromBg) && pagesFromBg.length > 0 ? pagesFromBg : null);

     if (extractedPages && extractedPages.length > 0) {
       // Multi-page design: restore all pages, load page 0 as the active page
       pagesData.current = extractedPages.map((page) => ({
         id: page.id || genId(),
         textLayers: page.textLayers || [],
         shapes: page.shapes || [],
         images: page.images || [],
         logos: page.logos || [],
         groups: page.groups || [],
         bg: page.bg || { mode: "color", color: "#1e293b", gradientAngle: 135, gradientStops: null, imageUrl: null, imageOpacity: 1 },
         ...(page.thumbnail ? { thumbnail: page.thumbnail } : {}),
       }));
       setPagesCount(extractedPages.length);
       setCurrentPageIdx(0);
       const page0 = pagesData.current[0];
       setTextLayers(page0.textLayers);
       setShapes(page0.shapes);
       const p0Images = page0.images;
       setImages(p0Images);
       imagesRef.current = p0Images;
       setGroups(page0.groups);
       setBg(page0.bg);
       restoreLogosSvg(page0.logos, setLogos);
     } else {
       // Single-page design: load from top-level fields
       setTextLayers(parse(loadedDesign.textLayers, []));
       setShapes(parse(loadedDesign.shapes, []));
       const loadedImages = parse(loadedDesign.images, []);
       setImages(loadedImages);
       imagesRef.current = loadedImages;
       restoreLogosSvg(parse(loadedDesign.logos, []), setLogos);
       if (parsedBg) setBg(cleanBg);
     }

     setDesignName(loadedDesign.name || "");
   }
  }, [loadedDesign?.id]);

  // Load media to edit (image only - video goes to separate page)
  useEffect(() => {
    if (mediaToEdit?.url && mediaToEdit.type !== "video") {
      const img = defaultImage(mediaToEdit.url, false, null, size ? size.width / size.height : 1);
      // fullBleed: cover the whole canvas (used by the letterhead template).
      if (mediaToEdit.fullBleed) { img.x = 0; img.y = 0; img.width = 100; img.height = 100; }
      setImages(p => { const next = [...p, img]; imagesRef.current = next; return next; });
      setSelectedId(img.id);
      setSelectedType("image");
      setActiveTab("images");
    }
  }, [mediaToEdit]);

  // Capture a data-URL thumbnail of the current canvas — used for per-page preview in library
  const capturePageDataUrl = async () => {
    if (!canvasWrapRef?.current) return null;
    const originalLogos = logos;
    try {
      // Pre-render logo colors (html2canvas doesn't support CSS url() SVG filters)
      const hasLogoColors = logos.some(l => l.logoColor && !l.isSvg);
      if (hasLogoColors) {
        const recolored = await Promise.all(logos.map(async (logo) => {
          if (logo.logoColor && !logo.isSvg) {
            const dataUrl = await recolorToDataUrl(logo.url, logo.logoColor);
            return { ...logo, _exportUrl: dataUrl, logoColor: "" };
          }
          return logo;
        }));
        await new Promise(resolve => {
          flushSync(() => setLogos(recolored));
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
      }

      // Hide grid/handles/guides during capture
      await new Promise(resolve => {
        flushSync(() => setExporting(true));
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const element = canvasWrapRef.current;
      const clientW = element.offsetWidth;
      const targetW = 600;
      const captureScale = Math.min(2, targetW / clientW);
      const dataUrl = await htmlToImage.toJpeg(element, { pixelRatio: captureScale, quality: 0.82 });

      setExporting(false);
      if (hasLogoColors) setLogos(originalLogos);
      return dataUrl;
    } catch {
      setExporting(false);
      setLogos(originalLogos);
      return null;
    }
  };

  const captureThumbnail = async () => {
    if (!canvasRef.current) return null;
    const originalLogos = logos;
    try {

      if (logos.some(l => l.logoColor && !l.isSvg)) {
        const recoloredLogos = await Promise.all(
          logos.map(async (logo) => {
            if (logo.logoColor && !logo.isSvg) {
              const dataUrl = await recolorToDataUrl(logo.url, logo.logoColor);
              // Set _exportUrl so canvas uses the pre-recolored image,
              // AND clear logoColor so the CSS filter doesn't apply again (avoids double recoloring)
              return { ...logo, _exportUrl: dataUrl, logoColor: "" };
            }
            return logo;
          })
        );
        await new Promise(resolve => {
          flushSync(() => setLogos(recoloredLogos));
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
      }

      const noSelectStyle = document.createElement("style");
      noSelectStyle.id = "export-no-select";
      noSelectStyle.innerHTML = `* { -webkit-user-select: none !important; user-select: none !important; } ::selection { background: transparent !important; color: inherit !important; }`;
      document.head.appendChild(noSelectStyle);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.getSelection()?.removeAllRanges();
      await new Promise(r => setTimeout(r, 100));

      await new Promise(resolve => {
        flushSync(() => setExporting(true));
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const element = canvasWrapRef.current;
      const clientW = element.offsetWidth;
      const exportScale = size.width / clientW;

      const blob = await htmlToImage.toBlob(element, { pixelRatio: exportScale, quality: 0.85, type: "image/jpeg" });

      document.getElementById("export-no-select")?.remove();
      setLogos(originalLogos);
      setExporting(false);

      if (!blob) return null;
      const file = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
      const { file_url } = await uploadFile({ file });
      return file_url;
    } catch (e) {
      console.error("Thumbnail capture failed:", e);
      setExporting(false);
      setLogos(originalLogos);
      document.querySelectorAll('[contenteditable="false"]').forEach(el => el.setAttribute("contenteditable", "true"));
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

      // Sync current page state into pagesData before saving all pages (preserve thumbnail)
      const _saveExisting = pagesData.current[currentPageIdx];
      pagesData.current[currentPageIdx] = {
        id: _saveExisting?.id || genId(),
        textLayers: JSON.parse(JSON.stringify(textLayers)),
        shapes: JSON.parse(JSON.stringify(shapes)),
        images: JSON.parse(JSON.stringify(images)),
        logos: JSON.parse(JSON.stringify(logos)),
        groups: JSON.parse(JSON.stringify(groups)),
        bg: JSON.parse(JSON.stringify(bg)),
        ...(_saveExisting?.thumbnail ? { thumbnail: _saveExisting.thumbnail } : {}),
      };

      // Capture current page thumbnail and store it in pagesData
      const currentDataUrl = await capturePageDataUrl();
      if (currentDataUrl) {
        pagesData.current[currentPageIdx] = {
          ...pagesData.current[currentPageIdx],
          thumbnail: currentDataUrl,
        };
      }

      // Upload all available page thumbnails as files (keep bg field small)
      const pageThumbUrls = {};
      for (let i = 0; i < pagesData.current.length; i++) {
        const dataUrl = pagesData.current[i]?.thumbnail;
        if (!dataUrl) continue;
        if (dataUrl.startsWith("data:")) {
          try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], `page_${i}_thumb.jpg`, { type: "image/jpeg" });
            const { file_url } = await uploadFile({ file });
            pageThumbUrls[i] = file_url;
          } catch { /* skip */ }
        } else {
          pageThumbUrls[i] = dataUrl; // already a server URL
        }
      }

      const cleanPages = pagesData.current.map((page, i) => ({
        id: page.id,
        textLayers: cleanArr(page.textLayers || []),
        shapes: cleanArr(page.shapes || []),
        images: cleanArr(page.images || []),
        logos: cleanArr(page.logos || []),
        groups: page.groups || [],
        bg: page.bg,
        ...(pageThumbUrls[i] ? { thumbnail: pageThumbUrls[i] } : {}),
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
        bg: JSON.stringify({ ...bg, __pages: cleanPages }),
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
    else if (type === "shape") {
      const sh = shapes.find(s => s.id === id);
      setActiveTab(DECO_TYPE_IDS.has(sh?.shapeType) ? "deco" : "shapes");
    }
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
  }, [shapes]);

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

    // Switch to the correct panel tab automatically
    if (type === "text") setActiveTab("text");
    else if (type === "shape") {
      const sh = shapes.find(s => s.id === id);
      setActiveTab(DECO_TYPE_IDS.has(sh?.shapeType) ? "deco" : "shapes");
    }
    else if (type === "logo") setActiveTab("logo");
    else if (type === "image") {
      const img = imagesRef.current.find(i => i.id === id);
      if (img?.isSymbol) setActiveTab("symbols");
      else if (img?.isLucideIcon || img?.isText || img?.isSocialIcon) setActiveTab("icons");
      else if (img?.isHandDrawn) setActiveTab("draw");
      else setActiveTab("images");
    }
  }, [multiSelected, shapes]);

  // Text ops
  const addText = () => { const t = defaultText(); setTextLayers(p => [...p, t]); setSelectedId(t.id); setSelectedType("text"); };
  const updateText = (id, data) => setTextLayers(p => p.map(l => l.id === id ? { ...l, ...data } : l));
  const deleteText = (id) => setTextLayers(p => p.filter(l => l.id !== id));
  const duplicateText = (id) => setTextLayers(p => { const l = p.find(t => t.id === id); if (!l) return p; return [...p, { ...l, id: genId(), x: l.x + 2, y: l.y + 2 }]; });

  // Canvas aspect ratio helper (width / height). Normalises % heights so elements appear proportional.
  const canvasAspect = size ? size.width / size.height : 1;

  // Shape ops
  const addShape = (type) => { const s = defaultShape(type, canvasAspect); setShapes(p => [...p, s]); setSelectedId(s.id); setSelectedType("shape"); };
  const updateShape = (id, data) => setShapes(p => p.map(s => s.id === id ? { ...s, ...data } : s));
  const deleteShape = (id) => setShapes(p => p.filter(s => s.id !== id));
  const duplicateShape = (id) => setShapes(p => { const s = p.find(sh => sh.id === id); if (!s) return p; return [...p, { ...s, id: genId(), x: s.x + 2, y: s.y + 2 }]; });

  // Image ops
  const addImage = (data) => {
    const img = { ...defaultImage(data.url, data.isSvg, data.svgContent, canvasAspect), ...data, id: undefined };
    img.id = img.id || Math.random().toString(36).slice(2, 9);
    const imgId = img.id;
    setImages(p => { const next = [...p, img]; imagesRef.current = next; return next; });
    setSelectedId(imgId);
    setSelectedType("image");
    if (data.isSymbol) setActiveTab("symbols");
    else if (data.isLucideIcon || data.isText) setActiveTab("icons");
    else setActiveTab("images");

    // For real bitmap images without an explicit height, load to get natural dimensions
    // and correct the height so the image appears at its natural aspect ratio.
    const hasExplicitSize = data.width !== undefined || data.height !== undefined;
    const isSpecialType = data.isLucideIcon || data.isSocialIcon || data.isSymbol || data.isText || data.isHandDrawn || data.isSvg;
    if (!hasExplicitSize && !isSpecialType && data.url) {
      const probe = new Image();
      probe.onload = () => {
        if (probe.naturalWidth && probe.naturalHeight) {
          const naturalAspect = probe.naturalWidth / probe.naturalHeight;
          const correctedH = (img.width * canvasAspect) / naturalAspect;
          setImages(p => {
            const next = p.map(i => i.id === imgId ? { ...i, height: correctedH } : i);
            imagesRef.current = next;
            return next;
          });
        }
      };
      probe.src = data.url;
    }
  };
  const updateImage = (id, data) => setImages(p => { const next = p.map(i => i.id === id ? { ...i, ...data } : i); imagesRef.current = next; return next; });
  const deleteImage = (id) => setImages(p => p.filter(i => i.id !== id));
  const duplicateImage = (id) => setImages(p => { const img = p.find(i => i.id === id); if (!img) return p; return [...p, { ...img, id: genId(), x: img.x + 2, y: img.y + 2 }]; });

  // Logo ops
  const addLogo = (data) => {
    const logo = { ...defaultImage(data.url, data.isSvg, data.svgContent, canvasAspect), ...data, id: undefined };
    logo.id = logo.id || genId();
    setLogos(p => [...p, logo]);
    setSelectedId(logo.id);
    setSelectedType("logo");
  };
  const updateLogo = (id, data) => setLogos(p => p.map(l => l.id === id ? { ...l, ...data } : l));
  const deleteLogo = (id) => setLogos(p => p.filter(l => l.id !== id));
  const duplicateLogo = (id) => setLogos(p => { const l = p.find(lg => lg.id === id); if (!l) return p; return [...p, { ...l, id: genId(), x: l.x + 2, y: l.y + 2 }]; });

  // Reorder ops
  const reorderText = (newArr) => setTextLayers(newArr);
  const reorderShapes = (newArr) => setShapes(newArr);
  const reorderImages = (newArr) => setImages(newArr);
  const reorderLogos = (newArr) => setLogos(newArr);

  // Z-order core — reorders a specific element of a given type within its array
  const zOrderById = (id, type, action) => {
    const setter = ({ text: setTextLayers, shape: setShapes, image: setImages, logo: setLogos })[type];
    if (!setter || !id) return;
    setter(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      if (action === "front") next.push(item);
      else if (action === "back") next.unshift(item);
      else if (action === "forward") next.splice(Math.min(prev.length, idx + 1), 0, item);
      else if (action === "backward") next.splice(Math.max(0, idx - 1), 0, item);
      if (type === "image") imagesRef.current = next;
      return next;
    });
  };

  // Z-order for the current selection (used by keyboard shortcuts / context menu)
  const zOrder = (action) => {
    if (!selectedId || !selectedType) return;
    zOrderById(selectedId, selectedType, action);
  };

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

  // ─── Page management helpers ───────────────────────────────────────────────
  const saveCurrentPage = useCallback(() => {
    const existing = pagesData.current[currentPageIdx];
    pagesData.current[currentPageIdx] = {
      id: existing?.id || genId(),
      textLayers: JSON.parse(JSON.stringify(textLayers)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      images: JSON.parse(JSON.stringify(images)),
      logos: JSON.parse(JSON.stringify(logos)),
      groups: JSON.parse(JSON.stringify(groups)),
      bg: JSON.parse(JSON.stringify(bg)),
      ...(existing?.thumbnail ? { thumbnail: existing.thumbnail } : {}),
    };
  }, [currentPageIdx, textLayers, shapes, images, logos, groups, bg]);

  const loadPage = useCallback((page) => {
    skipCountRef.current = 6;
    setTextLayers(page.textLayers);
    setShapes(page.shapes);
    setImages(page.images);
    imagesRef.current = page.images;
    setLogos(page.logos);
    setGroups(page.groups);
    setBg(page.bg);
    setSelectedId(null);
    setSelectedType(null);
    historyRef.current = [];
    historyIndexRef.current = -1;
  }, []);

  const switchToPage = useCallback(async (idx) => {
    if (idx === currentPageIdx) return;
    // Capture thumbnail of current page before leaving it
    const thumb = await capturePageDataUrl();
    if (thumb) {
      pagesData.current[currentPageIdx] = {
        ...(pagesData.current[currentPageIdx] || {}),
        thumbnail: thumb,
      };
    }
    saveCurrentPage();
    setCurrentPageIdx(idx);
    loadPage(pagesData.current[idx]);
  }, [currentPageIdx, saveCurrentPage, loadPage]);

  const addPage = useCallback(() => {
    saveCurrentPage();
    const newPage = {
      id: genId(), textLayers: [], shapes: [], images: [], logos: [], groups: [],
      bg: { mode: "color", color: "#1e293b", gradientAngle: 135, gradientStops: null, imageUrl: null, imageOpacity: 1 },
    };
    pagesData.current.push(newPage);
    const newIdx = pagesData.current.length - 1;
    setCurrentPageIdx(newIdx);
    setPagesCount(pagesData.current.length);
    loadPage(newPage);
  }, [saveCurrentPage, loadPage]);

  const deletePage = useCallback((idx) => {
    if (pagesData.current.length <= 1) return;
    pagesData.current.splice(idx, 1);
    const newIdx = Math.min(idx, pagesData.current.length - 1);
    setCurrentPageIdx(newIdx);
    setPagesCount(pagesData.current.length);
    loadPage(pagesData.current[newIdx]);
  }, [loadPage]);

  const duplicatePage = useCallback((idx) => {
    if (idx === currentPageIdx) saveCurrentPage();
    const source = pagesData.current[idx];
    const newPage = {
      id: genId(),
      textLayers: JSON.parse(JSON.stringify(source.textLayers)),
      shapes: JSON.parse(JSON.stringify(source.shapes)),
      images: JSON.parse(JSON.stringify(source.images)),
      logos: JSON.parse(JSON.stringify(source.logos)),
      groups: JSON.parse(JSON.stringify(source.groups)),
      bg: JSON.parse(JSON.stringify(source.bg)),
    };
    pagesData.current.splice(idx + 1, 0, newPage);
    const newIdx = idx + 1;
    setCurrentPageIdx(newIdx);
    setPagesCount(pagesData.current.length);
    loadPage(newPage);
  }, [currentPageIdx, saveCurrentPage, loadPage]);

  // نسخ محتوى الصفحة الحالية إلى صفحة مستهدفة (تحل محلها)
  const copyCurrentPageTo = useCallback((targetIdx) => {
    if (targetIdx === currentPageIdx) return;
    saveCurrentPage();
    const source = pagesData.current[currentPageIdx];
    pagesData.current[targetIdx] = {
      id: pagesData.current[targetIdx]?.id || genId(),
      textLayers: JSON.parse(JSON.stringify(source.textLayers)),
      shapes: JSON.parse(JSON.stringify(source.shapes)),
      images: JSON.parse(JSON.stringify(source.images)),
      logos: JSON.parse(JSON.stringify(source.logos)),
      groups: JSON.parse(JSON.stringify(source.groups)),
      bg: JSON.parse(JSON.stringify(source.bg)),
    };
    setCurrentPageIdx(targetIdx);
    loadPage(pagesData.current[targetIdx]);
  }, [currentPageIdx, saveCurrentPage, loadPage]);

  // نسخ الصفحة الحالية كصفحة جديدة في النهاية
  const copyCurrentPageAsNew = useCallback(() => {
    saveCurrentPage();
    const source = pagesData.current[currentPageIdx];
    const newPage = {
      id: genId(),
      textLayers: JSON.parse(JSON.stringify(source.textLayers)),
      shapes: JSON.parse(JSON.stringify(source.shapes)),
      images: JSON.parse(JSON.stringify(source.images)),
      logos: JSON.parse(JSON.stringify(source.logos)),
      groups: JSON.parse(JSON.stringify(source.groups)),
      bg: JSON.parse(JSON.stringify(source.bg)),
    };
    pagesData.current.push(newPage);
    const newIdx = pagesData.current.length - 1;
    setCurrentPageIdx(newIdx);
    setPagesCount(pagesData.current.length);
    loadPage(newPage);
  }, [currentPageIdx, saveCurrentPage, loadPage]);
  // ──────────────────────────────────────────────────────────────────────────

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

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("png");
  const [exportQuality, setExportQuality] = useState(0.92);
  const [exportScaleMul, setExportScaleMul] = useState(1);
  const [exportTransparent, setExportTransparent] = useState(false);
  const [exportAllPages, setExportAllPages] = useState(false);

  // Capture the canvas as a data URL with the chosen format / scale / transparency
  const captureCanvas = async (format, quality, scaleMul, transparent) => {
    const element = /** @type {HTMLElement} */ (/** @type {unknown} */ (canvasWrapRef.current));
    if (!element) return null;
    const clientW = element.offsetWidth;
    const baseScale = size.width / clientW;
    const pixelRatio = baseScale * (scaleMul || 1);

    // Hide background temporarily for transparent export (PNG/WebP only)
    let prevBg = null;
    if (transparent && format !== "jpeg" && format !== "jpg") {
      prevBg = bg;
      flushSync(() => setBg({ mode: "color", color: "transparent" }));
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    let dataUrl = null;
    try {
      if (format === "svg") {
        dataUrl = await htmlToImage.toSvg(element, { pixelRatio });
      } else if (format === "jpeg" || format === "jpg") {
        dataUrl = await htmlToImage.toJpeg(element, { pixelRatio, quality, backgroundColor: "#ffffff" });
      } else if (format === "webp") {
        // html-to-image lacks WebP; render as PNG canvas first then re-encode to WebP
        const png = await htmlToImage.toPng(element, { pixelRatio });
        dataUrl = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(c.toDataURL("image/webp", quality));
          };
          img.src = png;
        });
      } else {
        // png (default)
        dataUrl = await htmlToImage.toPng(element, { pixelRatio });
      }
    } finally {
      if (prevBg) {
        flushSync(() => setBg(prevBg));
        await new Promise(r => requestAnimationFrame(r));
      }
    }
    return dataUrl;
  };

  const handleExport = async () => {
    setShowExportModal(true);
  };

  // Capture the current canvas and hand it back to Greeting Cards as the template.
  const handleUseInGreeting = async () => {
    try {
      const dataUrl = await captureCanvas("png", 1, 1, false);
      if (!dataUrl) return;
      sessionStorage.setItem("greetingTemplateUrl", dataUrl);
      sessionStorage.removeItem("greetingReturn");
      navigate("/GreetingCards");
    } catch { /* ignore */ }
  };

  const runExport = async () => {
    if (!canvasRef.current) return;

    const originalLogos = logos;
    setShowExportModal(false);

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

    const noSelectStyle = document.createElement("style");
    noSelectStyle.id = "export-no-select";
    noSelectStyle.innerHTML = `* { -webkit-user-select: none !important; user-select: none !important; } ::selection { background: transparent !important; color: inherit !important; }`;
    document.head.appendChild(noSelectStyle);
    window.getSelection()?.removeAllRanges();
    await new Promise(r => setTimeout(r, 300));

    await new Promise(resolve => {
      flushSync(() => setExporting(true));
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const ext = exportFormat === "jpeg" ? "jpg" : exportFormat;

    try {
      if (exportAllPages && pagesData.current.length > 1) {
        // Save current page first, then iterate every page
        saveCurrentPage();
        const startIdx = currentPageIdx;
        for (let i = 0; i < pagesData.current.length; i++) {
          loadPage(pagesData.current[i]);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          await new Promise(r => setTimeout(r, 250));
          const dataUrl = await captureCanvas(exportFormat, exportQuality, exportScaleMul, exportTransparent);
          if (dataUrl) {
            const link = document.createElement("a");
            link.download = `${(designName || "design")}-page-${i + 1}.${ext}`;
            link.href = dataUrl;
            link.click();
            await new Promise(r => setTimeout(r, 200));
          }
        }
        // Restore original active page
        loadPage(pagesData.current[startIdx]);
      } else {
        const dataUrl = await captureCanvas(exportFormat, exportQuality, exportScaleMul, exportTransparent);
        if (dataUrl) {
          const link = document.createElement("a");
          link.download = `${(designName || "design")}-${size.id || "custom"}.${ext}`;
          link.href = dataUrl;
          link.click();
          setExportedImageUrl(dataUrl);
          setShowShareModal(true);
        }
      }
    } finally {
      document.getElementById("export-no-select")?.remove();
      setLogos(originalLogos);
      setExporting(false);
    }
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

  // Inline AI image generation from the "صور" tab → drops the result on the canvas.
  const handleGenerateAiImage = async () => {
    const prompt = aiImgPrompt.trim();
    if (!prompt || aiImgBusy) return;
    setAiImgBusy(true); setAiImgErr("");
    try {
      const ratio = (size?.ratio && /^\d+:\d+$/.test(size.ratio)) ? size.ratio : "1:1";
      const url = await generateImage({ prompt, aspectRatio: ratio });
      if (url) addImage({ url, isSvg: false, svgContent: null });
      setAiImgPrompt("");
    } catch (e) {
      setAiImgErr((language === "ar" ? "تعذّر التوليد: " : "Failed: ") + (e?.message || e));
    } finally {
      setAiImgBusy(false);
    }
  };

  // تطبيق قالب جاهز على الصفحة الحالية
  const handleApplyTemplate = ({ textLayers: tl, shapes: sh, images: im, logos: lo, groups: gr, bg: newBg }) => {
    skipCountRef.current = 6;
    setTextLayers(tl);
    setShapes(sh);
    const imgs = im || [];
    setImages(imgs); imagesRef.current = imgs;
    setLogos(lo);
    setGroups(gr || []);
    setBg(newBg);
    setSelectedId(null); setSelectedType(null);
    setActiveTab("text");
  };

  // Magic Resize: تغيير الحجم مع ضبط الحجم النسبي لكل العناصر
  const handleMagicResize = (newSize) => {
    if (!size) { onChangeSize(newSize); return; }

    // Scale font sizes proportionally to new canvas width
    const fontScale = newSize.width / size.width;
    setTextLayers(p => p.map(l => ({ ...l, fontSize: Math.round(l.fontSize * fontScale) })));

    // Rescale element heights to maintain visual proportions on the new aspect ratio.
    // Elements store height as % of canvas height. When aspect ratio changes, the same
    // height% renders a different number of pixels, causing distortion.
    // We convert: new_height% = old_height% * (old_canvasH / old_canvasW) * (new_canvasW / new_canvasH)
    //           = old_height% * (oldAspect / newAspect)  where aspect = width/height
    const oldAspect = size.width / size.height;
    const newAspect = newSize.width / newSize.height;
    const hScale = oldAspect / newAspect;

    const rescaleH = (el) => ({ ...el, height: (el.height || 20) * hScale });
    setShapes(p => p.map(rescaleH));
    setImages(p => { const next = p.map(rescaleH); imagesRef.current = next; return next; });
    setLogos(p => p.map(rescaleH));

    onChangeSize(newSize);
  };

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

  // Open context menu at click position for the given element
  const openContextMenu = (e, id, type) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    setSelectedType(type);
    setContextMenu({ x: e.clientX, y: e.clientY, id, type });
  };

  // Close context menu on outside click / Escape
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  const ctxAction = (action) => {
    const { id, type } = contextMenu || {};
    setContextMenu(null);
    if (!id || !type) return;
    if (action === "duplicate") {
      if (type === "shape") duplicateShape(id);
      else if (type === "image") duplicateImage(id);
      else if (type === "logo") duplicateLogo(id);
      else if (type === "text") duplicateText(id);
    } else if (action === "delete") {
      if (type === "shape") deleteShape(id);
      else if (type === "image") deleteImage(id);
      else if (type === "logo") deleteLogo(id);
      else if (type === "text") deleteText(id);
      setSelectedId(null); setSelectedType(null);
    } else if (action === "front" || action === "back" || action === "forward" || action === "backward") {
      zOrder(action);
    } else if (action === "lock") {
      const upd = { locked: true };
      if (type === "shape") updateShape(id, upd);
      else if (type === "image") updateImage(id, upd);
      else if (type === "logo") updateLogo(id, upd);
      else if (type === "text") updateText(id, upd);
    } else if (action === "unlock") {
      const upd = { locked: false };
      if (type === "shape") updateShape(id, upd);
      else if (type === "image") updateImage(id, upd);
      else if (type === "logo") updateLogo(id, upd);
      else if (type === "text") updateText(id, upd);
    } else if (action === "hide") {
      const upd = { visible: false };
      if (type === "shape") updateShape(id, upd);
      else if (type === "image") updateImage(id, upd);
      else if (type === "logo") updateLogo(id, upd);
      else if (type === "text") updateText(id, upd);
    }
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
    <div dir={isRtl ? "rtl" : "ltr"} className="h-full flex flex-col bg-white overflow-hidden" style={{ color: "var(--hv-text)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b flex-shrink-0" style={{ borderColor: "var(--hv-border)" }}>
        <button onClick={() => navigate("/")} title={isRtl ? "الرئيسية" : "Home"} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 transition" style={{ color: "var(--hv-text-soft)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-xs font-semibold hidden sm:block">{isRtl ? "الرئيسية" : "Home"}</span>
        </button>
        <button onClick={() => navigate("/DesignLibraryPage")} title={isRtl ? "مكتبة التصاميم" : "Design Library"} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 transition" style={{ color: "var(--hv-text-soft)" }}>
          <LayoutGrid className="w-4 h-4" />
          <span className="text-xs font-semibold hidden sm:block">{isRtl ? "المكتبة" : "Library"}</span>
        </button>
        {greetingReturnMode && (
          <button onClick={handleUseInGreeting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition" style={{ background: "var(--hv-secondary, #fb7185)" }}>
            🎁 <span className="hidden sm:block">{isRtl ? "استخدم في بطاقة التهنئة" : "Use in greeting card"}</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: "var(--hv-grad)" }}>
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm hidden sm:block" style={{ color: "var(--hv-text)" }}>{isRtl ? "منشئ التصاميم" : "Design Studio"}</span>
        </div>

        <button
          onClick={() => setShowSizeSelector(true)}
          className="flex items-center gap-1 px-2 py-1 rounded hv-chip text-xs transition"
        >
          {isRtl ? size.nameAr : size.nameEn}
          <span style={{ color: "var(--hv-text-faint)" }}>{size.width}×{size.height}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        <div className="flex-1" />

        {/* Auto-save status */}
        <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition ${
          autoSaveStatus === "saving" ? "bg-amber-500/10 text-amber-400" :
          autoSaveStatus === "saved" ? "bg-emerald-500/10 text-emerald-600" :
          ""
        }`} style={autoSaveStatus === "idle" ? { color: "var(--hv-text-faint)" } : undefined} title={lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : ""}>
          {autoSaveStatus === "saving" ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden md:inline">{isRtl ? "حفظ..." : "Saving..."}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-current" />
              <span className="hidden md:inline">{formatSavedAgo()}</span>
            </>
          )}
        </div>

        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid(g => !g)}
          title={isRtl ? "شبكة" : "Grid"}
          className="p-1.5 rounded transition hover:bg-slate-100"
          style={showGrid ? { background: "var(--hv-primary)", color: "#fff" } : { color: "var(--hv-text-soft)" }}
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        {/* Ruler toggle */}
        <button
          onClick={() => setShowRulers(r => !r)}
          title={isRtl ? "مسطرة" : "Rulers"}
          className="p-1.5 rounded transition hover:bg-slate-100"
          style={showRulers ? { background: "var(--hv-primary)", color: "#fff" } : { color: "var(--hv-text-soft)" }}
        >
          <Ruler className="w-4 h-4" />
        </button>

        {/* Undo / Redo */}
        <button
          onClick={handleUndo}
          disabled={historyIndexRef.current <= 0}
          title={isRtl ? "تراجع (Ctrl+Z)" : "Undo (Ctrl+Z)"}
          className="p-1.5 rounded hover:bg-slate-100 transition disabled:opacity-30"
          style={{ color: "var(--hv-text-soft)" }}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleRedo}
          disabled={historyIndexRef.current >= historyRef.current.length - 1}
          title={isRtl ? "إعادة (Ctrl+Y)" : "Redo (Ctrl+Y)"}
          className="p-1.5 rounded hover:bg-slate-100 transition disabled:opacity-30"
          style={{ color: "var(--hv-text-soft)" }}
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowCopyModal(true)}
          className="hv-btn hv-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs"
        >
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden sm:block">{isRtl ? "نسخ لمقاس" : "Copy to Size"}</span>
        </button>

        <button
          onClick={() => { localStorage.removeItem(DRAFT_KEY); setTextLayers([]); setShapes([]); setImages([]); setLogos([]); setGroups([]); setBg({ mode: "color", color: "#1e293b" }); onBack(); }}
          className="hv-btn hv-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs"
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
          className="hv-btn hv-btn-primary flex items-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? (isRtl ? "جاري..." : "Exporting...") : "PNG"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-60 flex-shrink-0 bg-white border-e flex flex-col overflow-hidden" style={{ borderColor: "var(--hv-border)" }}>
          {/* Tabs — grouped into logical clusters */}
          <div className="p-2.5 border-b space-y-2.5 overflow-y-auto" style={{ borderColor: "var(--hv-border)", maxHeight: "42%" }}>
            {TAB_GROUPS.map((group) => (
              <div key={group.labelEn}>
                {/* Group heading — a clear titled bar so the clusters read as sections */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(79,70,229,0.10)", color: "var(--hv-primary-700)" }}>
                    {isRtl ? group.labelAr : group.labelEn}
                  </span>
                  <span className="flex-1 h-px" style={{ background: "var(--hv-border)" }} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.ids.map((id) => {
                    const tab = TABS.find((t) => t.id === id);
                    if (!tab) return null;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition"
                        style={active
                          ? { background: "var(--hv-grad)", color: "#fff" }
                          : { background: "var(--hv-surface-2)", color: "var(--hv-text-soft)" }}
                      >
                        {isRtl ? tab.labelAr : tab.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Panel content - keep all mounted to preserve contentEditable state */}
          <div className="flex-1 overflow-y-auto p-3">
            <div style={{ display: activeTab === "templates" ? "block" : "none" }}>
              <TemplatesPanel onApply={handleApplyTemplate} language={language} />
            </div>
            <div style={{ display: activeTab === "brand" ? "block" : "none" }}>
              <BrandKitPanel
                onApplyColor={(color) => {
                  if (selectedId && selectedType === "text") updateText(selectedId, { color });
                  else if (selectedId && selectedType === "shape") updateShape(selectedId, { fillColor: color });
                }}
                onApplyFont={(font) => {
                  if (selectedId && selectedType === "text") updateText(selectedId, { fontFamily: font });
                }}
                onApplyBg={(color) => setBg(prev => ({ ...prev, mode: "color", color }))}
                language={language}
              />
            </div>
            <div style={{ display: activeTab === "effects" ? "block" : "none" }}>
              <TextEffectsPanel
                layers={textLayers}
                selectedId={selectedType === "text" ? selectedId : null}
                onSelect={(id) => handleSelectWithTabSwitch(id, "text")}
                onUpdate={updateText}
                language={language}
              />
            </div>
            <div style={{ display: activeTab === "offers" ? "block" : "none" }}>
              <OffersPanel offers={offers} onChange={updateOffers} language={language} />
            </div>
            <div style={{ display: activeTab === "menu" ? "block" : "none" }}>
              <MenuPanel menu={menu} onChange={updateMenu} language={language} />
            </div>
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
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
              />
            </div>
            <div style={{ display: activeTab === "deco" ? "block" : "none" }}>
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
                decoMode={true}
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
            <div style={{ display: activeTab === "social" ? "block" : "none" }}>
              {/* Live editor — the actual box lives on the canvas as a
                  DOM overlay (see StudioCanvas "Social contact box
                  overlay"), this panel just edits its state. Drag,
                  render, and export all happen there so the result is
                  identical to GreetingCardsPage. */}
              <SocialPanel
                language={language}
                box={socialBox}
                onUpdate={(patch) => setSocialBox((s) => ({ ...s, ...patch }))}
              />
            </div>
            <div style={{ display: activeTab === "images" ? "block" : "none" }}>
              {/* Generate an image with AI → drops straight onto the canvas */}
              <div className="mb-3 rounded-xl p-2.5 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
                <p className="text-[12px] font-extrabold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--hv-primary-700)" }}>
                  <Sparkles className="w-4 h-4" /> {language === "ar" ? "توليد صورة بالذكاء" : "Generate image (AI)"}
                </p>
                <textarea
                  value={aiImgPrompt}
                  onChange={(e) => setAiImgPrompt(e.target.value)}
                  rows={2}
                  placeholder={language === "ar" ? "صف الصورة… (مثال: علبة عطر فاخرة على رخام، خلفية شفافة)" : "Describe the image…"}
                  className="hv-input text-[12px] mb-1.5 resize-none"
                />
                <button
                  onClick={handleGenerateAiImage}
                  disabled={aiImgBusy || !aiImgPrompt.trim()}
                  className="hv-btn hv-btn-primary w-full !py-2 text-xs disabled:opacity-50"
                >
                  {aiImgBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {aiImgBusy ? (language === "ar" ? "جارٍ التوليد…" : "Generating…") : (language === "ar" ? "توليد وإضافة للتصميم" : "Generate & add")}
                </button>
                {aiImgErr && <p className="text-[10px] text-red-600 mt-1 leading-relaxed">{aiImgErr}</p>}
              </div>
              <DecorationFinder onAdd={addImage} language={language} />
              <ImagesPanel
                images={images.filter(i => !i.isLucideIcon && !i.isSocialIcon && !i.isHandDrawn && !i.isSymbol && !i.isText)}
                selectedId={selectedType === "image" && images.find(i => i.id === selectedId && !i.isLucideIcon && !i.isSocialIcon && !i.isHandDrawn && !i.isSymbol && !i.isText) ? selectedId : null}
                onSelect={(id) => handleSelectWithTabSwitch(id, "image")}
                onAdd={addImage}
                onUpdate={updateImage}
                onDelete={deleteImage}
                onDuplicate={duplicateImage}
                onZOrder={(id, action) => zOrderById(id, "image", action)}
                language={language}
                isLogo={false}
                canvasAspect={canvasAspect}
              />
            </div>

            <div style={{ display: activeTab === "bg" ? "block" : "none" }}>
              <BackgroundPanel bg={bg} onChange={setBg} language={language} />
            </div>
            <div style={{ display: activeTab === "frames" ? "block" : "none" }}>
              <FramesPanel frames={frames} onChange={setFrames} language={language} />
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
                drawMode={drawMode}
                setDrawMode={setDrawMode}
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
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--hv-border)" }}>
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
                <p className="text-xs" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "المقاس الحالي" : "Current Size"}: {size.width}×{size.height}</p>
                <p className="text-xs" style={{ color: "var(--hv-primary)" }}>✨ {isRtl ? "Magic Resize: يضبط حجم الخطوط تلقائياً" : "Magic Resize: auto-scales fonts"}</p>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {SIZES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { handleMagicResize(s); }}
                      className="w-full text-start px-3 py-2 rounded text-xs transition hover:opacity-90"
                      style={s.id === size.id
                        ? { background: "var(--hv-primary)", color: "#fff" }
                        : { background: "var(--hv-surface-2)", color: "var(--hv-text-soft)" }}
                    >
                      <span className="font-semibold">{isRtl ? s.nameAr : s.nameEn}</span>
                      <span className="ms-2" style={s.id === size.id ? { color: "rgba(255,255,255,0.7)" } : { color: "var(--hv-text-faint)" }}>{s.width}×{s.height}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-[#ece9f7] overflow-auto flex items-center justify-center p-4 relative">
          {/* Saving overlay — hides visual glitches from thumbnail capture */}
          {saving && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ background: "rgba(236,233,247,0.9)" }}>
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--hv-primary)" }} />
                <span className="text-sm" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "جاري الحفظ..." : "Saving..."}</span>
              </div>
            </div>
          )}
          <div
            ref={canvasWrapperRef}
            style={{
              width: size.width > size.height ? "min(100%, 1200px)" : "min(80%, 900px)",
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
              frames={frames}
              drawMode={drawMode}
              showGrid={showGrid}
              showRulers={showRulers}
              onContextMenu={openContextMenu}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              socialBox={socialBox}
              onUpdateSocialBox={(patch) => setSocialBox((s) => ({ ...s, ...patch }))}
              offers={offers}
              onUpdateOffers={updateOffers}
              menu={menu}
              onUpdateMenu={updateMenu}
              onAddShape={(payload) => {
                const newShape = {
                  id: genId(),
                  fillColor: "#8b5cf6",
                  borderColor: "#ffffff",
                  borderWidth: 0,
                  opacity: 1,
                  visible: true,
                  rotation: 0,
                  borderRadius: 0,
                  ...payload,
                };
                setShapes(p => [...p, newShape]);
                setSelectedId(newShape.id);
                setSelectedType("shape");
              }}
              onConvertSelectedShape={(payload) => {
                // Replace the selected shape's geometry with the recognized clean shape.
                // We strip pathData/isClosed since the new shape doesn't need them.
                if (selectedId && selectedType === "shape") {
                  setShapes(p => p.map(s => s.id === selectedId
                    ? { ...s, pathData: undefined, isClosed: undefined, ...payload }
                    : s
                  ));
                }
              }}
              onExitDrawMode={() => setDrawMode(false)}
            />
          </div>
        </div>
      </div>

      {/* ─── شريط الصفحات (Multi-Page Strip) ─────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t px-4 py-2 flex items-center gap-2 overflow-x-auto" style={{ borderColor: "var(--hv-border)" }}>
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--hv-text-soft)" }}>
          {isRtl ? "الصفحات" : "Pages"}
        </span>
        {Array.from({ length: pagesCount }).map((_, i) => (
          <div key={i} className="relative flex-shrink-0 group">
            <button
              onClick={() => switchToPage(i)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold border-2 transition"
              style={
                i === currentPageIdx
                  ? { borderColor: "var(--hv-primary)", background: "#eef0ff", color: "var(--hv-primary)" }
                  : { borderColor: "var(--hv-border)", background: "var(--hv-surface-2)", color: "var(--hv-text-soft)" }
              }
            >
              {i + 1}
            </button>
            {pagesCount > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); deletePage(i); }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-400 rounded-full text-white text-xs hidden group-hover:flex items-center justify-center leading-none"
              >
                ×
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); duplicatePage(i); }}
              title={isRtl ? "تكرار الصفحة" : "Duplicate page"}
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-400 hover:bg-slate-500 rounded-full text-white text-xs hidden group-hover:flex items-center justify-center leading-none"
            >
              ⧉
            </button>
            {i !== currentPageIdx && (
              <button
                onClick={(e) => { e.stopPropagation(); copyCurrentPageTo(i); }}
                title={isRtl ? `نسخ الصفحة الحالية هنا (${i + 1})` : `Copy current page here (${i + 1})`}
                className="absolute -bottom-1 -left-1 w-4 h-4 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white text-xs hidden group-hover:flex items-center justify-center leading-none"
              >
                📋
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addPage}
          title={isRtl ? "إضافة صفحة جديدة" : "Add page"}
          className="flex-shrink-0 w-10 h-10 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-500 text-lg flex items-center justify-center transition"
          style={{ color: "var(--hv-text-soft)" }}
        >
          +
        </button>
        <button
          onClick={copyCurrentPageAsNew}
          title={isRtl ? "نسخ الصفحة الحالية كصفحة جديدة" : "Copy current page as new page"}
          className="flex-shrink-0 w-10 h-10 rounded-lg border-2 border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-500 hover:text-indigo-600 text-sm flex items-center justify-center transition"
        >
          📋+
        </button>
        <span className="text-xs ms-2" style={{ color: "var(--hv-text-faint)" }}>
          {currentPageIdx + 1} / {pagesCount}
        </span>
      </div>
      {/* ─────────────────────────────────────────────────────────────────── */}

      {/* Save modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowSaveModal(false)}>
          <div className="hv-card rounded-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4" style={{ color: "var(--hv-text)" }}>{isRtl ? "حفظ التصميم" : "Save Design"}</h3>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder={isRtl ? "اسم التصميم..." : "Design name..."}
              className="hv-input w-full px-3 py-2 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(false)} className="hv-btn hv-btn-soft flex-1 py-2 text-sm">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowOverwriteConfirm(false)}>
          <div className="hv-card rounded-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2" style={{ color: "var(--hv-text)" }}>{isRtl ? "تأكيد الاستبدال" : "Confirm Overwrite"}</h3>
            <p className="text-sm mb-5" style={{ color: "var(--hv-text-soft)" }}>
              {isRtl
                ? `سيتم استبدال التصميم "${loadedDesign?.name}" بالتصميم الحالي. هل أنت متأكد؟`
                : `This will overwrite "${loadedDesign?.name}". Are you sure?`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowOverwriteConfirm(false)} className="hv-btn hv-btn-soft flex-1 py-2 text-sm">
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

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: Math.min(contextMenu.y, window.innerHeight - 280),
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            zIndex: 9999,
            borderColor: "var(--hv-border)",
          }}
          className="bg-white border rounded-lg shadow-2xl py-1 min-w-[180px]"
        >
          {[
            { id: "duplicate", label: isRtl ? "تكرار" : "Duplicate", hint: "Ctrl+D" },
            { id: "front", label: isRtl ? "للأمام بالكامل" : "Bring to Front", hint: "Ctrl+Shift+]" },
            { id: "forward", label: isRtl ? "للأمام خطوة" : "Bring Forward", hint: "Ctrl+]" },
            { id: "backward", label: isRtl ? "للخلف خطوة" : "Send Backward", hint: "Ctrl+[" },
            { id: "back", label: isRtl ? "للخلف بالكامل" : "Send to Back", hint: "Ctrl+Shift+[" },
            { id: "_sep1" },
            { id: "lock", label: isRtl ? "🔒 قفل" : "🔒 Lock" },
            { id: "hide", label: isRtl ? "👁️ إخفاء" : "👁️ Hide" },
            { id: "_sep2" },
            { id: "delete", label: isRtl ? "🗑️ حذف" : "🗑️ Delete", hint: "Del", danger: true },
          ].map((item) => item.id.startsWith("_sep") ? (
            <div key={item.id} className="my-1 border-t" style={{ borderColor: "var(--hv-border)" }} />
          ) : (
            <button
              key={item.id}
              onClick={() => ctxAction(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs transition ${item.danger ? "text-red-500 hover:bg-red-50" : "hover:bg-slate-100"}`}
              style={item.danger ? undefined : { color: "var(--hv-text)" }}
            >
              <span>{item.label}</span>
              {item.hint && <span className="text-[10px]" style={{ color: "var(--hv-text-faint)" }}>{item.hint}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Pro Export modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
          <div className="hv-card rounded-2xl p-6 w-[480px] max-w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: "var(--hv-text)" }}>
              <Download className="w-5 h-5" />
              {isRtl ? "تصدير احترافي" : "Pro Export"}
            </h3>

            {/* Format */}
            <div className="mb-4">
              <label className="text-xs mb-2 block" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "صيغة الملف" : "Format"}</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "png",  label: "PNG",  hint: isRtl ? "أعلى جودة" : "Lossless" },
                  { id: "jpeg", label: "JPG",  hint: isRtl ? "أصغر حجم" : "Smaller" },
                  { id: "webp", label: "WebP", hint: isRtl ? "حديث" : "Modern" },
                  { id: "svg",  label: "SVG",  hint: isRtl ? "متجه" : "Vector" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setExportFormat(f.id)}
                    className="px-2 py-3 rounded-lg border text-center transition"
                    style={exportFormat === f.id
                      ? { background: "var(--hv-primary)", borderColor: "var(--hv-primary)", color: "#fff" }
                      : { background: "var(--hv-surface-2)", borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}
                  >
                    <div className="font-bold text-sm">{f.label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: exportFormat === f.id ? "rgba(255,255,255,0.75)" : "var(--hv-text-faint)" }}>{f.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scale multiplier */}
            <div className="mb-4">
              <label className="text-xs mb-2 block" style={{ color: "var(--hv-text-soft)" }}>
                {isRtl ? "حجم التصدير" : "Export Size"} — {Math.round(size.width * exportScaleMul)}×{Math.round(size.height * exportScaleMul)} px
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: 0.5, label: "0.5×" },
                  { v: 1,   label: "1×" },
                  { v: 2,   label: "2× HD" },
                  { v: 3,   label: "3× 4K" },
                ].map(s => (
                  <button
                    key={s.v}
                    onClick={() => setExportScaleMul(s.v)}
                    className="py-2 rounded-lg text-xs font-semibold transition hover:opacity-90"
                    style={exportScaleMul === s.v
                      ? { background: "var(--hv-primary)", color: "#fff" }
                      : { background: "var(--hv-surface-2)", color: "var(--hv-text-soft)" }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality slider (JPG / WebP only) */}
            {(exportFormat === "jpeg" || exportFormat === "webp") && (
              <div className="mb-4">
                <label className="text-xs mb-2 block" style={{ color: "var(--hv-text-soft)" }}>
                  {isRtl ? "الجودة" : "Quality"}: {Math.round(exportQuality * 100)}%
                </label>
                <input
                  type="range" min="0.3" max="1" step="0.05"
                  value={exportQuality}
                  onChange={(e) => setExportQuality(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            )}

            {/* Transparent BG — prominent so it isn't missed (was a common "why is my PNG white?" trap) */}
            {(exportFormat === "png" || exportFormat === "webp" || exportFormat === "svg") && (
              <div
                className="mb-4 rounded-lg border p-3 transition"
                style={exportTransparent
                  ? { borderColor: "var(--hv-primary)", background: "rgba(79,70,229,0.06)" }
                  : { borderColor: "var(--hv-border)", background: "var(--hv-surface-2)" }}
              >
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={exportTransparent} onChange={(e) => setExportTransparent(e.target.checked)} className="rounded w-4 h-4" />
                  <span className="font-semibold" style={{ color: "var(--hv-text)" }}>{isRtl ? "🪟 خلفية شفافة" : "🪟 Transparent background"}</span>
                </label>
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--hv-text-faint)" }}>
                  {isRtl
                    ? "علّم هذا الخيار لو تبي الصورة بدون خلفية (تركّبها فوق تصاميم ثانية). بدونه تطلع الخلفية بلونها الحالي (أبيض)."
                    : "Check this to export with no background (to layer over other designs). Otherwise the current background (white) is kept."}
                </p>
              </div>
            )}

            {/* Batch all pages */}
            {pagesCount > 1 && (
              <label className="flex items-center gap-2 mb-4 cursor-pointer text-sm">
                <input type="checkbox" checked={exportAllPages} onChange={(e) => setExportAllPages(e.target.checked)} className="rounded" />
                <span style={{ color: "var(--hv-text-soft)" }}>
                  {isRtl ? `تصدير كل الصفحات (${pagesCount})` : `Export all pages (${pagesCount})`}
                </span>
              </label>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--hv-border)" }}>
              <button onClick={() => setShowExportModal(false)} className="hv-btn hv-btn-soft flex-1 py-2 text-sm">
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={runExport} className="hv-btn hv-btn-primary flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                {isRtl ? "تصدير" : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy to size modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowCopyModal(false)}>
          <div className="hv-card rounded-2xl p-6 w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4" style={{ color: "var(--hv-text)" }}>{isRtl ? "نسخ لمقاس آخر" : "Copy to Another Size"}</h3>
            <div className="space-y-2">
              {SIZES.filter(s => s.id !== size.id && !s.isCustom).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleCopyToSize(s)}
                  className="w-full text-start px-3 py-2 rounded-lg transition text-sm hover:bg-slate-100"
                  style={{ background: "var(--hv-surface-2)", color: "var(--hv-text)" }}
                >
                  <span className="font-semibold">{isRtl ? s.nameAr : s.nameEn}</span>
                  <span className="ms-2 text-xs" style={{ color: "var(--hv-text-faint)" }}>{s.width}×{s.height}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}