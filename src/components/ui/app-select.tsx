import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function AppSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-12 w-full appearance-none rounded-[var(--radius-xl)] border border-input bg-surface-container-lowest px-4 pr-10 text-sm text-foreground transition-[border-color,box-shadow] duration-200 outline-none focus:border-role-accent focus:ring-4 focus:ring-role-accent-soft",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
