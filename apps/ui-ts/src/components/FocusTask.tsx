// src/components/Task.tsx
import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  taskName?: string;
  taskDesc?: string | null;
  taskDue?: string;
  removeHandler: () => void;
};

export default function FocusTask({
  taskName = 'Untitled',
  taskDesc = '',
  taskDue = '',
  removeHandler
}: Props) {

  return (
    <div
    >
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">{taskName}</div>
        <button onClick={removeHandler}>
          ❌
        </button>
      </div>
      <div className="text-sm text-zinc-700 max-h-20 overflow-auto">{taskDesc}</div>
      <div className="text-xs text-zinc-500 flex justify-end">Due: {taskDue}</div>
    </div>
  );
}
