import React, { useEffect, useMemo, useState } from "react";

import Timer from "../components/Timer"
import KpiCard from "../components/KpiCard";

import useTimerContext from "../state/timerContext";
import { useTodoContext } from "../state/todoContext";

import FocusTask from "../components/FocusTask";
import { TaskType, FocusSession, Interruption } from "../types";

export default function Dashboard() {
  const timerContext = useTimerContext();
  const todoContext = useTodoContext();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [interruptionCount, setInterruptionCount] = useState(0);

  // derived task stats
  const tasksCompleted = useMemo(
    () => todoContext.tasks.filter((t) => t.status === 'done').length,
    [todoContext.tasks]
  );
  const tasksInProgress = useMemo(
    () => todoContext.tasks.filter((t) => t.status === 'in-progress').length,
    [todoContext.tasks]
  );

  const hoursSpentMs = useMemo(() => {
    return sessions.reduce((sum, s) => sum + (s.focus_ms ?? 0), 0);
  }, [sessions]);

  function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      try {
        const api = window.noncrast || {};
        const fetchedSessions: FocusSession[] = (await api.getFocusSessions?.()) ?? [];
        if (!mounted) return;
        setSessions(fetchedSessions);

        // fetch interruptions per session to get total count
        const perSessionCounts = await Promise.all(
          fetchedSessions.map(async (s) => {
            try {
              const list: Interruption[] = (await api.getInterruptionsBySession?.(s.id)) ?? [];
              return list.length;
            } catch {
              return 0;
            }
          })
        );
        if (!mounted) return;
        setInterruptionCount(perSessionCounts.reduce((a, b) => a + b, 0));
      } catch (err) {
        console.warn('Failed to load stats', err);
        if (mounted) {
          setSessions([]);
          setInterruptionCount(0);
        }
      }
    }

    loadStats();

    // Refresh periodically so stats stay current without remount
    const intervalId = setInterval(loadStats, 10_000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const kpiItems = [
    { name: "Hours spent", content: formatDuration(hoursSpentMs) },
    { name: "Tasks completed", content: String(tasksCompleted) },
    { name: "Distracted", content: String(interruptionCount) },
    { name: "Tasks In Progress", content: String(tasksInProgress) },
  ];

  function displayFocusTask(task: TaskType) {
    return (
      <FocusTask taskName={task.task_name} removeHandler={() => timerContext.unsetTask()} />
    )
  }

    return (
      <div className="px-30 py-12 flex-row flex h-full font-mono justify-between">
          <div
            className="flex flex-col border h-full px-20 py-6 rounded-2xl border-neutral-400 bg-white"
          >
              <div>
                Current Task:
                <div className="border-2 h-20 mb-12 rounded-2xl">
                  {
                    (timerContext.timerState.currentTaskId)
                    ? displayFocusTask(todoContext.tasks.find((t) => t.id == timerContext.timerState.currentTaskId))
                    : (<div></div>)

                  }
                  <div>
                    <p>
                      {}
                    </p>
                  </div>
                </div>
              </div>
              <Timer size={320} />
          </div>

          <div className="ml-5">
            <div className="grid grid-cols-2 grid-rows-2 gap-14">
              {kpiItems.map((element) => (
                <KpiCard name={element.name} content={element.content} key={element.name} />
              ))}
            </div>
          </div>
      </div>
    );
}
