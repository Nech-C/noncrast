import { TaskType, FocusSession, Interruption, MlMsg } from './types';
import { Settings, SettingsUpdate } from './settings/schema';

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

      getFocusSessions?: () => Promise<FocusSession[]>;

      getFocusSessionById?: (
        id: FocusSession['id']
      ) => Promise<FocusSession | undefined>;

      getFocusSessionsByTask?: (
        taskId: FocusSession['task_id']
      ) => Promise<FocusSession[]>;

      getFocusSessionsByDateRange?: (
        start: number,
        end: number,
      ) => Promise<FocusSession[]>;

      createFocusSession?: (
        plannedMs: FocusSession['planned_ms'],
        taskId?: FocusSession['task_id'],
      ) => Promise<FocusSession>;

      updateFocusSession?: (
        session: FocusSession
      ) => Promise<FocusSession | undefined>;

      deleteFocusSessionsByTask?: (
        taskId: FocusSession['task_id']
      ) => Promise<number>;

      getInterruptionsBySession?: (
        sessionId: Interruption['session_id']
      ) => Promise<Interruption[]>;

      getInterruptionById?: (
        id: Interruption['id']
      ) => Promise<Interruption | undefined>;

      createInterruption?: (
        input: import('./types').AddableInterruption
      ) => Promise<Interruption>;

      captureAndCreateInterruption?: (
        input: import('./types').AddableInterruption
      ) => Promise<Interruption>;

      updateInterruption?: (
        input: Interruption
      ) => Promise<Interruption | undefined>;

      deleteInterruption?: (
        id: Interruption['id']
      ) => Promise<boolean>;

      getSettings?: () => Promise<Settings>;

      updateSettings?: (input: SettingsUpdate) => Promise<Settings>;

      resetSettings?: () => Promise<Settings>;

      startMonitoring?: () => Promise<void> | void;
      
      stopMonitoring?: () => Promise<void> | void;

      onMlResult?: (cb: (result: MlMsg) => void) => () => void;

      notify?: ({ title, body }: {title: string, body: string}) => void
    };
  }
}
