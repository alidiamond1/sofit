"use client";

import { useState, type ReactNode } from "react";

export type SectionTab = { id: string; label: string; content: ReactNode };

/** Lightweight in-page tab switcher — reuses the existing exercise-chip pill style
 *  so it fits pages that already ship without pulling in a new tab component. */
export function SectionTabs({ tabs, defaultTabId }: { tabs: SectionTab[]; defaultTabId?: string }) {
  const [active, setActive] = useState(defaultTabId || tabs[0]?.id);
  const activeTab = tabs.find((tab) => tab.id === active) || tabs[0];

  return (
    <>
      <div className="exercise-chip-row section-tab-row" role="tablist">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            role="tab"
            aria-selected={tab.id === active}
            className={tab.id === active ? "exercise-chip active" : "exercise-chip"}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab?.content}
    </>
  );
}
