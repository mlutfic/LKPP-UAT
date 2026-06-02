"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function AppAccordion({
  items,
  defaultValue,
}: {
  items: Array<{ value: string; title: string; content: React.ReactNode }>;
  defaultValue?: string;
}) {
  const [openValue, setOpenValue] = React.useState<string | null>(defaultValue ?? null);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const open = item.value === openValue;
        return (
          <div
            key={item.value}
            className="overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest"
          >
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => setOpenValue(open ? null : item.value)}
              aria-expanded={open}
            >
              <span className="font-semibold">{item.title}</span>
              <ChevronDown
                className={cn("size-4 transition-transform", open && "rotate-180")}
              />
            </button>
            {open ? (
              <div className="border-t border-border px-5 py-4 text-sm leading-6 text-muted-foreground">
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
