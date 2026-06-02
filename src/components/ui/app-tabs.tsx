"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function AppTabs({
  tabs,
  defaultValue,
}: {
  tabs: Array<{ value: string; label: string; content: React.ReactNode }>;
  defaultValue?: string;
}) {
  const [activeTab, setActiveTab] = React.useState(defaultValue ?? tabs[0]?.value);

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-full border border-border bg-surface-container-low p-1">
        {tabs.map((tab) => {
          const active = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "min-h-11 rounded-full px-4 text-sm font-medium transition-colors",
                active
                  ? "bg-surface-container-lowest text-role-accent"
                  : "text-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div>{tabs.find((tab) => tab.value === activeTab)?.content}</div>
    </div>
  );
}
