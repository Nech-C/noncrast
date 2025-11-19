import React, { createContext, useState, useRef, useContext } from "react";

import defaults from '../config/defaults.json'

type TimerState = {
  running: boolean;
  timeLeftMs: number;  // in milliseconds
  timeSetMs: number;  // in milliseconds
  currentTaskId: number;
}

type TimerApi = {
  timerState: TimerState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  stop: () => void;
  setTime: (time: number) => void;
  setTask: (taskId: number) => void;
  unsetTask: () => void;
}

const TimerContext = createContext(undefined);

/**
 * Timer provider should keep two things: timer(state) and the current task(reference)
 * For tiemr, the provider stores total time set, time left, and functions to update them.
 * For current task, the provider keeps the reference id of a task for update time spent.
 */
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState>({
    running: false,
    timeLeftMs: defaults.timer.default_time,
    timeSetMs: defaults.timer.default_time,
    currentTaskId: undefined
  });
  
  const intervalIdRef = useRef(null);  // for setInterval termination
  const lastStartTime = useRef(null);
  const totalTimePassedMs = useRef(0);  // in milliseconds;
  // used to better handle time change when timer is on

  /**
   * Called when the time is up. Time up logic:
   * 1. clean up interval and change timer state
   * 2. TODO: update a task's timeSpent
   */
  function timeUp() {
    clearInterval(intervalIdRef.current);
    intervalIdRef.current = null;

    totalTimePassedMs.current = timerState.timeSetMs;
    setTimerState((oldState) => {
        return {...oldState, timeLeftMs: 0, running: false}
    })
  }


  /**
   * This function handles the main timer logic using setInterval and timestamp
   * Called to start and unpause the timer.
   */
  function start() {
    lastStartTime.current = Date.now();
    intervalIdRef.current = setInterval(() => {
      const sessionTimePassed = Date.now() - lastStartTime.current;
      const newTimeLeft = timerState.timeSetMs - totalTimePassedMs.current - sessionTimePassed;
      if (newTimeLeft <= 0) {
        return timeUp();
      }

      setTimerState((oldState) => {
        return {...oldState, timeLeftMs: newTimeLeft}
      })
       
    }, defaults.timer.refresh_rate);

    setTimerState((oldState) => {
        return {...oldState, running: true}
      })
  }

  /**
   * Pauses the timer
   */
  function pause() { 
    clearInterval(intervalIdRef.current);
    const sessionTimePassed = Date.now() - lastStartTime.current;
    totalTimePassedMs.current += sessionTimePassed;
    const newTimeLeft = timerState.timeSetMs - totalTimePassedMs.current - sessionTimePassed
    setTimerState((oldState) => {
        return {...oldState, timeLeftMs: newTimeLeft, running: false}
    })
  }

  /**
   * Reset the timer state. No updates to task will be made.
   */
  function reset() {
    totalTimePassedMs.current = 0;
    clearInterval(intervalIdRef.current);
    setTimerState((oldState) => {
        return {...oldState, timeLeftMs: timerState.timeSetMs, running: false};
    })
  }

  function stop() {
    if (timerState.running) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    // TODO: change update task
    
    totalTimePassedMs.current = 0;
    setTimerState(
      (oldState) => {
        return {...oldState, timeLeftMs: oldState.timeSetMs, running: false};
      }
    )
  }

  /**
   * This function sets the timer time. This DOESN'T stop the timer.
   * @param time the number of MILLISECONDS 
   */
  function setTime(time: number) {
    clearInterval(intervalIdRef.current);
    intervalIdRef.current = null;
    let newTimeLeft = time;
    if (timerState.running) {
      const sessionTimePassed = Date.now() - lastStartTime.current;
      newTimeLeft -= (sessionTimePassed + totalTimePassedMs.current);
    } else {
      newTimeLeft -= totalTimePassedMs.current;
    }
    setTimerState((oldState) => {
      return {...oldState, timeSetMs: time, timeLeftMs: newTimeLeft, running: false};
    })
  }

  /**
   * Sets the task that the timer associates with.
   * @param taskId the task id to be set
   */
  function setTask(taskId: number) {
    setTimerState((oldState) => {
      return {...oldState, currentTaskId: taskId};
    });
  }

  /**
   * Unsets the current task.
   */
  function unsetTask() {
    setTimerState((oldState) => {
      return {...oldState, currentTaskId: null};
    });
  }

  const api: TimerApi = {
    timerState,
    start,
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
  )
}

export default function useTimerContext() {
  return useContext(TimerContext)
}