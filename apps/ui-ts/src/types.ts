export type TaskType = {
  id: number;
  task_name: string | null;
  description: string | null;
  status: 'todo' | 'in-progress' | 'done';
  created_at: number | null;
  updated_at: number | null;
  completed_at: number | null;
  timespent: number | null;
  timeset: number | null;
  due: number | null;
};

export type AddableTask = {
  task_name?: string | null;
  description?: string | null;
  status?: TaskType['status'];
  timespent?: number | null;
  timeset?: number | null;
  due?: number | null;
}

export type FocusSession = {
  id: number;
  task_id: number | null;
  started_at: number;
  ended_at: number | null;
  planned_ms: number | null;
  focus_ms: number | null;
  status: 'active' | 'completed' | 'cancelled';
  notes: string | null;
}

export type Interruption = {
  id: number;
  session_id: number;
  occurred_at: number;
  duration_ms: number | null;
  type: string | null;
  note: string | null;
}

export type AddableInterruption = {
  session_id: Interruption['session_id'];
  occurred_at?: Interruption['occurred_at'];
  duration_ms?: Interruption['duration_ms'];
  type?: Interruption['type'];
  note?: Interruption['note'];
}

export type MlMsg = {
  id: number;
  label: string;
  score: number;
  offTrack: boolean;
}

export const defaultTask: TaskType = {
  id: 1,
  task_name: "chore",
  description: "1. clearn my desk \n2. water my plants",
  status: "todo",
  created_at: 0,
  updated_at: 0,
  due: 0,
  timeset: 0,
  timespent: 0,
  completed_at: null,
};
