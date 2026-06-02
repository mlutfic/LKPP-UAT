import * as React from "react";

import { cn } from "@/lib/utils";

export const AppInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function AppInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-[var(--radius-xl)] border border-input bg-surface-container-lowest px-4 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-200 outline-none focus:border-role-accent focus:ring-4 focus:ring-role-accent-soft",
          className,
        )}
        {...props}
      />
    );
  },
);
