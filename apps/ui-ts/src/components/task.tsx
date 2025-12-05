// src/components/Task.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';

import useTimerContext from '../state/timerContext';
import { TaskType, defaultTask } from "../types";
import { formatDateInput } from '../utils/dateHelper';

type Props = {
  task?: TaskType
  setDetailedTaskOverlay?: (task: TaskType) => void
  overlay?: boolean;
};

export default function Task({
  task=defaultTask,
  setDetailedTaskOverlay,
  overlay = false
}: Props) {
  const id = task.id;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  const timerContext = useTimerContext();

  const baseClass =
  'flex flex-col rounded-xl p-4 gap-3 bg-white shadow-sm hover:shadow-md transition-all duration-150 ring-1 ring-transparent hover:ring-violet-100';

  if (overlay) {
    return (
      <div className={`${baseClass} w-64`}>
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">{task.task_name}</div>
        </div>
        <div className="text-sm text-zinc-700 max-h-20 overflow-hidden">{task.description}</div>
        <div className="text-xs text-zinc-500 flex justify-end">Due: {formatDateInput(task.due)}</div>
      </div>
    );
  }


  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`${baseClass} ${isDragging ? 'opacity-50' : ''} user-select-none`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-zinc-900 truncate">{task.task_name}</div>
          <div className="text-sm text-zinc-700 max-h-20 overflow-auto pr-1 leading-relaxed">{task.description}</div>
          <div className="text-xs text-zinc-500 flex justify-start mt-2">Due: {formatDateInput(task.due)}</div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link
            className="px-3 py-1.5 text-xs rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            to="/"
            onClick={() => {
              timerContext.setTask(task.id);
              timerContext.setTime(task.timeset);
            }}
          >
            Focus
          </Link>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              onClick={() => setDetailedTaskOverlay(task)}
            >
              Details
            </button>
            <button
              {...listeners}
              type="button"
              aria-label={`Drag ${task.task_name}`}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-100 text-zinc-500 cursor-grab hover:bg-zinc-200"
            >
              Drag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
