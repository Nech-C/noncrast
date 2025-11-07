import React, { useState } from "react";
import Timer from "./Timer"
export default function Dashboard() {
    const [timerTime, setTimerTime] = useState(60);

    return (
    <div className="px-8 py-12 flex-row flex h-full font-mono">
        <div
          className="flex flex-col border h-full px-20 py-6"
        >
            <div>
              Current Task:
              <div className="border-2 h-20 mb-12 rounded-2xl">

              </div>
            </div>
            <Timer onTimeChange={(t) => {setTimerTime(t)}} initialSec={timerTime} />
        </div>

        <div>
          stats
        </div>
    </div>
    );
}