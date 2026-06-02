"use client";

import * as React from "react";
import { CircleHelp } from "lucide-react";

import { cn } from "@/lib/utils";

type AppHoverNoteProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  triggerClassName?: string;
};

export function AppHoverNote({
  label,
  children,
  className,
  triggerClassName,
}: AppHoverNoteProps) {
  return (
    <div className={cn("group/hover-note relative", className)}>
      <button
        type="button"
        aria-label={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface-container-lowest text-muted-foreground transition-colors hover:border-role-accent/30 hover:text-role-accent focus-visible:border-role-accent/30 focus-visible:text-role-accent focus-visible:outline-none",
          triggerClassName,
        )}
      >
        <CircleHelp className="size-[18px]" />
      </button>

      <div className="pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-(--z-popover) w-80 translate-y-1 rounded-[var(--radius-xl)] border border-border bg-popover px-4 py-4 text-left opacity-0 shadow-(--shadow-float) transition-[opacity,transform] duration-200 group-hover/hover-note:translate-y-0 group-hover/hover-note:opacity-100 group-focus-within/hover-note:translate-y-0 group-focus-within/hover-note:opacity-100">
        {children}
      </div>
    </div>
  );
}
