import * as React from "react";

import { cn } from "@/lib/utils";

export function AppSectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="space-y-2.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-balance">
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-start gap-3 md:items-center">{actions}</div> : null}
    </div>
  );
}
