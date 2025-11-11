import React, { createContext, useContext, useEffect, useReducer } from 'react';
import {TaskType, AddableTask} from "../types"

const TodoStateContext = createContext<State>(undefined);

type State = {
  tasks: TaskType[];
}

type Action =
 | { type: "init"; payload: TaskType[] }
 | { type: "add"; payload: AddableTask }
 | { type: "remove"; payload: number }
 | { type: "update"; payload: TaskType }


function taskReducer(state: State, action: Action) {
  switch (action.type) {
    case "init":
      return { ...state, tasks: action.payload };
  }
}

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, { tasks: [] })

  useEffect(() => {
    dispatch({type: "init", payload: window.noncrast.getMockTasks()})
  }, []);

  return (
    <TodoStateContext.Provider value={state}>
      {children}
    </TodoStateContext.Provider>
  )
}

export function useTodoContext() {
  return useContext(TodoStateContext);
}