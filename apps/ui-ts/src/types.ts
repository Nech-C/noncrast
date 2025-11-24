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