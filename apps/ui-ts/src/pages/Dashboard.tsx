import React from "react";

import Timer from "../components/Timer"
import KpiCard from "../components/KpiCard";

import useTimerContext from "../state/timerContext";
import { useTodoContext } from "../state/todoContext";

import FocusTask from "../components/FocusTask";
import { TaskType } from "../types";

const tempKipItems = [
  { name: "Hours spent", content: "1H4M1S" },
  { name: "Tasks completed", content: "2" },
  { name: "Distracted", content: "2" },
  { name: "Tasks In Progress", content: "3" },
  { name: "N/A1", content: "N/A" },
  { name: "N/A2", content: "N/A" },
];

export default function Dashboard() {
  const timerContext = useTimerContext();
  const todoContext = useTodoContext();

  function displayFocusTask(task: TaskType) {
    return (
      <FocusTask taskName={task.task_name} removeHandler={() => timerContext.unsetTask()} />
    )
  }

    return (
      <div className="px-30 py-12 flex-row flex h-full font-mono justify-between">
          <div
            className="flex flex-col border h-full px-20 py-6 rounded-2xl border-neutral-400 bg-white"
          >
              <div>
                Current Task:
                <div className="border-2 h-20 mb-12 rounded-2xl">
                  {
                    (timerContext.timerState.currentTaskId)
                    ? displayFocusTask(todoContext.tasks.find((t) => t.id == timerContext.timerState.currentTaskId))
                    : (<div></div>)

                  }
                  <div>
                    <p>
                      {}
                    </p>
                  </div>
                </div>
              </div>
              <Timer size={320} />
          </div>

          <div className="ml-5">
            <div className="grid grid-cols-2 grid-rows-3 gap-14">
              {tempKipItems.map((element) => {
                return (
                  <KpiCard name={element.name} content={element.content} key={element.name} />
                )
              })}
            </div>
          </div>
      </div>
    );
}