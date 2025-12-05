// src/pages/Tasks.tsx
import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter , useDroppable } from '@dnd-kit/core';

import Task from '../components/Task';
import { useTodoContext, useTodoActions } from '../state/todoContext';
import TaskDetailOverlay from '../components/TaskDetailOverlay';
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
      className="flex-1 min-h-0 flex flex-col rounded-xl bg-transparent p-2 overflow-y-auto gap-3 custom-scrollbar"
    >
      {children}
    </div>
  );
}

export default function TasksPage() {
  const { tasks } = useTodoContext();
  const { updateTaskStatus, addTask } = useTodoActions();

  // track the currently active (dragged) id to render DragOverlay
  const [activeId, setActiveId] = useState<number | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');

  //
  const [detailOverlayTask, setDisplayOverlay] = useState<TaskType>(null);

  function handleDragStart(event: DragStartEvent) {
    const id = event.active?.id ? event.active.id : null;
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
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {(detailOverlayTask)
        ? (<TaskDetailOverlay task={detailOverlayTask} onClose={() => setDisplayOverlay(null)}/>)
        : null
      }
      <div className="flex flex-col h-full w-full bg-white py-8 px-10 box-border gap-8">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end border border-zinc-200 rounded-2xl bg-white shadow-sm px-6 py-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-zinc-700">Task name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Write project README"
              className="border border-zinc-300 rounded-lg px-3 py-2 min-w-[20rem] text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-zinc-700">Description (optional)</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Short note"
              className="border border-zinc-300 rounded-lg px-3 py-2 min-w-[20rem] text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg h-11 shadow-sm transition-colors">Add</button>
        </form>

        <div className="flex flex-row justify-around flex-1 box-border items-stretch gap-6 min-h-0">
          {columns.map((col) => (
            <section key={col.id} className="basis-xs flex flex-col min-h-0 gap-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold text-zinc-800">{col.title}</h2>
                <span className="text-xs text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
                  {tasks.filter((t) => t.status === col.id).length}
                </span>
              </div>
              <ColumnContainer id={col.id}>
                {tasks
                  .filter((t) => t.status === col.id)
                  .map((t) => (
                    <Task
                      key={String(t.id)}
                      task={t}
                      setDetailedTaskOverlay={setDisplayOverlay}
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
            task={activeTask}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
