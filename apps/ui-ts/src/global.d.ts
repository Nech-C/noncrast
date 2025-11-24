import { TaskType } from './types';

export {};

declare global {
  interface Window {
    noncrast?: {
      getTasks?: () => Promise<import('./types').TaskType[]>;

      getMockTasks?: () => import('./types').TaskType[];

      createTask?: (
        input: import('./types').AddableTask
      ) => Promise<import('./types').TaskType>;

      updateTaskStatus?: (
        id: number,
        status: 'todo' | 'in-progress' | 'done'
      ) => Promise<void> | void;

      updateTask?: (
        updatedTask: TaskType
      ) => Promise<void>;

      deleteTask?: (
        taskId: TaskType['id']
      ) => Promise<boolean>;
    };
  }
}
