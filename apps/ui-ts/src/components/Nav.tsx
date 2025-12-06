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

  const base = "mr-2 px-4 py-2 rounded-lg text-lg font-semibold transition-colors";
  const active = "bg-violet-50 text-violet-700 border border-violet-200";
  const inactive = "text-zinc-700 hover:bg-zinc-50";

  return (
    <nav className="border-b border-zinc-200 bg-white shadow-sm shrink-0">
      <div role="tablist" className="flex px-4 py-3 font-sans text-base">
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
