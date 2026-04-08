import React, { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { localApi, uploadFile } from "@/api/localClient";

const PLATFORMS = [
  { id: "facebook", label: "Facebook", labelAr: "فيسبوك" },
  { id: "instagram", label: "Instagram", labelAr: "انستقرام" },
  { id: "twitter", label: "Twitter", labelAr: "تويتر" },
  { id: "tiktok", label: "TikTok", labelAr: "تيك توك" },
  { id: "youtube", label: "YouTube", labelAr: "يوتيوب" },
  { id: "linkedin", label: "LinkedIn", labelAr: "لينكدإن" },
  { id: "snapchat", label: "Snapchat", labelAr: "سناب شات" },
];

export default function MediaUploadModal({ isOpen, onClose, language, onUploadSuccess }) {
  const isRtl = language === "ar";
  const [mediaType, setMediaType] = useState("image");
  const [platform, setPlatform] = useState("instagram");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // التحقق من النوع
    const isImage = selectedFile.type.startsWith("image/");
    const isVideo = selectedFile.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setError(isRtl ? "يجب أن يكون الملف صورة أو فيديو" : "File must be image or video");
      return;
    }

    setMediaType(isVideo ? "video" : "image");
    setFile(selectedFile);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError(isRtl ? "اختر ملف أولاً" : "Please select a file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // رفع الملف
      const { file_url } = await uploadFile({ file });

      // حفظ في database
      await localApi.entities.Media.create({
        name: file.name,
        url: file_url,
        type: mediaType,
        platform,
        size: file.size,
      });

      // نجح
      if (onUploadSuccess) {
        onUploadSuccess({ url: file_url, type: mediaType });
      }

      // إعادة تعيين الـ modal
      setFile(null);
      setMediaType("image");
      setPlatform("instagram");
      onClose();
    } catch (err) {
      setError(isRtl ? "فشل الرفع: " + err.message : "Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{isRtl ? "📤 رفع محتوى" : "📤 Upload Media"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Type Selection */}
        <div className="space-y-2 mb-4">
          <label className="text-slate-400 block text-sm">{isRtl ? "نوع المحتوى" : "Content Type"}</label>
          <div className="flex gap-2">
            {["image", "video"].map((type) => (
              <button
                key={type}
                onClick={() => { setMediaType(type); setFile(null); }}
                className={`flex-1 py-2 rounded transition ${
                  mediaType === type
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {type === "image" ? (isRtl ? "📷 صورة" : "📷 Image") : (isRtl ? "🎥 فيديو" : "🎥 Video")}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Selection */}
        <div className="space-y-2 mb-4">
          <label className="text-slate-400 block text-sm">{isRtl ? "المنصة" : "Platform"}</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {isRtl ? p.labelAr : p.label}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div className="space-y-2 mb-4">
          <label className="text-slate-400 block text-sm">{isRtl ? "الملف" : "File"}</label>
          <div className="relative">
            <input
              type="file"
              accept={mediaType === "image" ? "image/*" : "video/*"}
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-slate-700/50 transition"
            >
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-slate-300">
                {file ? file.name : (isRtl ? "اختر ملف أو اسحبه هنا" : "Choose or drag file")}
              </span>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition disabled:opacity-50"
          >
            {isRtl ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRtl ? "رفع" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}