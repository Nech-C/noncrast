import { useEffect, useState } from "react";
import { Link, useLocation } from 'react-router-dom';

type Selection = "dashboard" | "tasks" | "settings";

type Props = {
  selected?: Selection;
  onChange?: (s: Selection) => void;
};

export default function Nav({ selected = "dashboard", onChange }: Props) {
  const [selectedTab, setSelectedTab] = useState<Selection>(selected);
  const location = useLocation();

  useEffect(() => setSelectedTab(selected), [selected]);

  useEffect(() => {
    if (location.pathname.startsWith("/tasks")) setSelectedTab("tasks");
    else if (location.pathname.startsWith("/settings")) setSelectedTab("settings");
    else setSelectedTab("dashboard");
  }, [location.pathname]);

  const select = (s: Selection) => {
    setSelectedTab(s);
    onChange?.(s);
  };

  const base = "mr-3 px-3 py-1 rounded-xl";
  const active = "bg-violet-600 text-white";
  const inactive = "text-violet-600 hover:bg-violet-100";

  return (
    <nav className="border-b border-b-zinc-500 shrink-0">
      <div role="tablist" className="flex px-2.5 py-2.5 font-mono text-2xl">
        <Link
          to="/"
          id="dashboard-tab"
          role="tab"
          aria-selected={selectedTab === "dashboard"}
          onClick={() => select("dashboard")}
          className={`${base} ${selectedTab === "dashboard" ? active : inactive}`}
        >
          Dashboard
        </Link>

        <Link
          to="/tasks"
          id="tasks-tab"
          role="tab"
          aria-selected={selectedTab === "tasks"}
          onClick={() => select("tasks")}
          className={`${base} ${selectedTab === "tasks" ? active : inactive}`}
        >
          Tasks
        </Link>

        <Link
          to="/settings/general"
          id="settings-tab"
          role="tab"
          aria-selected={selectedTab === "settings"}
          onClick={() => select("settings")}
          className={`${base} ${selectedTab === "settings" ? active : inactive}`}
        >
          Settings
        </Link>
      </div>
    </nav>
  );
}
