import React, { useEffect, useRef, useState } from "react";

type Props = {
  size?: number;
  initialSec?: number;
  onComplete?: () => void;
};

function formatHMS(totalSec: number) {
  totalSec = Math.max(0, Math.floor(totalSec));
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function parseHMS(text: string): number | null {
  const parts = text.trim().split(":").map(p => p.trim());
  if (parts.some(p => p === "" || Number.isNaN(Number(p)))) return null;
  let h = 0, m = 0, s = 0;
  if (parts.length === 1) s = Number(parts[0]);
  else if (parts.length === 2) { m = Number(parts[0]); s = Number(parts[1]); }
  else if (parts.length === 3) { h = Number(parts[0]); m = Number(parts[1]); s = Number(parts[2]); }
  else return null;
  if (m < 0 || m > 59 || s < 0 || s > 59 || h < 0) return null;
  return h * 3600 + m * 60 + s;
}

export default function Timer({ size = 360, initialSec = 1800, onComplete }: Props) {
  const [initial, setInitial] = useState<number>(initialSec);
  const [remaining, setRemaining] = useState<number>(initialSec);
  const [running, setRunning] = useState(false);

  const [editingInit, setEditingInit] = useState(false);
  const [initDraft, setInitDraft] = useState(formatHMS(initial));

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
      return;
    }
    const loop = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      setRemaining(prev => {
        const next = Math.max(0, prev - dt);
        if (prev > 0 && next === 0) {
          setRunning(false);
          onComplete?.();
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [running, onComplete]);

  useEffect(() => {
    setInitial(initialSec);
    setInitDraft(formatHMS(initialSec));
    if (!running) setRemaining(initialSec);
  }, [initialSec, running]);

  const handleStartPause = () => {
    if (remaining <= 0) setRemaining(initial);
    setRunning(r => !r);
  };

  const handleStop = () => {
    setRunning(false);
    setRemaining(initial);
  };

  const commitInitialFromDraft = () => {
    const parsed = parseHMS(initDraft);
    if (parsed != null) {
      const clamped = Math.max(0, parsed);
      setInitial(clamped);
      if (!running) setRemaining(clamped);
    } else {
      setInitDraft(formatHMS(initial));
    }
    setEditingInit(false);
  };

  return (
    <div
      className="rounded-full border border-violet-500 flex flex-col items-center justify-center gap-2 select-none"
      style={{ width: size, height: size }}
    >
      <div
        className="font-[tabular-nums] leading-none"
        style={{ fontSize: size * 0.16 }}
        aria-live="polite"
      >
        {formatHMS(remaining)}
      </div>

      {/* Smaller, editable initial time */}
      <div
        className="text-gray-500"
        style={{ fontSize: size * 0.08 }}
      >
        {editingInit ? (
          <input
            autoFocus
            value={initDraft}
            onChange={e => setInitDraft(e.target.value)}
            onBlur={commitInitialFromDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitInitialFromDraft();
              if (e.key === "Escape") {
                setInitDraft(formatHMS(initial));
                setEditingInit(false);
              }
            }}
            className="text-center border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
            style={{ width: Math.max(8, initDraft.length) + "ch" }}
            aria-label="Edit initial time (HH:MM:SS)"
          />
        ) : (
          <button
            type="button"
            title="Click to set initial time (HH:MM:SS)"
            className="cursor-text"
            onClick={() => setEditingInit(true)}
          >
            {formatHMS(initial)}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-2">
        <button
          className="px-5 py-2.5 rounded-2xl bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
          onClick={handleStartPause}
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          className="px-5 py-2.5 rounded-2xl bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          onClick={handleStop}
        >
          Stop
        </button>
      </div>
    </div>
  );
}
