import type { AddableTask } from '../types';

// Default tasks for development seeding (npm start)
export const devTasks: AddableTask[] = [
  // TODO tasks
  {
    task_name: 'Write project README',
    description: 'Draft README with architecture, setup, and next-steps for Noncrastinate.',
    status: 'todo',
    timeset: 1800,
    due: Date.now() + 2 * 24 * 60 * 60 * 1000,
  },
  {
    task_name: 'Design Kanban card layout',
    description: null,
    status: 'todo',
  },
  {
    task_name: 'Collect example interruption types',
    description: 'Survey top interruption types to display in the Interruption Log.',
    status: 'todo',
    due: Date.now() + 24 * 60 * 60 * 1000,
  },

  // IN-PROGRESS tasks
  {
    task_name: 'Implement TimerCard start/pause/stop',
    description: 'Hook TimerCard to createSession/finishSession via preload API.',
    status: 'in-progress',
    timespent: 900000,
    timeset: 1500000,
  },
  {
    task_name: 'DB adapter: async sqlite',
    description: 'Build async sqlite adapter and expose ipcMain handlers.',
    status: 'in-progress',
    timespent: 3600000,
  },
  {
    task_name: 'Task quick-add UX polish',
    description: 'Show top-3 preview and Start-from-task button.',
    status: 'in-progress',
    timespent: 300,
    timeset: 300,
  },

  // DONE tasks
  {
    task_name: 'Set default DB path',
    description: "Add env override and default to app.getPath('userData').",
    status: 'done',
  },
  {
    task_name: 'Preload API: expose basic methods',
    description: 'Expose createTask/getTasks/createSession/finishSession via contextBridge.',
    status: 'done',
  },
  {
    task_name: 'WAL journal_mode for durability',
    description: 'Enable PRAGMA journal_mode = WAL for DB durability.',
    status: 'done',
  },
];

