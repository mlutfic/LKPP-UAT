import * as React from "react";

import { cn } from "@/lib/utils";

export function AppTable({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest">
      <div className="overflow-x-auto">
        <table className={cn("min-w-full text-left text-sm", className)} {...props} />
      </div>
    </div>
  );
}

export function AppTableHead({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("border-b border-border bg-surface-container-low text-muted-foreground", className)}
      {...props}
    />
  );
}

export function AppTableHeaderCell({
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      className={cn("px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em]", className)}
      {...props}
    />
  );
}

export function AppTableRow({
  className,
  ...props
}: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-border last:border-0 hover:bg-surface-container-low/60", className)}
      {...props}
    />
  );
}

export function AppTableCell({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return <td className={cn("px-5 py-4 align-top", className)} {...props} />;
}
