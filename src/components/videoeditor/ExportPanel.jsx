import React from "react";

const SOCIAL_PLATFORMS = [
  { id: "tiktok", name: "TikTok", bg: "#000", icon: "https://cdn.simpleicons.org/tiktok/white" },
  { id: "tiktokads", name: "TikTok Ads Manager", bg: "#000", icon: "https://cdn.simpleicons.org/tiktok/white" },
  { id: "youtube", name: "YouTube", bg: "#FF0000", icon: "https://cdn.simpleicons.org/youtube/white" },
  { id: "ytshorts", name: "YouTube Shorts", bg: "#FF0000", icon: "https://cdn.simpleicons.org/youtube/white" },
  { id: "facebook", name: "Facebook Page", bg: "#1877F2", icon: "https://cdn.simpleicons.org/facebook/white" },
  { id: "instagram", name: "Instagram Reels", bg: "linear-gradient(135deg,#405DE6,#833AB4,#E1306C,#FD1D1D)", icon: "https://cdn.simpleicons.org/instagram/white" },
  { id: "schedule", name: "Schedule", bg: "#6366f1", icon: null, free: true },
];

export default function ExportPanel({ onClose, onDownload, hasClip }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="mt-12 mr-2 w-80 bg-white text-black rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">Export</h2>
        </div>

        <div className="px-4 py-3 flex flex-col gap-2">
          <button className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition w-full text-left">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Share for review</div>
              <div className="text-xs text-gray-400">People can add comments to your video.</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <button className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition w-full text-left">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Share as presentation</div>
              <div className="text-xs text-gray-400">People can only watch your video.</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div className="px-5 pb-1">
          <p className="text-xs font-semibold text-gray-700 mb-3">Share on social</p>
          <div className="grid grid-cols-4 gap-3">
            {SOCIAL_PLATFORMS.map((p) => (
              <button key={p.id} className="flex flex-col items-center gap-1 relative">
                {p.free && (
                  <span className="absolute -top-1 right-0 text-[8px] bg-purple-500 text-white px-1 rounded-full z-10">Free</span>
                )}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ background: p.bg }}
                >
                  {p.icon ? (
                    <img src={p.icon} alt={p.name} className="w-6 h-6 object-contain" onError={e => e.target.style.display='none'} />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 text-center leading-tight">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Download */}
        <div className="px-4 py-3 flex gap-2">
          <button
            onClick={onDownload}
            disabled={!hasClip}
            className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition text-left
              ${hasClip ? "border-gray-100 hover:bg-gray-50 cursor-pointer" : "border-gray-50 opacity-40 cursor-not-allowed"}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="text-sm font-semibold">Download</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className="ml-auto">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 hover:bg-gray-50 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#555">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}