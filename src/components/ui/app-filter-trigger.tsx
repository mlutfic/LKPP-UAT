"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function AppFilterTrigger({
  icon: Icon,
  label,
  count = 0,
  active = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
        active
          ? "border-role-accent/18 bg-role-accent-soft text-role-accent-strong"
          : "border-border bg-surface-container-lowest text-foreground hover:bg-surface-container-low",
      )}
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="ml-1 inline-flex size-6 items-center justify-center rounded-full bg-role-accent text-[10px] font-bold leading-none text-role-accent-foreground shadow-sm"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
