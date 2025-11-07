import React, { useEffect, useRef, useState } from "react";

type Props = {
  size?: number;
  initialSec?: number;
  onComplete?: (time: number) => void;
  onTimeChange?: (newSec: number) => void
};




export default function Timer({ size = 360, initialSec = 5, onComplete, onTimeChange}: Props) {
  const [displayTime, setDisplayTime] = useState(initialSec);
  const [timeSet, setTimeSet] = useState(initialSec);

  const [running, setRunning] = useState(false);
  const totalTimePassed = useRef(0);
  const intervalIdRef = useRef(null);
  const lastStartTime = useRef(null);

  const minRef = useRef(null);
  const secRef = useRef(null);
  useEffect(() => {
    setTimeSet(initialSec);
    if (running) {
      setRunning(false);
      clearInterval(intervalIdRef.current);
      const sessionTimePassed = Date.now() - lastStartTime.current;
      totalTimePassed.current += sessionTimePassed;
    }
    setDisplayTime(Math.floor(initialSec - totalTimePassed.current/1000));
  }, [initialSec])


  function startTimer() {
    lastStartTime.current = Date.now();
    intervalIdRef.current = setInterval(() => {
      const sessionTimePassed = Date.now() - lastStartTime.current;
      const timeToDisplay = Math.floor(initialSec - (totalTimePassed.current + sessionTimePassed)/1000);
      if (timeToDisplay === 0) {
        return timeUp();
      }
      setDisplayTime(timeToDisplay);
    }, 200);
    setRunning(true);
  }

  function pauseTimer() {
    clearInterval(intervalIdRef.current);
    const sessionTimePassed = Date.now() - lastStartTime.current;
    totalTimePassed.current += sessionTimePassed;
    setDisplayTime(Math.floor(initialSec - totalTimePassed.current/1000));
    setRunning(false);
  }

  function timeUp() {
    clearInterval(intervalIdRef.current);
    totalTimePassed.current = initialSec * 1000;
    setDisplayTime(0);
    setRunning(false);
    onComplete(totalTimePassed.current);
  }

  function stopTimer() {
    clearInterval(intervalIdRef.current);
    const sessionTimePassed = Date.now() - lastStartTime.current;
    const recordedTime = totalTimePassed.current + sessionTimePassed;
    totalTimePassed.current = 0;
    setDisplayTime(initialSec);
    setRunning(false);
    onComplete(recordedTime);
  }

  function changeTime() {
    const rawM = minRef.current?.value ?? "";
    const rawS = secRef.current?.value ?? "";

    const m = parseInt(rawM.replace(/\D/g, ""), 10) || 0;        // 0 if NaN/empty
    let s = parseInt(rawS.replace(/\D/g, ""), 10) || 0;
    s = Math.min(59, Math.max(0, s));                   
  
    onTimeChange(m * 60 + s);
  }

  return (
    <div
      className="
        flex flex-col items-center justify-center gap-3 select-none
        rounded-full border-3 border-violet-500
        bg-gradient-to-b from-violet-50/50 to-white/50
        backdrop-blur-md shadow-[0_10px_30px_-10px_rgba(109,40,217,0.3)]
        font-mono tabular-nums tracking-tight
        p-6
      " 

      style={{ width: size, height: size }}
    >
      <div className="text-7xl font-semibold">
        {Math.floor(displayTime / 60).toString().padStart(2, "0")}
        :
        {Math.floor(displayTime % 60).toString().padStart(2, "0")}
      </div>
      <div
        className="text-3xl text-neutral-600 flex items-center"
      >
        <input
          type="text"
          ref={minRef}
          inputMode="numeric"
          size={Math.max(2, 2)}
          value={Math.floor(timeSet / 60).toString().padStart(2, "0")}
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
          value={Math.floor(timeSet % 60).toString().padStart(2, "0")}
          size={Math.max(2, 2)}
          onChange={changeTime}
          className="
            inline-block w-auto min-w-0 border-0 bg-transparent text-center
            focus:outline-none
            "
          />
      </div>
      {
        !running
        ? <button onClick={startTimer} className="bg-violet-500 text-white rounded-xl p-1">Start</button>
        : <button onClick={pauseTimer} className="bg-violet-500 text-white rounded-xl p-1">Pause</button>
      }

      <button onClick={stopTimer} className="bg-rose-500 text-white rounded-xl p-1">Stop</button>
    </div>
  );
}
