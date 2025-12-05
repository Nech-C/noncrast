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
        rounded-2xl border border-neutral-200
        flex flex-col justify-center text-center gap-3
        bg-white shadow-sm"
      style={{width, height}}>
      <p
        className="text-4xl font-semibold text-zinc-900"
      >
          {content}
      </p>
      <p
        className="text-base text-zinc-500"
      >
        {name}
      </p>
    </div>
  )
}
