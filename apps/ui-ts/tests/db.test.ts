import os from 'os';
import path from 'path';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

import { getTempDbPath } from "./utils";

vi.mock('electron', () => {
  return {
    app: {
      getPath: (loc: string) => {
        if (loc === 'userData') return path.join(os.tmpdir(), 'noncrast-test-electron-userData');
        return os.tmpdir();
      }
    }
  }; 
});

import { DbClient } from '../src/db';

describe("Test DbClient", () => {
  let tmp: ReturnType<typeof getTempDbPath>;
  let db: DbClient;

  beforeEach(() => {
    tmp = getTempDbPath();
    db = new DbClient(tmp.file);
  });

  afterEach(() => {
    try { db.close() } catch (err) { /* ignore */ }
    tmp.cleanup();
  });

  it('inserts a task and returns it with defaults', () => {
    const task = db.insertTask({ task_name: 'write test', description: 'test desc' });

    expect(task).toBeTruthy();
    expect(task.id).toBeGreaterThan(0);
    expect(task.status).toBe('todo');
    expect(task.created_at).toBeGreaterThan(0);
    expect(task.updated_at).toBeNull();
    expect(task.completed_at).toBeNull();
    expect(task.due).toBeNull();

    const fetched = db.getTaskById(task.id);
    expect(fetched).toBeDefined()
    expect(fetched.id).toBe(task.id);
    expect(fetched.task_name).toBe('write test');
  });

  it('getTaskById returns undefined for missing id', () => {
    const missing = db.getTaskById(999_999);
    expect(missing).toBeUndefined();
  });

  it('getTasksByStatus filters correctly and orders by created_at desc', () => {
    const a = db.insertTask({ task_name: 'A' });
    const b = db.insertTask({ task_name: 'B' });
    const c = db.insertTask({ task_name: 'C' });

    db.updateTaskStatus(b.id, 'in-progress');
    db.updateTaskStatus(c.id, 'done');

    const todos = db.getTasksByStatus('todo');
    expect(todos.some(t => t.id === a.id)).toBeTruthy();
    expect(todos.some(t => t.id === b.id)).toBeFalsy();
    expect(todos.some(t => t.id === c.id)).toBeFalsy();

    // ensure ordering: newer first
  
    const d = db.insertTask({ task_name: 'D' });
    const todos2 = db.getTasksByStatus('todo');
    expect(todos2[0].id).toBe(d.id);
  });

  it('inserts a task with due timestamp and retrieves it', () => {
    const due = Date.now() + 10_000;
    const t = db.insertTask({ task_name: 'with due', due });
    expect(t.due).toBe(due);

    const fetched = db.getTaskById(t.id);
    expect(fetched).toBeDefined();
    expect(fetched!.due).toBe(due);
  });

  it('updateTaskStatus sets updated_at and completed_at appropriately', () => {
    const t = db.insertTask({ task_name: 'toggle' });
    expect(t.completed_at).toBeNull();

    const done = db.updateTaskStatus(t.id, 'done');
    expect(done).toBeDefined();
    expect(done.status).toBe('done');
    expect(done.updated_at).toBeGreaterThan(0);
    expect(done.completed_at).toBeGreaterThan(0);

    const back = db.updateTaskStatus(t.id, 'in-progress');
    expect(back).toBeDefined();
    expect(back.status).toBe('in-progress');
    expect(back.completed_at).toBeNull();
  });

  it('deleteTask removes the row', () => {
    const t = db.insertTask({ task_name: 'to delete' });
    const ok = db.deleteTask(t.id);
    expect(ok).toBe(true);
    expect(db.getTaskById(t.id)).toBeUndefined();
  });

  it('updateTask updates an existing row', () => {
    let t = db.insertTask({ task_name: 'to update' });
    t.task_name = "updated";
    t.due = 0;
    db.updateTask(t);

    const updatedTask = db.getTaskById(t.id);
    expect(updatedTask).not.toBe(undefined);
    expect(updatedTask.task_name).toBe("updated");
    expect(updatedTask.due).toBe(0);
  })
});
