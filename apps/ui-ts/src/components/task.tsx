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
  'flex flex-col border rounded-md p-2 gap-2 bg-white shadow-sm';

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
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">{task.task_name}</div>
        <button
          className="p-1 cursor-pointer touch-44"
          onClick={() => setDetailedTaskOverlay(task)}
        >
          ⚙️
        </button>
        <Link
          className="p-1 cursor-pointer touch-44"
          to="/"
          onClick={() => {
            timerContext.setTask(task.id);
            timerContext.setTime(task.timeset);
          }}
        >
          ▶
        </Link>
        <button
          {...listeners}
          type="button"
          aria-label={`Drag ${task.task_name}`}
          className="p-1 cursor-grab touch-44"
        >
          ☰
        </button>
      </div>
      <div className="text-sm text-zinc-700 max-h-20 overflow-auto">{task.description}</div>
      <div className="text-xs text-zinc-500 flex justify-end">Due: {formatDateInput(task.due)}</div>
    </div>
  );
}
