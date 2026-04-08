import React from "react";

const TABS = [
  {
    id: "Media",
    label: "Media",
    icon: (active) => (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-[#2a2a2a]" : ""}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
    ),
  },
  {
    id: "Templates",
    label: "Templates",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <rect x="3" y="3" width="8" height="5" rx="1"/>
        <rect x="13" y="3" width="8" height="5" rx="1"/>
        <rect x="3" y="10" width="8" height="11" rx="1"/>
        <rect x="13" y="10" width="8" height="11" rx="1"/>
      </svg>
    ),
  },
  {
    id: "Elements",
    label: "Elements",
    icon: (active) => (
      <div className="relative">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
          <circle cx="8" cy="8" r="5"/>
          <rect x="13" y="13" width="8" height="8" rx="1"/>
          <path d="M16 3l3 5H13l3-5z"/>
        </svg>
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </div>
    ),
  },
  {
    id: "Audio",
    label: "Audio",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    id: "Text",
    label: "Text",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <polyline points="4 7 4 4 20 4 20 7"/>
        <line x1="9" y1="20" x2="15" y2="20"/>
        <line x1="12" y1="4" x2="12" y2="20"/>
      </svg>
    ),
  },
  {
    id: "Captions",
    label: "Captions",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M7 15h4M7 11h10"/>
      </svg>
    ),
  },
  {
    id: "Transcript",
    label: "Transcript",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="15" y2="18"/>
        <path d="M18 16l3 2-3 2v-4z" fill={active ? "#00d4d4" : "#888"} stroke="none"/>
      </svg>
    ),
  },
  {
    id: "Effects",
    label: "Effects",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    id: "Transitions",
    label: "Transitions",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <path d="M5 4h14M5 20h14"/>
        <path d="M8 8l-4 4 4 4"/>
        <path d="M16 8l4 4-4 4"/>
        <line x1="12" y1="4" x2="12" y2="20"/>
      </svg>
    ),
  },
  {
    id: "Filters",
    label: "Filters",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ),
  },
  {
    id: "BrandKit",
    label: "Brand kit",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="4"/>
        <line x1="12" y1="2" x2="12" y2="8"/>
        <line x1="12" y1="16" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="8" y2="12"/>
        <line x1="16" y1="12" x2="22" y2="12"/>
      </svg>
    ),
  },
  {
    id: "Plugins",
    label: "Plugins",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: "TransitionLibrary",
    label: "انتقالات",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <rect x="3" y="3" width="8" height="18" rx="1"/>
        <rect x="13" y="3" width="8" height="18" rx="1"/>
        <path d="M11 9l2 2-2 2M11 13l2 2-2 2"/>
      </svg>
    ),
  },
  {
    id: "Library",
    label: "مكتبة",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00d4d4" : "#888"} strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="2" y1="17" x2="22" y2="17"/>
        <line x1="6" y1="21" x2="6" y2="17"/>
        <line x1="10" y1="21" x2="10" y2="17"/>
        <line x1="14" y1="21" x2="14" y2="17"/>
        <line x1="18" y1="21" x2="18" y2="17"/>
      </svg>
    ),
  },
];

export default function VideoSidebar({ activeTab, onTabChange }) {
  return (
    <div className="w-[72px] bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col items-center py-2 gap-1 overflow-y-auto flex-shrink-0">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex flex-col items-center py-2 px-1 gap-1 rounded-lg transition ${isActive ? "text-[#00d4d4]" : "text-[#888] hover:text-white"}`}
          >
            {tab.icon(isActive)}
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}