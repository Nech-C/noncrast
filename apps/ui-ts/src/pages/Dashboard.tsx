import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Timer from "../components/Timer";
import KpiCard from "../components/KpiCard";

import useTimerContext from "../state/timerContext";
import { useTodoContext } from "../state/todoContext";
import { useSettings } from "../state/settingsContext";

import FocusTask from "../components/FocusTask";
import { TaskType, FocusSession, Interruption } from "../types";

export default function Dashboard() {
  const timerContext = useTimerContext();
  const todoContext = useTodoContext();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [interruptionsBySession, setInterruptionsBySession] = useState<Record<number, Interruption[]>>({});
  const [range, setRange] = useState<"today" | "yesterday" | "past_week">("today");

  // derived task stats
  const tasksInProgress = useMemo(
    () => todoContext.tasks.filter((t) => t.status === "in-progress").length,
    [todoContext.tasks]
  );

  function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  function formatHourLabel(h: number) {
    const hour12 = ((h + 11) % 12) + 1;
    const suffix = h < 12 ? "AM" : "PM";
    const padded = hour12.toString().padStart(2, "0");
    return `${padded}:00 ${suffix}`;
  }

  function computeBounds(rangeKey: typeof range, endOfDayHour: number) {
    const now = Date.now();
    const msPerDay = 86_400_000;

    // Local boundary at the configured hour.
    const boundary = new Date();
    boundary.setHours(endOfDayHour, 0, 0, 0);
    const boundaryMs = boundary.getTime() > now ? boundary.setDate(boundary.getDate() - 1) : boundary.getTime();

    const latestBoundary = boundaryMs;

    const start = rangeKey === "today"
      ? latestBoundary
      : rangeKey === "yesterday"
        ? latestBoundary - msPerDay
        : latestBoundary - 7 * msPerDay;

    const end = rangeKey === "today"
      ? latestBoundary + msPerDay
      : latestBoundary; // yesterday & past week end at last boundary

    return { start, end };
  }

  const bounds = useMemo(() => computeBounds(range, settings.endOfDay), [range, settings.endOfDay]);

  function isWithin(ts: number | null | undefined) {
    if (ts == null) return false;
    return ts >= bounds.start && ts < bounds.end;
  }

  const sessionsInRange = useMemo(
    () => sessions.filter((s) => isWithin(s.started_at)),
    [sessions, bounds]
  );

  const hoursSpentMs = useMemo(() => {
    return sessionsInRange.reduce((sum, s) => sum + (s.focus_ms ?? 0), 0);
  }, [sessionsInRange]);

  const interruptionsCount = useMemo(() => {
    const all = Object.values(interruptionsBySession).flat();
    return all.filter((i) => isWithin(i.occurred_at)).length;
  }, [interruptionsBySession, bounds]);

  const tasksCompleted = useMemo(() => {
    return todoContext.tasks.filter((t) => t.status === "done" && isWithin(t.completed_at)).length;
  }, [todoContext.tasks, bounds]);

  function toDailyAverage(value: number) {
    if (range !== "past_week") return value;
    return value / 7;
  }

  function formatNumber(num: number) {
    if (Number.isInteger(num)) return String(num);
    return num.toFixed(1);
  }

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      try {
        const api = window.noncrast || {};
        const fetchedSessions: FocusSession[] = (await api.getFocusSessions?.()) ?? [];
        if (!mounted) return;
        setSessions(fetchedSessions);

        const interruptionEntries = await Promise.all(
          fetchedSessions.map(async (s) => {
            try {
              const list: Interruption[] = (await api.getInterruptionsBySession?.(s.id)) ?? [];
              return [s.id, list] as const;
            } catch {
              return [s.id, []] as const;
            }
          })
        );

        if (!mounted) return;
        setInterruptionsBySession(Object.fromEntries(interruptionEntries) as Record<number, Interruption[]>);
      } catch (err) {
        console.warn('Failed to load stats', err);
        if (mounted) {
          setSessions([]);
          setInterruptionsBySession({});
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
    { name: range === "past_week" ? "Hours spent (avg/day)" : "Hours spent", content: formatDuration(toDailyAverage(hoursSpentMs)) },
    { name: range === "past_week" ? "Tasks completed (avg/day)" : "Tasks completed", content: formatNumber(toDailyAverage(tasksCompleted)) },
    {
      name: range === "past_week" ? "Distracted (avg/day)" : "Distracted",
      content: formatNumber(toDailyAverage(interruptionsCount)),
      onClick: () => navigate("/interruptions"),
    },
    { name: "Tasks In Progress (today)", content: range === "today" ? String(tasksInProgress) : "—" },
  ];

  function displayFocusTask(task: TaskType) {
    return (
      <FocusTask taskName={task.task_name} removeHandler={() => timerContext.unsetTask()} />
    )
  }

  return (
    <main className="flex flex-row flex-wrap h-full w-full bg-violet-50 justify-between gap-20 px-12 py-10 items-start font-sans">
      {/** timer */}
      <section
        className="flex flex-col border px-14 py-8 rounded-2xl border-neutral-200 bg-white shadow-sm w-[420px] min-h-[520px]"
      >
        <div className="mb-10">
          <div className="text-sm font-semibold text-zinc-700 mb-2">Current Task</div>
          <div className="border border-neutral-200 h-24 mb-2 rounded-xl px-4 py-3 flex items-center bg-zinc-50">
            {
              (timerContext.timerState.currentTaskId)
                ? (() => {
                    const task = todoContext.tasks.find((t) => t.id == timerContext.timerState.currentTaskId);
                    return task ? displayFocusTask(task) : <div />;
                  })()
                : (<div className="text-zinc-400 text-sm">No task running</div>)

            }
          </div>
        </div>
        <Timer size={320} />
      </section>

      {/** stats */}
      <section className="flex-1 min-w-[520px] max-w-[]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Stats</h2>
          <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-white p-1 text-sm gap-1 shadow-sm">
            {[
              { key: "today", label: "Today" },
              { key: "yesterday", label: "Yesterday" },
              { key: "past_week", label: "Past Week" },
            ].map(({ key, label }) => {
              const active = range === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key as typeof range)}
                  className={`px-3 py-2 rounded-lg transition-colors duration-150 ${active ? "bg-violet-50 text-violet-700 border border-violet-200" : "text-zinc-700 hover:bg-zinc-50"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 grid-rows-2 gap-y-10 justify-items-center">
          {kpiItems.map((element) => (
            <KpiCard
              name={element.name}
              content={element.content}
              key={element.name}
              onClick={element.onClick}
            />
          ))}
        </div>
        <p className="text-sm text-zinc-500 mt-5">Based on your End of Day setting ({formatHourLabel(settings.endOfDay)}).</p>
      </section>
    </main>
  );
}
