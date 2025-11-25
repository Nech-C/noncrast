// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

import { TaskType, AddableTask, FocusSession, Interruption, AddableInterruption } from './types';
// import { getDb } from "./db";

const tasks: TaskType[] = [
  // TODO tasks
  {
    id: 1,
    task_name: "Write project README",
    description: "Draft README with architecture, setup, and next-steps for Noncrastinate.",
    status: "todo",
    created_at: 1761987600000, // 2025-11-01T09:00:00Z
    updated_at: 1761987600000,
    completed_at: null,
    timespent: null,
    timeset: 1800000, // 30 min planned
    due: 1762246800000, // 2025-11-03T09:00:00Z
  },
  {
    id: 2,
    task_name: "Design Kanban card layout",
    description: null,
    status: "todo",
    created_at: 1761638400000, // 2025-10-28T08:00:00Z
    updated_at: 1761912000000, // 2025-10-31T12:00:00Z (last touched)
    completed_at: null,
    timespent: null,
    timeset: 1200000, // 20 min
    due: null,
  },
  {
    id: 3,
    task_name: "Collect example interruption types",
    description: "Survey top interruption types to display in the Interruption Log.",
    status: "todo",
    created_at: 1762194000000, // 2025-11-03T18:20:00Z
    updated_at: 1762194000000,
    completed_at: null,
    timespent: null,
    timeset: null,
    due: 1762280400000, // 2025-11-04T18:20:00Z
  },

  // IN-PROGRESS tasks
  {
    id: 4,
    task_name: "Implement TimerCard start/pause/stop",
    description: "Hook TimerCard to createSession/finishSession via preload API.",
    status: "in-progress",
    created_at: 1762077600000, // 2025-11-02T10:00:00Z
    updated_at: 1762617600000, // 2025-11-08T16:00:00Z (recent work)
    completed_at: null,
    timespent: 900, // 15 min so far
    timeset: 1500000, // 25 min session
    due: 1762704000000, // 2025-11-09T16:00:00Z
  },
  {
    id: 5,
    task_name: "DB adapter: async sqlite",
    description: "Build async sqlite adapter and expose ipcMain handlers.",
    status: "in-progress",
    created_at: 1762353000000, // 2025-11-05T14:30:00Z
    updated_at: 1762429500000, // 2025-11-06T11:45:00Z
    completed_at: null,
    timespent: 3600000, // 1 hour worked
    timeset: null,
    due: null,
  },
  {
    id: 6,
    task_name: "Task quick-add UX polish",
    description: "Show top-3 preview and Start-from-task button.",
    status: "in-progress",
    created_at: 1762719300000, // 2025-11-09T20:15:00Z
    updated_at: 1762719300000,
    completed_at: null,
    timespent: 300, // 5 minutes
    timeset: 300000, // 5 min quick session
    due: 1762978500000, // 2025-11-12T20:15:00Z
  },

  // DONE tasks
  {
    id: 7,
    task_name: "Set default DB path",
    description: "Add env override and default to app.getPath('userData').",
    status: "done",
    created_at: 1761638400000, // 2025-10-28T08:00:00Z
    updated_at: 1761912000000, // 2025-10-31T12:00:00Z
    completed_at: 1761915600000, // 2025-10-31T13:00:00Z
    timespent: 600, // 10 minutes total
    timeset: null,
    due: 1762009200000, // 2025-11-01T15:00:00Z
  },
  {
    id: 8,
    task_name: "Preload API: expose basic methods",
    description: "Expose createTask/getTasks/createSession/finishSession via contextBridge.",
    status: "done",
    created_at: 1761987600000, // 2025-11-01T09:00:00Z
    updated_at: 1762194000000, // 2025-11-03T18:20:00Z
    completed_at: 1762197600000, // 2025-11-03T19:20:00Z
    timespent: 1800, // 30 minutes
    timeset: null,
    due: null,
  },
  {
    id: 9,
    task_name: "WAL journal_mode for durability",
    description: "Enable PRAGMA journal_mode = WAL for DB durability.",
    status: "done",
    created_at: 1761912000000, // 2025-10-31T12:00:00Z
    updated_at: 1761987600000, // 2025-11-01T09:00:00Z
    completed_at: 1761989400000, // 2025-11-01T09:30:00Z
    timespent: 120, // 2 minutes
    timeset: null,
    due: 1761993000000, // 2025-11-01T10:30:00Z
  },
];



contextBridge.exposeInMainWorld('noncrast', {
  // Prefer DB-backed tasks; renderer can fall back to getMockTasks in dev
  getTasks: (): Promise<TaskType[]> => ipcRenderer.invoke('db:getTasks'),
  getMockTasks: () => tasks,
  createTask: (input: AddableTask): Promise<TaskType> => ipcRenderer.invoke('db:createTask', input),
  updateTaskStatus: (id: TaskType['id'], status: TaskType['status']) => {
    // Ensure numeric id is sent across IPC
    ipcRenderer.send('db:updateTaskStatus', Number(id), status);
  },
  updateTask: (input: TaskType): Promise<null> => ipcRenderer.invoke('db:updateTask', input),
  deleteTask: (input: TaskType['id']): Promise<boolean> => ipcRenderer.invoke('db:deleteTask', input),
  getFocusSessions: (): Promise<FocusSession[]> => ipcRenderer.invoke('db:getFocusSessions'),
  getFocusSessionById: (id: FocusSession['id']): Promise<FocusSession | undefined> =>
    ipcRenderer.invoke('db:getFocusSessionById', id),
  getFocusSessionsByTask: (taskId: FocusSession['task_id']): Promise<FocusSession[]> =>
    ipcRenderer.invoke('db:getFocusSessionsByTask', taskId),
  getFocusSessionsByDateRange: (start: number, end: number): Promise<FocusSession[]> =>
    ipcRenderer.invoke('db:getFocusSessionsByDateRange', start, end),
  createFocusSession: (plannedMs: FocusSession['planned_ms'], taskId?: FocusSession['task_id']): Promise<FocusSession> =>
    ipcRenderer.invoke('db:createFocusSession', plannedMs, taskId),
  updateFocusSession: (session: FocusSession): Promise<FocusSession | undefined> =>
    ipcRenderer.invoke('db:updateFocusSession', session),
  deleteFocusSessionsByTask: (taskId: FocusSession['task_id']): Promise<number> =>
    ipcRenderer.invoke('db:deleteFocusSessionsByTask', taskId),

  getInterruptionsBySession: (sessionId: Interruption['session_id']): Promise<Interruption[]> =>
    ipcRenderer.invoke('db:getInterruptionsBySession', sessionId),
  getInterruptionById: (id: Interruption['id']): Promise<Interruption | undefined> =>
    ipcRenderer.invoke('db:getInterruptionById', id),
  createInterruption: (input: AddableInterruption): Promise<Interruption> =>
    ipcRenderer.invoke('db:createInterruption', input),
  updateInterruption: (input: Interruption): Promise<Interruption | undefined> =>
    ipcRenderer.invoke('db:updateInterruption', input),
  deleteInterruption: (id: Interruption['id']): Promise<boolean> =>
    ipcRenderer.invoke('db:deleteInterruption', id),
})
