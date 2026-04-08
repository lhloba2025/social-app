import React, { useState } from "react";
import { X, Download, Share2, Check } from "lucide-react";

export default function ShareModal({ isRtl, imageDataUrl, onClose, onDownload }) {
  const [copied, setCopied] = useState(false);

  const shareText = isRtl ? "شاهد تصميمي الرائع!" : "Check out my design!";

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareInstagram = async () => {
    // Download first then guide user
    onDownload();
    setTimeout(() => {
      if (navigator.share && imageDataUrl) {
        fetch(imageDataUrl).then(r => r.blob()).then(blob => {
          const file = new File([blob], "design.png", { type: "image/png" });
          navigator.share({ title: shareText, files: [file] }).catch(() => {});
        });
      } else {
        alert(isRtl
          ? "تم تنزيل الصورة! افتح انستجرام وشارك من معرض الصور."
          : "Image downloaded! Open Instagram and share from your gallery.");
      }
    }, 500);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareSnapchat = () => {
    // Snapchat Creative Kit web share
    onDownload();
    window.open(`https://www.snapchat.com/scan`, "_blank");
    setTimeout(() => {
      alert(isRtl
        ? "تم تنزيل الصورة! افتح سناب شات وشارك من معرض الصور."
        : "Image downloaded! Open Snapchat and share from your gallery.");
    }, 300);
  };

  const shareTikTok = () => {
    onDownload();
    window.open(`https://www.tiktok.com/upload`, "_blank");
    setTimeout(() => {
      alert(isRtl
        ? "تم تنزيل الصورة! افتح تيك توك ورفع الصورة."
        : "Image downloaded! Open TikTok and upload your image.");
    }, 300);
  };

  const shareNative = async () => {
    if (navigator.share && imageDataUrl) {
      try {
        const blob = await (await fetch(imageDataUrl)).blob();
        const file = new File([blob], "design.png", { type: "image/png" });
        await navigator.share({ title: shareText, files: [file] });
      } catch {
        // fallback: just download
        onDownload();
      }
    } else {
      onDownload();
    }
  };

  const copyImageToClipboard = async () => {
    if (!imageDataUrl) return;
    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      onDownload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg">{isRtl ? "مشاركة التصميم" : "Share Design"}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 transition text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview */}
        {imageDataUrl && (
          <div className="mb-5 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center" style={{ maxHeight: 200 }}>
            <img src={imageDataUrl} alt="design preview" className="max-w-full max-h-48 object-contain" />
          </div>
        )}

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {/* WhatsApp */}
          <button onClick={shareWhatsApp} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-700 hover:bg-green-700 transition group">
            <div className="w-9 h-9 rounded-full bg-green-600 group-hover:bg-green-500 flex items-center justify-center transition">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.132.558 4.13 1.533 5.864L.057 23.617a.75.75 0 00.916.93l5.943-1.55A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.693-.504-5.241-1.385l-.374-.22-3.527.921.939-3.427-.243-.394A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </div>
            <span className="text-[10px] text-slate-300 group-hover:text-white transition">WhatsApp</span>
          </button>

          {/* Facebook */}
          <button onClick={shareFacebook} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-700 hover:bg-blue-700 transition group">
            <div className="w-9 h-9 rounded-full bg-blue-600 group-hover:bg-blue-500 flex items-center justify-center transition">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <span className="text-[10px] text-slate-300 group-hover:text-white transition">Facebook</span>
          </button>

          {/* Instagram */}
          <button onClick={shareInstagram} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-700 hover:bg-pink-700 transition group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <span className="text-[10px] text-slate-300 group-hover:text-white transition">Instagram</span>
          </button>

          {/* X (Twitter) */}
          <button onClick={shareTwitter} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-700 hover:bg-gray-900 transition group">
            <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <span className="text-[10px] text-slate-300 group-hover:text-white transition">X</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Snapchat */}
          <button onClick={shareSnapchat} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-700 hover:bg-yellow-600 transition group">
            <div className="w-9 h-9 rounded-full bg-yellow-400 group-hover:bg-yellow-300 flex items-center justify-center transition">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black">
                <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.497.083.045.206.09.36.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.465-.104.182 0 .36.045.49.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.046-.138-.046-.213.016-.239.195-.465.45-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.195 0 .33-.06.45-.134l-.045-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.714.807l.492-.014z"/>
              </svg>
            </div>
            <span className="text-[10px] text-slate-300 group-hover:text-white transition">Snapchat</span>
          </button>

          {/* TikTok */}
          <button onClick={shareTikTok} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-700 hover:bg-neutral-900 transition group">
            <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
              </svg>
            </div>
            <span className="text-[10px] text-slate-300 group-hover:text-white transition">TikTok</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={copyImageToClipboard}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm transition"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>}
            <span>{copied ? (isRtl ? "تم النسخ!" : "Copied!") : (isRtl ? "نسخ الصورة" : "Copy Image")}</span>
          </button>

          <button
            onClick={shareNative}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition"
          >
            <Share2 className="w-4 h-4" />
            <span>{isRtl ? "مشاركة" : "Share"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}