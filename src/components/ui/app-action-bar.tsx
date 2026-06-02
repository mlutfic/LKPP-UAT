import * as React from "react";

import { cn } from "@/lib/utils";

export function AppActionBar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest p-5 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-5",
        className,
      )}
      {...props}
    />
  );
}
