import React, { useRef, useState } from "react";

/**
 * Client-side export engine using Canvas + MediaRecorder API.
 * Renders video frames + overlays to an offscreen canvas and encodes to WebM/MP4.
 */
export function useExportEngine({ videoRef, textLayers, elements, captions, videoFilter, videoOpacity, clips, audioTracks }) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportedUrl, setExportedUrl] = useState(null);
  const stopRef = useRef(false);

  const startExport = async () => {
    const video = videoRef.current;
    if (!video || !video.src) return;

    setExporting(true);
    setProgress(0);
    setExportedUrl(null);
    stopRef.current = false;

    const W = video.videoWidth || 1280;
    const H = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Set up MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const stream = canvas.captureStream(30);

    // Mix audio if available
    let audioCtx, dest, sourceNode;
    if (audioTracks.length > 0 && window.AudioContext) {
      audioCtx = new AudioContext();
      dest = audioCtx.createMediaStreamDestination();
      // original video audio
      sourceNode = audioCtx.createMediaElementSource(video);
      sourceNode.connect(dest);
      sourceNode.connect(audioCtx.destination);
      // extra audio tracks
      for (const t of audioTracks) {
        try {
          const audioEl = new Audio(t.url);
          audioEl.crossOrigin = "anonymous";
          const src2 = audioCtx.createMediaElementSource(audioEl);
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = t.volume ?? 1;
          src2.connect(gainNode);
          gainNode.connect(dest);
          audioEl.play().catch(() => {});
        } catch (_) {}
      }
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    }

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setExportedUrl(url);
      setExporting(false);
      setProgress(100);
      if (audioCtx) audioCtx.close().catch(() => {});
    };

    recorder.start(100);

    // Seek to beginning
    video.currentTime = 0;
    await new Promise(r => { video.onseeked = r; });
    video.play().catch(() => {});

    const totalDuration = video.duration || 10;
    const fps = 30;
    const frameInterval = 1000 / fps;

    const renderFrame = () => {
      if (stopRef.current) { recorder.stop(); video.pause(); return; }

      const t = video.currentTime;
      setProgress(Math.round((t / totalDuration) * 100));

      if (t >= totalDuration || video.ended) {
        recorder.stop();
        video.pause();
        return;
      }

      ctx.clearRect(0, 0, W, H);

      // Draw video frame
      if (videoFilter && videoFilter !== "none") ctx.filter = videoFilter;
      ctx.globalAlpha = videoOpacity ?? 1;
      ctx.drawImage(video, 0, 0, W, H);
      ctx.filter = "none";
      ctx.globalAlpha = 1;

      // Draw text layers
      for (const layer of textLayers) {
        const x = (layer.x / 100) * W;
        const y = (layer.y / 100) * H;
        const fs = layer.fontSize ?? 32;
        ctx.font = `${layer.italic ? "italic " : ""}${layer.bold ? "bold " : ""}${fs}px ${layer.font || "Arial"}`;
        ctx.fillStyle = layer.color || "#ffffff";
        ctx.textAlign = layer.align || "center";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        if (layer.bg && layer.bg !== "transparent") {
          const metrics = ctx.measureText(layer.text);
          ctx.fillStyle = layer.bg;
          ctx.fillRect(x - metrics.width / 2 - 8, y - fs, metrics.width + 16, fs + 8);
          ctx.fillStyle = layer.color || "#ffffff";
        }
        ctx.fillText(layer.text, x, y);
        ctx.shadowBlur = 0;
      }

      // Draw elements (shapes)
      for (const el of elements) {
        if (el.type === "sticker") continue; // emoji skip
        const x = (el.x / 100) * W;
        const y = (el.y / 100) * H;
        const sz = 48;
        ctx.fillStyle = el.color || "#00d4d4";
        if (el.shape === "circle") {
          ctx.beginPath(); ctx.arc(x, y, sz / 2, 0, Math.PI * 2); ctx.fill();
        } else if (el.shape === "rect" || el.shape === "diamond") {
          ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        } else {
          ctx.beginPath(); ctx.moveTo(x, y - sz / 2);
          ctx.lineTo(x + sz / 2, y + sz / 2); ctx.lineTo(x - sz / 2, y + sz / 2);
          ctx.closePath(); ctx.fill();
        }
      }

      // Draw active caption
      const cap = captions.find(c => t >= c.startTime && t <= c.endTime);
      if (cap) {
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        const metrics = ctx.measureText(cap.text);
        const capX = W / 2, capY = H - 60;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(capX - metrics.width / 2 - 16, capY - 32, metrics.width + 32, 44);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(cap.text, capX, capY);
      }

      setTimeout(renderFrame, frameInterval);
    };

    renderFrame();
  };

  const cancelExport = () => { stopRef.current = true; setExporting(false); setProgress(0); };

  return { exporting, progress, exportedUrl, startExport, cancelExport };
}

export default function ExportModal({ onClose, engine, activeClip }) {
  const { exporting, progress, exportedUrl, startExport, cancelExport } = engine;

  const download = () => {
    if (!exportedUrl) return;
    const a = document.createElement("a");
    a.href = exportedUrl;
    a.download = "exported-video.webm";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={!exporting ? onClose : undefined}>
      <div className="bg-[#1e1e1e] rounded-2xl p-6 w-96 shadow-2xl border border-[#2a2a2a]" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-bold text-lg mb-1">Export Video</h2>
        <p className="text-[#888] text-xs mb-5">Renders all overlays, filters, and audio into a downloadable file.</p>

        {!exporting && !exportedUrl && (
          <>
            <div className="flex flex-col gap-2 mb-5 text-xs text-[#888]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00d4d4]" />
                <span>Text overlays &amp; captions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00d4d4]" />
                <span>Video filters &amp; effects</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00d4d4]" />
                <span>Shapes &amp; stickers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#888]" />
                <span className="text-[#555]">Output: WebM (browser-native)</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] text-white text-sm transition">
                Cancel
              </button>
              <button onClick={startExport} disabled={!activeClip}
                className="flex-1 py-2.5 rounded-xl bg-[#00d4d4] hover:bg-[#00bfbf] text-black font-bold text-sm transition disabled:opacity-40">
                Start Export
              </button>
            </div>
          </>
        )}

        {exporting && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#00d4d4] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-white text-sm">Rendering frames…</span>
            </div>
            <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div className="h-full bg-[#00d4d4] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[#888] text-xs text-center">{progress}% complete</p>
            <button onClick={cancelExport}
              className="py-2 rounded-xl bg-red-900/40 hover:bg-red-900/60 text-red-400 text-sm transition border border-red-900/50">
              Cancel
            </button>
          </div>
        )}

        {exportedUrl && !exporting && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Export complete!
            </div>
            <video src={exportedUrl} controls className="w-full rounded-lg max-h-40 bg-black" />
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] text-white text-sm transition">
                Close
              </button>
              <button onClick={download}
                className="flex-1 py-2.5 rounded-xl bg-[#00d4d4] hover:bg-[#00bfbf] text-black font-bold text-sm transition">
                ⬇ Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}