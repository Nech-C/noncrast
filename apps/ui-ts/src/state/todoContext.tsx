// src/state/todoContext.tsx
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { TaskType, AddableTask } from '../types';

type State = { tasks: TaskType[] };

type Action =
  | { type: 'init'; payload: TaskType[] }
  | { type: 'add'; payload: AddableTask }
  | { type: 'remove'; payload: TaskType['id'] }
  | { type: 'update'; payload: TaskType };

function taskReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'init':
      return { ...state, tasks: action.payload };
    case 'add':
      return { ...state, tasks: [...state.tasks, action.payload as TaskType] };
    case 'remove':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) };
    case 'update':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t)) };
    default:
      return state;
  }
}

// Action methods we expose from provider
type Actions = {
  updateTaskStatus: (taskOrId: TaskType | TaskType['id'], newStatus: TaskType['status']) => Promise<void>;
};

const TodoStateContext = createContext<State | undefined>(undefined);
const ActionsContext = createContext<Actions | undefined>(undefined);

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, { tasks: [] });

  // safer signature: accept either a Task object or id (callers can pass task to avoid stale reads)
  async function updateTaskStatus(taskOrId: TaskType | TaskType['id'], newStatus: TaskType['status']) {
    const rawId = typeof taskOrId === 'string' || typeof taskOrId === 'number' ? taskOrId : taskOrId.id;
    const idNum = Number(rawId);
    const task = typeof taskOrId === 'object' ? taskOrId : state.tasks.find((t) => Number(t.id) === idNum);
    if (!task) return;

    const updated: TaskType = { ...task, status: newStatus };

    // optimistic update
    dispatch({ type: 'update', payload: updated });

    try {
      if (typeof window !== 'undefined' && (window as any).noncrast?.updateTask) {
        // await so errors are caught
        await (window as any).noncrast.updateTask(idNum, newStatus);
      } else {
        console.warn('no backend API found at window.noncrast.updateTask — running offline.');
      }
    } catch (err) {
      console.error('Persist failed:', err);
      try {
        if (typeof window !== 'undefined' && (window as any).noncrast?.getTasks) {
          const fresh = await (window as any).noncrast.getTasks();
          if (Array.isArray(fresh)) dispatch({ type: 'init', payload: fresh });
        }
      } catch (refreshErr) {
        console.error('Refresh failed:', refreshErr);
      }
    }
  }

  // initial load (guard window.noncrast)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let initial: TaskType[] = [];
        const api = (typeof window !== 'undefined' ? (window as any).noncrast : undefined) || {};
        if (api.getTasks) {
          initial = await api.getTasks();
        } else if (api.getMockTasks) {
          initial = await api.getMockTasks();
        }
        if (mounted) dispatch({ type: 'init', payload: Array.isArray(initial) ? initial : [] });
      } catch (err) {
        console.error('Failed to load tasks:', err);
        if (mounted) dispatch({ type: 'init', payload: [] });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <TodoStateContext.Provider value={state}>
      <ActionsContext.Provider value={{ updateTaskStatus }}>{children}</ActionsContext.Provider>
    </TodoStateContext.Provider>
  );
}

export function useTodoContext() {
  const ctx = useContext(TodoStateContext);
  if (!ctx) throw new Error('useTodoContext must be used inside a TodoProvider');
  return ctx;
}

export function useTodoActions() {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useTodoActions must be used inside a TodoProvider');
  return ctx;
}
