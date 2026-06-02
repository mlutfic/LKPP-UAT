import * as React from "react";

import { cn } from "@/lib/utils";

export function AppFilterBar({
  className,
  children,
  actions,
}: {
  className?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest p-5 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">{children}</div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
