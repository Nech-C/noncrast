import React, {} from "react";

type props = {
  name: string;
  content: string;
  width?: number;
  height?: number;
}

export default function KpiCard({name, content, width=340, height=165}: props) {
  return (
    <div
      className="
        rounded-2xl border border-neutral-400
        flex flex-col justify-center text-center gap-4
        bg-white"
      style={{width, height}}>
      <p
        className="text-5xl font-mono"
      >
          {content}
      </p>
      <p
        className="text-2xl"
      >
        {name}
      </p>
    </div>
  )
}