// src/components/Task.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';

import useTimerContext from '../state/timerContext';

type Props = {
  id: number;
  taskName?: string;
  taskDesc?: string | null;
  taskDue?: string;
  overlay?: boolean;
};

export default function Task({
  id,
  taskName = 'Untitled',
  taskDesc = '',
  taskDue = '',
  overlay = false,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  const baseClass =
  'flex flex-col border rounded-md p-2 gap-2 bg-white shadow-sm';

  if (overlay) {
    return (
      <div className={`${baseClass} w-64`}>
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">{taskName}</div>
        </div>
        <div className="text-sm text-zinc-700 max-h-20 overflow-hidden">{taskDesc}</div>
        <div className="text-xs text-zinc-500 flex justify-end">Due: {taskDue}</div>
      </div>
    );
  }

  const timerContext = useTimerContext();

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`${baseClass} ${isDragging ? 'opacity-50' : ''} user-select-none`}
    >
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">{taskName}</div>
        <Link
          type="button"
          className="p-1 cursor-pointer touch-44"
          to="/"
          onClick={() => timerContext.setTask(id)}
        >
          ▶
        </Link>
        <button
          {...listeners}
          type="button"
          aria-label={`Drag ${taskName}`}
          className="p-1 cursor-grab touch-44"
        >
          ☰
        </button>
      </div>
      <div className="text-sm text-zinc-700 max-h-20 overflow-auto">{taskDesc}</div>
      <div className="text-xs text-zinc-500 flex justify-end">Due: {taskDue}</div>
    </div>
  );
}
