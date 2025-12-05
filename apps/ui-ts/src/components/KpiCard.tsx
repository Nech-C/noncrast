import React from "react";

type props = {
  name: string;
  content: string;
  width?: number;
  height?: number;
  onClick?: () => void;
}

export default function KpiCard({name, content, width=340, height=165, onClick}: props) {
  const clickable = typeof onClick === "function";
  const cls = `
    rounded-2xl border border-neutral-200
    flex flex-col justify-center text-center gap-3
    bg-white shadow-sm
    ${clickable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition" : ""}
  `;
  return (
    <div
      className={cls}
      style={{width, height}}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
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
