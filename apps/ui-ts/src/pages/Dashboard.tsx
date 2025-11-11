import React, { useState } from "react";
import Timer from "../components/Timer"
import KpiCard from "../components/KpiCard";

const tempKipItems = [
  { name: "Hours spent", content: "1H4M1S" },
  { name: "Tasks completed", content: "2" },
  { name: "Distracted", content: "2" },
  { name: "Tasks In Progress", content: "3" },
  { name: "N/A", content: "N/A" },
  { name: "N/A", content: "N/A" },
];

export default function Dashboard() {
    const [timerTime, setTimerTime] = useState(60);

    return (
      <div className="px-30 py-12 flex-row flex h-full font-mono justify-between">
          <div
            className="flex flex-col border h-full px-20 py-6 rounded-2xl border-neutral-400 bg-white"
          >
              <div>
                Current Task:
                <div className="border-2 h-20 mb-12 rounded-2xl">

                </div>
              </div>
              <Timer onTimeChange={(t) => {setTimerTime(t)}} initialSec={timerTime} size={320} />
          </div>

          <div className="ml-5">
            <div className="grid grid-cols-2 grid-rows-3 gap-14">
              {tempKipItems.map((element) => {
                return (
                  <KpiCard name={element.name} content={element.content} />
                )
              })}
            </div>
          </div>
      </div>
    );
}