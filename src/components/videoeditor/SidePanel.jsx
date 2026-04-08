import React from "react";
import MediaPanel from "./MediaPanel";
import TextPanel from "./panels/TextPanel";
import AudioPanel from "./panels/AudioPanel";
import EffectsPanel from "./panels/EffectsPanel";
import FiltersPanel from "./panels/FiltersPanel";
import TransitionsPanel from "./panels/TransitionsPanel";
import CaptionsPanel from "./panels/CaptionsPanel";
import ElementsPanel from "./panels/ElementsPanel";
import TranscriptPanel from "./panels/TranscriptPanel";
import BrandKitPanel from "./panels/BrandKitPanel";
import TemplatesPanel from "./panels/TemplatesPanel";
import TransitionLibraryPanel from "./panels/TransitionLibraryPanel";
import LibraryPanel from "./panels/LibraryPanel";

export default function SidePanel({ activeTab, clips, activeClipId, onSelectClip, onUpload, fileInputRef, callbacks, currentTime, hasVideoClip, videoRef, audioTracks, videoVolume, onVideoVolumeChange }) {
  if (!activeTab) return null;

  return (
    <div className="w-64 bg-[#1e1e1e] border-r border-[#2a2a2a] flex flex-col flex-shrink-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-[#2a2a2a] flex-shrink-0">
        <span className="text-[11px] font-bold text-[#aaa] uppercase tracking-wider">{activeTab}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === "Media" && (
          <MediaPanel
            clips={clips}
            activeClipId={activeClipId}
            onSelectClip={onSelectClip}
            onUpload={onUpload}
            fileInputRef={fileInputRef}
          />
        )}
        {activeTab === "Text" && (
          <TextPanel onAddText={callbacks.onAddText} />
        )}
        {activeTab === "Audio" && (
          <AudioPanel
            onAddAudio={callbacks.onAddAudio}
            onRemoveAudio={callbacks.onRemoveAudio}
            onSetVolume={callbacks.onSetVolume}
            onUpdateVolumePoints={callbacks.onUpdateVolumePoints}
            onExtractAudio={callbacks.onExtractAudio}
            hasVideoClip={hasVideoClip}
            audioTracks={audioTracks}
            videoVolume={videoVolume}
            onVideoVolumeChange={onVideoVolumeChange}
          />
        )}
        {activeTab === "Effects" && (
          <EffectsPanel onApplyEffect={callbacks.onApplyEffect} />
        )}
        {activeTab === "Filters" && (
          <FiltersPanel onApplyFilter={callbacks.onApplyFilter} />
        )}
        {activeTab === "Transitions" && (
          <TransitionsPanel onApplyTransition={callbacks.onApplyTransition} />
        )}
        {activeTab === "Captions" && (
          <CaptionsPanel onAddCaption={callbacks.onAddCaption} currentTime={currentTime} />
        )}
        {activeTab === "Elements" && (
          <ElementsPanel onAddElement={callbacks.onAddElement} />
        )}
        {activeTab === "Transcript" && (
          <TranscriptPanel videoRef={videoRef} hasVideoClip={hasVideoClip} />
        )}
        {activeTab === "BrandKit" && (
          <BrandKitPanel onAddText={callbacks.onAddText} onAddElement={callbacks.onAddElement} />
        )}
        {activeTab === "Templates" && (
          <TemplatesPanel onApplyTemplate={callbacks.onApplyTemplate} />
        )}
        {activeTab === "TransitionLibrary" && (
          <TransitionLibraryPanel onAddTransition={callbacks.onApplyTransition} />
        )}
        {activeTab === "Library" && (
          <LibraryPanel 
            onAddIcon={(icon) => callbacks.onAddElement?.({ type: "sticker", emoji: icon.emoji, name: icon.name })}
            onAddMusic={(music) => callbacks.onAddAudio?.({ name: music.name, url: "", duration: 135 })}
            onAddText={(text) => callbacks.onAddText?.(text)}
          />
        )}
        {activeTab === "Plugins" && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#2a2a2a] flex items-center justify-center text-2xl">🚀</div>
            <p className="text-xs text-[#666]">Coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}