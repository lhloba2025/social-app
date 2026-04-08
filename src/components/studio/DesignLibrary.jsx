import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApi } from "@/api/localClient";
import { Plus, Trash2, Edit3, FolderOpen, Loader2, Home, X, Eye, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import MediaUploadModal from "../MediaUploadModal";

function parseJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return fallback; } }
  return val;
}

function DesignPreviewModal({ design, isRtl, onEdit, onClose }) {
  const size = parseJson(design.size, {});

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl overflow-hidden max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-bold text-white">{design.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4">
          <div style={{ width: "100%", borderRadius: 8, overflow: "hidden", margin: "0 auto" }}>
            {design.thumbnail ? (
              <img
                src={design.thumbnail}
                alt={design.name}
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
              />
            ) : (
              <div style={{
                width: "100%",
                paddingBottom: size.width && size.height ? `${(size.height / size.width) * 100}%` : "100%",
                backgroundColor: "#1e293b",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span className="text-slate-500 text-sm">
                  {isRtl ? "لا يوجد معاينة" : "No preview"}
                </span>
              </div>
            )}
          </div>

          {size.width && (
            <p className="text-slate-400 text-xs text-center mt-2">{size.width}×{size.height}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm transition">
            {isRtl ? "إغلاق" : "Close"}
          </button>
          <button onClick={onEdit} className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition flex items-center justify-center gap-2">
            <Edit3 className="w-4 h-4" />
            {isRtl ? "تعديل التصميم" : "Edit Design"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesignLibrary({ language, onOpen, onNew }) {
  const isRtl = language === "ar";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState(null);
  const [previewDesign, setPreviewDesign] = useState(null);
  const [selectedSize, setSelectedSize] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState("designs"); // designs or media
  const [editingMedia, setEditingMedia] = useState(null);
  const [editingData, setEditingData] = useState({ name: "", platform: "" });
  const [editingMediaContent, setEditingMediaContent] = useState(null);

  const getSize = (design) => {
    const s = parseJson(design.size, null);
    if (s?.width) return `${s.width}×${s.height}`;
    return null;
  };

  const { data: designs = [], isLoading: designsLoading } = useQuery({
    queryKey: ["designs"],
    queryFn: () => localApi.entities.Design.list("-updated_date"),
  });

  const { data: mediaList = [], isLoading: mediaLoading } = useQuery({
    queryKey: ["media"],
    queryFn: () => localApi.entities.Media.list("-created_date"),
  });

  // Get unique sizes
  const uniqueSizes = Array.from(new Set(designs.map(d => {
    const s = parseJson(d.size, null);
    return s?.width ? `${s.width}×${s.height}` : null;
  }).filter(Boolean))).sort();

  // Filter designs by size
  const filteredDesigns = selectedSize === "all" 
    ? designs 
    : designs.filter(d => getSize(d) === selectedSize);

  const deleteMutation = useMutation({
    mutationFn: (id) => localApi.entities.Design.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designs"] }),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (id) => localApi.entities.Media.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] }),
  });

  const updateMediaMutation = useMutation({
    mutationFn: ({ id, name, platform }) =>
      localApi.entities.Media.update(id, { name, platform }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media"] });
      setEditingMedia(null);
    },
  });

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeleting(id);
    await deleteMutation.mutateAsync(id);
    setDeleting(null);
  };

  const handleDeleteMedia = async (e, id) => {
    e.stopPropagation();
    setDeleting(id);
    await deleteMediaMutation.mutateAsync(id);
    setDeleting(null);
  };

  const handleEditMedia = (media) => {
    setEditingMedia(media);
    setEditingData({ name: media.name, platform: media.platform });
  };

  const handleSaveEdit = async () => {
    if (!editingData.name.trim()) return;
    await updateMediaMutation.mutateAsync({
      id: editingMedia.id,
      name: editingData.name.trim(),
      platform: editingData.platform,
    });
  };

  const handleEditMediaContent = (media) => {
    sessionStorage.setItem("mediaToEdit", JSON.stringify(media));
    if (media.type === "video") {
      navigate("/VideoEditor");
    } else {
      navigate("/DesignStudio");
    }
  };

  const handleSaveMediaContent = async (updatedMedia) => {
    await updateMediaMutation.mutateAsync({
      id: updatedMedia.id,
      url: updatedMedia.url,
    });
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-sm">
              <Home className="w-4 h-4" />
              <span>{isRtl ? "الرئيسية" : "Home"}</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{isRtl ? "مكتبة التصاميم" : "Design Library"}</h1>
              <p className="text-slate-400 text-sm mt-1">{isRtl ? "احفظ تصاميمك وارجع اعدل عليها" : "Save and edit your designs"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 font-semibold text-sm transition"
            >
              <Upload className="w-4 h-4" />
              {isRtl ? "📤 رفع محتوى" : "📤 Upload"}
            </button>
            <button
              onClick={onNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm transition"
            >
              <Plus className="w-4 h-4" />
              {isRtl ? "تصميم جديد" : "New Design"}
            </button>
          </div>
        </div>

        {/* Size Filter */}
        {designs.length > 0 && uniqueSizes.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSize("all")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                selectedSize === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {isRtl ? "الكل" : "All"}
            </button>
            {uniqueSizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  selectedSize === size
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab("designs")}
            className={`px-4 py-2 font-semibold text-sm transition border-b-2 ${
              activeTab === "designs"
                ? "border-indigo-600 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {isRtl ? "التصاميم" : "Designs"} ({designs.length})
          </button>
          <button
            onClick={() => setActiveTab("media")}
            className={`px-4 py-2 font-semibold text-sm transition border-b-2 ${
              activeTab === "media"
                ? "border-indigo-600 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {isRtl ? "المكتبة" : "Media"} ({mediaList.length})
          </button>
        </div>

        {/* Designs Tab */}
        {activeTab === "designs" && (
          <>
        {designsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : designs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">{isRtl ? "لا يوجد تصاميم محفوظة" : "No saved designs"}</p>
            <button onClick={onNew} className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition">
              {isRtl ? "ابدأ تصميمك الأول" : "Start your first design"}
            </button>
          </div>
        ) : filteredDesigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">{isRtl ? "لا توجد تصاميم بهذا المقاس" : "No designs with this size"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredDesigns.map((design) => {
              const sizeStr = getSize(design);
              return (
                <div
                  key={design.id}
                  onClick={() => setPreviewDesign(design)}
                  className="group relative bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-slate-700 flex items-center justify-center overflow-hidden">
                    {design.thumbnail ? (
                      <img src={design.thumbnail} alt={design.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-600 text-4xl font-bold">{design.name?.[0]?.toUpperCase()}</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{design.name}</p>
                    {sizeStr && <p className="text-slate-400 text-xs mt-0.5">{sizeStr}</p>}
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewDesign(design); }}
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-indigo-600 transition"
                      title={isRtl ? "معاينة" : "Preview"}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpen(design); }}
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-indigo-600 transition"
                      title={isRtl ? "تعديل" : "Edit"}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, design.id)}
                      disabled={deleting === design.id}
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-600 transition disabled:opacity-50"
                      title={isRtl ? "حذف" : "Delete"}
                    >
                      {deleting === design.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}

        {/* Media Tab */}
        {activeTab === "media" && (
          <>
        {mediaLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : mediaList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">{isRtl ? "لم تحمل أي محتوى بعد" : "No media uploaded yet"}</p>
            <button onClick={() => setShowUploadModal(true)} className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition">
              {isRtl ? "📤 ابدأ الآن" : "📤 Start Uploading"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {mediaList.map((media) => (
              <div
                key={media.id}
                className="group relative bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-slate-700 flex items-center justify-center overflow-hidden relative group">
                  {media.type === "image" ? (
                    <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <video 
                        src={media.url} 
                        className="w-full h-full object-cover"
                        onLoadedMetadata={(e) => {
                          // Seek to a specific point to get a frame for preview
                          e.target.currentTime = 0.5;
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <div className="w-0 h-0 border-l-6 border-l-transparent border-r-0 border-t-4 border-t-transparent border-b-4 border-b-transparent ml-1" style={{borderLeft: "8px solid #1e293b", borderTop: "5px solid transparent", borderBottom: "5px solid transparent"}} />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{media.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{media.platform}</p>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <a
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-indigo-600 transition"
                    title={isRtl ? "فتح" : "Open"}
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditMediaContent(media); }}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-purple-600 transition"
                    title={isRtl ? "تحرير" : "Edit"}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditMedia(media); }}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-indigo-600 transition"
                    title={isRtl ? "معلومات" : "Info"}
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteMedia(e, media.id)}
                    disabled={deleting === media.id}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-600 transition disabled:opacity-50"
                    title={isRtl ? "حذف" : "Delete"}
                  >
                    {deleting === media.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewDesign && (
        <DesignPreviewModal
          design={previewDesign}
          isRtl={isRtl}
          onClose={() => setPreviewDesign(null)}
          onEdit={() => { onOpen(previewDesign); setPreviewDesign(null); }}
        />
      )}

      {/* Upload Modal */}
      <MediaUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        language={language}
        onUploadSuccess={() => {
          setShowUploadModal(false);
          qc.invalidateQueries({ queryKey: ["media"] });
        }}
      />

      {/* Edit Media Properties Modal */}
      {editingMedia && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-white text-lg mb-4">
              {isRtl ? "معلومات المحتوى" : "Media Info"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {isRtl ? "اسم الملف" : "File Name"}
                </label>
                <input
                  type="text"
                  value={editingData.name}
                  onChange={(e) =>
                    setEditingData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {isRtl ? "المنصة" : "Platform"}
                </label>
                <select
                  value={editingData.platform}
                  onChange={(e) =>
                    setEditingData((prev) => ({
                      ...prev,
                      platform: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="snapchat">Snapchat</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingMedia(null)}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold transition"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMediaMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateMediaMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isRtl ? "حفظ" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}