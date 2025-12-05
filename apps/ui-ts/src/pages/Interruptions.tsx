import React, { useEffect, useMemo, useState } from "react";

import { FocusSession, Interruption, TaskType } from "../types";
import { useTodoContext } from "../state/todoContext";

type FlattenedInterruption = Interruption & {
  taskName: string;
  session?: FocusSession;
};

function formatDate(ts: number) {
  const date = new Date(ts);
  // Match the MM/DD/YY style used in the Figma frame.
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 8v5m0 3h.01" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        d="M9 4h6m-8 4h10m-8 0v9m6-9v9m-9 0h12l-1-12H6l-1 12Z"
      />
    </svg>
  );
}

export default function InterruptionsPage() {
  const { tasks } = useTodoContext();
  const [interruptions, setInterruptions] = useState<FlattenedInterruption[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const api = (typeof window !== "undefined" ? window.noncrast : undefined) || {};
        const fetchedSessions: FocusSession[] = (await api.getFocusSessions?.()) ?? [];
        const interruptionsBySession = await Promise.all(
          fetchedSessions.map(async (session) => {
            try {
              const list: Interruption[] = (await api.getInterruptionsBySession?.(session.id)) ?? [];
              return list.map((i) => ({ interruption: i, session }));
            } catch {
              return [];
            }
          })
        );

        if (!mounted) return;
        const flattened: FlattenedInterruption[] = interruptionsBySession
          .flat()
          .map(({ interruption, session }) => ({
            ...interruption,
            session,
            taskName: resolveTaskName(tasks, session),
          }));

        setInterruptions(flattened);
      } catch (err) {
        console.warn("Failed to load interruptions", err);
        if (mounted) setInterruptions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [tasks]);

  async function deleteInterruption(id: number) {
    if (deleting === id) return;
    setDeleting(id);
    try {
      await window.noncrast?.deleteInterruption?.(id);
      setInterruptions((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.warn("Failed to delete interruption", err);
    } finally {
      setDeleting(null);
    }
  }

  const sortedInterruptions = useMemo(
    () => [...interruptions].sort((a, b) => b.occurred_at - a.occurred_at),
    [interruptions]
  );

  return (
    <div className="bg-white h-full w-full">
      <div className="mx-auto max-w-6xl px-10 py-8 space-y-6">
        <header className="flex items-center gap-3 text-sm text-neutral-600">
          <div className="px-3 py-1 rounded-lg bg-violet-50 text-violet-700 font-medium">Dashboard</div>
          <div className="text-neutral-400">/</div>
          <div className="text-neutral-800 font-semibold">Interruptions</div>
        </header>

        {loading ? (
          <div className="text-neutral-600 text-sm">Loading interruptions…</div>
        ) : sortedInterruptions.length === 0 ? (
          <div className="border border-neutral-200 rounded-lg px-6 py-10 text-center text-neutral-600">
            No interruptions logged yet.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-300">
            {sortedInterruptions.map((item, idx) => (
              <div key={item.id ?? idx} className="flex items-center gap-8 py-6">
                <div className="h-[138px] w-[200px] flex-shrink-0 rounded-sm bg-neutral-200 overflow-hidden">
                  {item.screenshot_uri ? (
                    <img
                      src={item.screenshot_uri}
                      alt="Interruption screenshot"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex w-full items-start justify-between gap-8">
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-neutral-900 leading-tight">
                      {item.taskName || "Interruption"}
                    </div>
                    <p className="text-base text-neutral-500 leading-relaxed">
                      {item.type || item.note || "Screenshot of user playing a video game"}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-neutral-900">
                    <div className="text-right leading-6 min-w-[96px]">
                      <div>{formatDate(item.occurred_at)}</div>
                      <div>{formatTime(item.occurred_at)}</div>
                    </div>
                    <div className="flex items-center gap-4 text-neutral-800">
                      <button
                        type="button"
                        aria-label="Mark for retraining"
                        className="p-1 rounded hover:bg-neutral-100 transition-colors"
                      >
                        <AlertIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete interruption"
                        onClick={() => deleteInterruption(item.id)}
                        disabled={deleting === item.id}
                        className="p-1 rounded hover:bg-neutral-100 transition-colors disabled:opacity-50"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function resolveTaskName(tasks: TaskType[], session?: FocusSession) {
  if (!session) return "N/A";
  const task = tasks.find((t) => t.id === session.task_id);
  return task?.task_name || "N/A";
}
