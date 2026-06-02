"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function AppPageIntro({
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
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-2.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1 className="font-heading text-[1.75rem] font-bold tracking-tight text-balance md:text-[1.9rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
