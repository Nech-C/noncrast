import React, { createContext, useState, useRef, useContext } from "react";

import defaults from '../config/defaults.json'
import { FocusSession, MlMsg } from "../types";
import { useSettings } from "./settingsContext";

type TimerState = {
  running: boolean;
  paused: boolean;
  timeLeftMs: number;  // in milliseconds
  timeSetMs: number;   // in milliseconds
  currentTaskId: number | null | undefined;
  currentFocusSession: FocusSession | undefined;
}

type TimerApi = {
  timerState: TimerState;
  start: () => void;
  pause: () => void;
  unpause: () => void;
  reset: () => void;
  stop: () => void;
  setTime: (time: number) => void;
  setTask: (taskId: number) => void;
  unsetTask: () => void;
}

const TimerContext = createContext<TimerApi | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [timerState, setTimerState] = useState<TimerState>({
    running: false,
    paused: false,
    timeLeftMs: defaults.timer.default_time,
    timeSetMs: defaults.timer.default_time,
    currentTaskId: undefined,
    currentFocusSession: undefined,
  });
  
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStartTime = useRef<number | null>(null);
  const totalTimePassedMs = useRef(0);
  const currentSessionRef = useRef<FocusSession | undefined>(undefined);

  const detectionActiveRef = useRef(false);
  const mlLisener = useRef<() => void | null>(null);
  const detectionWindowRef = useRef<Array<{ ts: number; offTrack: boolean }>>([]);
  const eventCountRef = useRef(0); // number of threshold-trigger events this session
  const OFFTRACK_WINDOW_MS = 30_000; // TODO: make config
  // --- ML detection helpers ---

  function playAlertTone() {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (err) {
      console.warn('Failed to play alert tone', err);
    }
  }

  async function handleMlMsg(msg: MlMsg) {
    const now = Date.now();
    const windowRef = detectionWindowRef.current;
    const isOffTrack = !!msg.offTrack;

    windowRef.push({ ts: now, offTrack: isOffTrack });
    // keep only last minute
    const cutoff = now - OFFTRACK_WINDOW_MS;
    while (windowRef.length && windowRef[0].ts < cutoff) {
      windowRef.shift();
    }

    const total = windowRef.length;
    const offTrackCount = windowRef.filter((r) => r.offTrack).length;
    if (total === 0 || offTrackCount === 0) return;

    const threshold = Math.min(1, Math.max(0, settings.interruptionThreshold ?? 0.1));
    const ratio = offTrackCount / total;
    if (ratio < threshold) return;

    // Threshold hit: create interruption, notify, reset window
    detectionWindowRef.current = [];
    eventCountRef.current += 1;

    const session = currentSessionRef.current;
    if (session?.id) {
      try {
        await window.noncrast?.createInterruption?.({
          session_id: session.id,
          occurred_at: now,
          type: msg.label ?? 'ml-detected',
          note: `ratio=${(ratio * 100).toFixed(1)}%, total=${total}`,
        });
      } catch (err) {
        console.warn('Failed to log interruption', err);
      }
    }

    window.noncrast.notify({
      title: "Off-track detected",
      body: `About ${(ratio * 100).toFixed(0)}% of the last detections were off-track.`,
    });
    playAlertTone();

    const pauseTrigger = Math.max(1, settings.interruptionPauseTrigger ?? 3);
    if (eventCountRef.current >= pauseTrigger) {
      pause();
      window.noncrast.notify({
        title: "Timer paused",
        body: "Too many off-track alerts this session. Resume when ready.",
      });
    }
  }

  async function startDetection() {
    if (detectionActiveRef.current) return;
    if (!settings.enableDetection) return;
    try {
      const started = await window.noncrast?.startMonitoring?.();
      if (started === false) return;
      detectionActiveRef.current = true;
      detectionWindowRef.current = [];
      mlLisener.current = window.noncrast.onMlResult(handleMlMsg);
    } catch (err) {
      console.warn('Failed to start ML monitoring', err);
    }
  }

  function stopDetection() {
    if (!detectionActiveRef.current) return;
    try {
      window.noncrast?.stopMonitoring?.();
      mlLisener?.current();
      mlLisener.current = null;
    } catch (err) {
      console.warn('Failed to stop ML monitoring', err);
    } finally {
      detectionActiveRef.current = false;
      detectionWindowRef.current = [];
    }
  }

  function computeElapsedMs() {
    const ticking = intervalIdRef.current !== null;
    const sinceLastStart = ticking && lastStartTime.current
      ? Date.now() - lastStartTime.current
      : 0;
    return totalTimePassedMs.current + sinceLastStart;
  }

  async function finalizeSession(status: 'completed' | 'cancelled') {
    const session = currentSessionRef.current;
    if (!session) return;

    // When a session ends (completed or cancelled), stop detection
    stopDetection();
    eventCountRef.current = 0;
    detectionWindowRef.current = [];

    const focus_ms = computeElapsedMs();
    const ended_at = Date.now();

    try {
      await window.noncrast?.updateFocusSession?.({
        ...session,
        ended_at,
        focus_ms,
        status,
      });
    } catch (err) {
      console.warn('Failed to finalize focus session', err);
    }

    currentSessionRef.current = undefined;
    setTimerState((oldState) => ({
      ...oldState,
      currentFocusSession: undefined,
      paused: false,
      running: false,
    }));
  }

  function timeUp() {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    totalTimePassedMs.current = timerState.timeSetMs;

    // session completed => finalizeSession will stop detection
    finalizeSession('completed');

    setTimerState((oldState) => ({
      ...oldState,
      timeLeftMs: 0,
      running: false,
      paused: false,
    }));
  }

  async function start() {
    if (timerState.running || timerState.paused) return;

    totalTimePassedMs.current = 0;
    lastStartTime.current = Date.now();

    intervalIdRef.current = setInterval(() => {
      if (!lastStartTime.current) return;
      const sessionTimePassed = Date.now() - lastStartTime.current;
      const newTimeLeft = timerState.timeSetMs - totalTimePassedMs.current - sessionTimePassed;
      if (newTimeLeft <= 0) {
        return timeUp();
      }
      
      setTimerState((oldState) => ({
        ...oldState,
        timeLeftMs: newTimeLeft,
      }));
    }, defaults.timer.refresh_rate);
    
    setTimerState((oldState) => ({
      ...oldState,
      running: true,
      paused: false,
    }));
    
    try {
      const createSession = window.noncrast?.createFocusSession;
      if (!createSession) throw new Error('Session API not available');

      const newSession = await createSession(timerState.timeSetMs, timerState.currentTaskId);
      currentSessionRef.current = newSession;

      setTimerState((oldState) => ({
        ...oldState,
        currentFocusSession: newSession,
      }));

      eventCountRef.current = 0;
      detectionWindowRef.current = [];
      startDetection();
    } catch (err) {
      console.warn('Failed to start focus session', err);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setTimerState((oldState) => ({ ...oldState, running: false, paused: false }));
    }
  }

  function unpause() {
    if (timerState.running || !timerState.paused) return;

    lastStartTime.current = Date.now();
    intervalIdRef.current = setInterval(() => {
      if (!lastStartTime.current) return;
      const sessionTimePassed = Date.now() - lastStartTime.current;
      const newTimeLeft = timerState.timeSetMs - totalTimePassedMs.current - sessionTimePassed;
      if (newTimeLeft <= 0) {
        return timeUp();
      }

      setTimerState((oldState) => ({
        ...oldState,
        timeLeftMs: newTimeLeft,
      }));
    }, defaults.timer.refresh_rate);

    setTimerState((oldState) => ({
      ...oldState,
      running: true,
      paused: false,
    }));

    // NEW: resuming -> restart detection
    startDetection();
  }

  function pause() { 
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (lastStartTime.current) {
      const sessionTimePassed = Date.now() - lastStartTime.current;
      totalTimePassedMs.current += sessionTimePassed;
    }
    const newTimeLeft = timerState.timeSetMs - totalTimePassedMs.current;

    setTimerState((oldState) => ({
      ...oldState,
      timeLeftMs: newTimeLeft,
      running: false,
      paused: true,
    }));

    stopDetection();
  }

  function reset() {
    totalTimePassedMs.current = 0;
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    // session cancelled -> finalizeSession stops detection
    finalizeSession('cancelled');
    setTimerState((oldState) => ({
      ...oldState,
      timeLeftMs: timerState.timeSetMs,
      running: false,
      paused: false,
      currentFocusSession: undefined,
    }));
  }

  function stop() {
    if (timerState.running || timerState.paused) {
      if (lastStartTime.current) {
        const sessionTimePassed = Date.now() - lastStartTime.current;
        totalTimePassedMs.current += sessionTimePassed;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }
    
    // completed session -> finalizeSession stops detection
    finalizeSession('completed');
    totalTimePassedMs.current = 0;
    setTimerState((oldState) => ({
      ...oldState,
      timeLeftMs: oldState.timeSetMs,
      running: false,
      paused: false,
      currentFocusSession: undefined,
    }));
  }

  function setTime(time: number) {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    time = time ?? 0;
    let newTimeLeft = time;
    if (timerState.running) {
      if (lastStartTime.current) {
        const sessionTimePassed = Date.now() - lastStartTime.current;
        newTimeLeft -= (sessionTimePassed + totalTimePassedMs.current);
      }
    } else {
      newTimeLeft -= totalTimePassedMs.current;
    }
    setTimerState((oldState) => ({
      ...oldState,
      timeSetMs: time,
      timeLeftMs: newTimeLeft,
      running: false,
    }));
  }

  function setTask(taskId: number) {
    setTimerState((oldState) => ({
      ...oldState,
      currentTaskId: taskId,
    }));
  }

  function unsetTask() {
    setTimerState((oldState) => ({
      ...oldState,
      currentTaskId: null,
    }));
  }

  const api: TimerApi = {
    timerState,
    start,
    unpause,
    pause,
    reset,
    stop,
    setTime,
    setTask,
    unsetTask,
  };

  return (
    <TimerContext.Provider value={api}>
      {children}
    </TimerContext.Provider>
  );
}

export default function useTimerContext() {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error('useTimerContext must be used within TimerProvider');
  }
  return ctx;
}
