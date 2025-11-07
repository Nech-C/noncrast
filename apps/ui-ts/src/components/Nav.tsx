import { useEffect, useState } from "react";

type Selection = "dashboard" | "tasks";

type Props = {
  selected?: Selection;
  onChange?: (s: Selection) => void;
};

export default function Nav({ selected = "dashboard", onChange }: Props) {
  const [selectedTab, setSelectedTab] = useState<Selection>(selected);

  useEffect(() => setSelectedTab(selected), [selected]);

  const select = (s: Selection) => {
    setSelectedTab(s);
    onChange?.(s);
  };

  return (
    <nav className="border-b border-b-zinc-500">
      <div role="tablist" className="flex px-2.5 py-2.5 font-mono text-2xl">
        <button
          id="dashboard-tab"
          role="tab"
          aria-selected={selectedTab === "dashboard"}
          onClick={() => select("dashboard")}
          className={
            "mr-3 px-3 py-1 rounded-xl " +
            (selectedTab === "dashboard"
              ? "bg-violet-600 text-white"
              : "text-violet-600 hover:bg-violet-100")
          }
        >
          Dashboard
        </button>

        <button
          id="tasks-tab"
          role="tab"
          aria-selected={selectedTab === "tasks"}
          onClick={() => select("tasks")}
          className={
            "mr-3 px-3 py-1 rounded-xl " +
            (selectedTab === "tasks"
              ? "bg-violet-600 text-white"
              : "text-violet-600 hover:bg-violet-100")
          }
        >
          Tasks
        </button>
      </div>
    </nav>
  );
}
