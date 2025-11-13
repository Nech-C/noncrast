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
