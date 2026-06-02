import * as React from "react";

import { cn } from "@/lib/utils";

export function AppTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[var(--radius-xl)] border border-input bg-surface-container-lowest px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-200 outline-none focus:border-role-accent focus:ring-4 focus:ring-role-accent-soft",
        className,
      )}
      {...props}
    />
  );
}
