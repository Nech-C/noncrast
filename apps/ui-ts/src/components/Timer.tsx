import React, { useRef} from "react";
import useTimerContext from "../state/timerContext";

type Props = {
  size?: number;
};


export default function Timer({ size = 360}: Props) {
  const timerContext = useTimerContext();
  const minRef = useRef(null);
  const secRef = useRef(null);

  function changeTime() {
    const rawM = minRef.current?.value ?? "";
    const rawS = secRef.current?.value ?? "";

    const m = parseInt(rawM.replace(/\D/g, ""), 10) || 0;
    let s = parseInt(rawS.replace(/\D/g, ""), 10) || 0;
    s = Math.min(59, Math.max(0, s));

    timerContext.setTime((m * 60 + s) * 1000);
  }

  function getMinutePartFromMs(ms: number): string {
    return Math.floor(ms / 1000 / 60).toString().padStart(2, "0");
  }

  function getSecPartFromMs(ms: number): string {
    return Math.floor(ms / 1000 % 60).toString().padStart(2, "0");
  }

  const isRunning = timerContext.timerState.running;
  const isPaused = timerContext.timerState.paused;

  return (
    <div
      className="
        flex flex-col items-center justify-center gap-3 select-none
        rounded-full border-3 border-violet-500
        bg-linear-to-b from-violet-50/50 to-white/50
        backdrop-blur-md shadow-[0_10px_30px_-10px_rgba(109,40,217,0.3)]
        font-mono tabular-nums tracking-tight
        p-6
      " 

      style={{ width: size, height: size }}
    >
      <div className="text-7xl font-semibold">
        {getMinutePartFromMs(timerContext.timerState.timeLeftMs)}
        :
        {getSecPartFromMs(timerContext.timerState.timeLeftMs)}
      </div>
      <div
        className="text-3xl text-neutral-600 flex items-center border-b-neutral-500 border-b-2"
      >
        <input
          type="text"
          ref={minRef}
          inputMode="numeric"
          size={Math.max(2, 2)}
          value={getMinutePartFromMs(timerContext.timerState.timeSetMs)}
          onChange={changeTime}
          className="
            inline-block w-auto min-w-0 border-0 bg-transparent text-center
            focus:outline-none
            "
          />
        :
        <input
          type="text"
          inputMode="numeric"
          ref={secRef}
          value={getSecPartFromMs(timerContext.timerState.timeSetMs)}
          size={Math.max(2, 2)}
          onChange={changeTime}
          className="
            inline-block w-auto min-w-0 border-0 bg-transparent text-center
            focus:outline-none
            "
          />
      </div>
      {
        isRunning
        ? <button onClick={timerContext.pause} className="bg-violet-500 text-white rounded-xl px-3 py-1">Pause</button>
        : isPaused
          ? <button onClick={timerContext.unpause} className="bg-emerald-500 text-white rounded-xl px-3 py-1">Unpause</button>
          : <button onClick={timerContext.start} className="bg-violet-500 text-white rounded-xl px-3 py-1">Start</button>
      }
      {(isRunning || isPaused) && (
        <div className="flex gap-2">
          <button onClick={timerContext.stop} className="bg-rose-500 text-white rounded-xl px-3 py-1">Stop</button>
          <button onClick={timerContext.reset} className="bg-neutral-500 text-white rounded-xl px-3 py-1">Reset</button>
        </div>
      )}
      {!isRunning && !isPaused && (
        <button onClick={timerContext.reset} className="bg-neutral-500 text-white rounded-xl px-3 py-1">Reset</button>
      )}
    </div>
  );
}
