import React, { useState } from "react";

export default function CaptionsPanel({ onAddCaption, currentTime, duration }) {
  const [captions, setCaptions] = useState([]);
  const [text, setText] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(3);
  const [editId, setEditId] = useState(null);

  const fmt = (s) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const addCaption = () => {
    if (!text.trim()) return;
    if (editId) {
      setCaptions(p => p.map(c => c.id === editId ? { ...c, text, startTime, endTime } : c));
      setEditId(null);
    } else {
      const c = { id: Date.now(), text, startTime, endTime };
      setCaptions(p => [...p, c]);
      onAddCaption?.(c);
    }
    setText("");
    setStartTime(endTime);
    setEndTime(endTime + 3);
  };

  const useCurrentTime = () => {
    setStartTime(parseFloat(currentTime?.toFixed(1) || 0));
    setEndTime(parseFloat(((currentTime || 0) + 3).toFixed(1)));
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-sm text-white">
      <p className="text-[11px] text-[#888] font-semibold uppercase tracking-wider">Add Caption</p>

      <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
        placeholder="Type caption text..."
        className="w-full bg-[#2a2a2a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm resize-none outline-none focus:border-[#00d4d4]" />

      <div className="flex gap-2 items-center">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] text-[#888]">Start (s)</label>
          <input type="number" value={startTime} min={0} step={0.1} onChange={e => setStartTime(+e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#333] rounded px-2 py-1 text-white text-xs outline-none" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] text-[#888]">End (s)</label>
          <input type="number" value={endTime} min={startTime + 0.5} step={0.1} onChange={e => setEndTime(+e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#333] rounded px-2 py-1 text-white text-xs outline-none" />
        </div>
        <button onClick={useCurrentTime}
          className="mt-4 px-2 py-1 rounded bg-[#2a2a2a] hover:bg-[#333] text-[10px] text-[#00d4d4] border border-[#333] transition whitespace-nowrap">
          Use Current
        </button>
      </div>

      <button onClick={addCaption} disabled={!text.trim()}
        className="w-full py-2.5 rounded-xl bg-[#00d4d4] hover:bg-[#00bfbf] text-black font-bold text-sm transition disabled:opacity-40">
        {editId ? "Update Caption" : "+ Add Caption"}
      </button>

      {captions.length > 0 && (
        <>
          <div className="w-full h-px bg-[#2a2a2a]" />
          <p className="text-[11px] text-[#888] font-semibold uppercase tracking-wider">Captions ({captions.length})</p>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {captions.map(c => (
              <div key={c.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-[#252525] border border-[#333] hover:border-[#444]">
                <div className="flex-1">
                  <p className="text-xs text-white">{c.text}</p>
                  <p className="text-[10px] text-[#666] mt-0.5">{fmt(c.startTime)} → {fmt(c.endTime)}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setText(c.text); setStartTime(c.startTime); setEndTime(c.endTime); setEditId(c.id); }}
                    className="text-[10px] text-[#00d4d4] hover:underline">Edit</button>
                  <button onClick={() => setCaptions(p => p.filter(x => x.id !== c.id))}
                    className="text-[10px] text-[#666] hover:text-red-400">✕</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}