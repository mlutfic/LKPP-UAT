import * as React from "react";

import { cn } from "@/lib/utils";

export function AppCheckbox({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "mt-1 size-4 rounded border-input text-role-accent shadow-none focus:ring-2 focus:ring-role-accent-soft",
        className,
      )}
      {...props}
    />
  );
}
