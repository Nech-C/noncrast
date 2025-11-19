// src/pages/Tasks.tsx
import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter , useDroppable } from '@dnd-kit/core';

import Task from '../components/Task';
import { useTodoContext, useTodoActions } from '../state/todoContext';
import type { AddableTask , TaskType } from '../types';


function ColumnContainer({
  id,
  children,
}: {
  id: TaskType['status']
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      data-droppable-id={id}
      className="flex-1 min-h-0 flex flex-col border rounded-xl bg-white p-3 overflow-y-auto"
    >
      {children}
    </div>
  );
}

export default function TasksPage() {
  const { tasks } = useTodoContext();
  const { updateTaskStatus, addTask } = useTodoActions();

  // track the currently active (dragged) id to render DragOverlay
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');

  function handleDragStart(event: DragStartEvent) {
    const id = event.active?.id ? String(event.active.id) : null;
    setActiveId(id);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const active = event.active?.id ? String(event.active.id) : null;
    const over = event.over?.id ? String(event.over.id) : null;

    // clear overlay active state
    setActiveId(null);

    if (!active) return;

    // if over is one of the status strings, update
    if (over === 'todo' || over === 'in-progress' || over === 'done') {
      const task = tasks.find((t) => String(t.id) === active) as TaskType | undefined;
      if (!task) return;
      if (task.status === over) return; // nothing to do
      await updateTaskStatus(active, over as TaskType['status']);
    }

  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const desc = newDesc.trim();
    if (!name) return;
    const input: AddableTask = { task_name: name, description: desc || null, status: 'todo' };
    await addTask(input);
    setNewName('');
    setNewDesc('');
  }

  const columns = [
    { id: 'in-progress', title: 'In Progress' },
    { id: 'todo', title: 'To-do' },
    { id: 'done', title: 'Done' },
  ] as const;

  // helper to find the task object for activeId (for overlay)
  const activeTask = activeId ? tasks.find((t) => String(t.id) === activeId) : undefined;

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full py-6 px-4 box-border gap-4">
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-700">Task name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Write project README"
              className="border rounded px-2 py-1 min-w-[22rem]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-700">Description (optional)</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Short note"
              className="border rounded px-2 py-1 min-w-[22rem]"
            />
          </div>
          <button type="submit" className="bg-violet-600 text-white px-3 py-1 rounded-xl h-9">Add</button>
        </form>

        <div className="flex flex-row justify-around flex-1 box-border items-stretch gap-4 min-h-0">
        {columns.map((col) => (
          <section key={col.id} className="basis-xs flex flex-col min-h-0 gap-5">
            <h2 className="text-violet-500 text-3xl font-semibold text-center shrink-0">{col.title}</h2>
            <ColumnContainer id={col.id}>
              {tasks
                .filter((t) => t.status === col.id)
                .map((t) => (
                  <Task
                    key={String(t.id)}
                    id={String(t.id)}
                    taskName={t.task_name}
                    taskDesc={t.description ?? ''}
                    taskDue={t.due ? new Date(t.due).toLocaleDateString() : ''}
                  />
                ))}
            </ColumnContainer>
          </section>
        ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <Task
            id={String(activeTask.id)}
            taskName={activeTask.task_name}
            taskDesc={activeTask.description ?? ''}
            taskDue={activeTask.due ? new Date(activeTask.due).toLocaleDateString() : ''}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
