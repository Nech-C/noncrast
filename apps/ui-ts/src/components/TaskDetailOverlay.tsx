import React, { useState } from "react";
import { TaskType, defaultTask } from "../types";
import { useTodoActions } from "../state/todoContext";

import { parseDateInput, formatDateInput } from "../utils/dateHelper";
type Props = {
  task?: TaskType;
  onClose: () => void;
};

type Inputs = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export default function TaskDetailOverlay({ task = defaultTask, onClose }: Props) {
  const { updateTask, deleteTask } = useTodoActions();

  // Local editable copy of the task
  const [form, setForm] = useState<TaskType>(task);

  function handleChange(e: React.ChangeEvent<Inputs>) {
    const { name, value } = e.target;

    setForm((prev) => {
      // numeric fields (plain numbers)
      if (name === "timeset" || name === "timespent") {
        return {
          ...prev,
          [name]: value === "" ? null : Number(value),
        } as TaskType;
      }

      // date field stored as timestamp
      if (name === "due") {
        return {
          ...prev,
          due: parseDateInput(value),
        } as TaskType;
      }

      // status enum
      if (name === "status") {
        return {
          ...prev,
          status: value as TaskType["status"],
        };
      }

      // simple text fields
      if (name === "task_name" || name === "description") {
        return {
          ...prev,
          [name]: value,
        } as TaskType;
      }

      // unknown field: no change
      return prev;
    });
  }

  function handleSave() {
    updateTask(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="flex flex-col max-w-2xl w-full bg-white rounded-3xl border border-neutral-200 p-6 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-black">
            Task Detail
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-300 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-lg font-medium text-zinc-800">
            Title
          </label>
          <input
            name="task_name"
            className="w-full border rounded-xl px-3 py-2 text-base text-black"
            type="text"
            value={form.task_name ?? ""}
            onChange={handleChange}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <label className="text-lg font-medium text-zinc-800">
            Description
          </label>
          <textarea
            name="description"
            className="w-full min-h-[120px] border rounded-xl px-3 py-2 text-base text-black resize-y"
            value={form.description ?? ""}
            onChange={handleChange}
          />
        </div>

        {/* Status / Dates / Time info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-lg font-medium text-zinc-800">
              Status
            </label>
            <select
              name="status"
              className="border rounded-xl px-3 py-2 text-base text-black"
              value={form.status}
              onChange={handleChange}
            >
              <option value="in-progress">In Progress</option>
              <option value="todo">To-do</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Due (editable, timestamp-backed) */}
          <div className="flex flex-col gap-1">
            <label className="text-lg font-medium text-zinc-800">
              Due
            </label>
            <input
              name="due"
              className="border rounded-xl px-3 py-2 text-base text-black"
              type="date"
              value={formatDateInput(form.due)}
              onChange={handleChange}
            />
          </div>

          {/* Created At (read-only, timestamp-backed) */}
          <div className="flex flex-col gap-1">
            <label className="text-lg font-medium text-zinc-800">
              Created At
            </label>
            <input
              className="border rounded-xl px-3 py-2 text-base text-black"
              type="date"
              value={formatDateInput(form.created_at)}
              readOnly
            />
          </div>

          {/* Time Allocated */}
          <div className="flex flex-col gap-1">
            <label className="text-lg font-medium text-zinc-800">
              Time Allocated
            </label>
            <input
              name="timeset"
              type="number"
              className="border rounded-xl px-3 py-2 text-base text-black"
              value={form.timeset ?? 0}
              onChange={handleChange}
            />
          </div>

          {/* Time Spent */}
          <div className="flex flex-col gap-1">
            <label className="text-lg font-medium text-zinc-800">
              Time Spent
            </label>
            <input
              name="timespent"
              type="number"
              className="border rounded-xl px-3 py-2 text-base text-black"
              value={form.timespent ?? 0}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-5 py-2 rounded-2xl border border-zinc-300 text-lg font-semibold"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="px-5 py-2 rounded-2xl bg-zinc-900 text-white text-lg font-semibold"
            onClick={handleSave}
          >
            Save
          </button>

          <button
            type="button"
            className="px-5 py-2 rounded-2xl bg-red-500/80 text-white text-lg font-semibold"
            onClick={() => {
              deleteTask(form.id);
              onClose();
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
