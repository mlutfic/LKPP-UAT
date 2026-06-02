import * as React from "react";

import { AppFieldMessage } from "@/components/ui/app-field-message";
import { cn } from "@/lib/utils";

export function AppFormField({
  label,
  description,
  error,
  children,
  className,
  density = "default",
  labelTone = "default",
  controlId,
  descriptionId,
  errorId,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  density?: "default" | "compact";
  labelTone?: "default" | "quiet";
  controlId?: string;
  descriptionId?: string;
  errorId?: string;
}) {
  return (
    <div
      className={cn(
        density === "compact" ? "min-w-0 space-y-1.5" : "min-w-0 space-y-2.5",
        className,
      )}
    >
      <div className={cn(density === "compact" ? "space-y-0.5" : "space-y-1")}>
        <label
          htmlFor={controlId}
          id={controlId ? `${controlId}-label` : undefined}
          className={cn(
            "block text-muted-foreground",
            labelTone === "quiet"
              ? "text-xs font-medium tracking-normal"
              : "text-[11px] font-semibold uppercase tracking-[0.14em]",
          )}
        >
          {label}
        </label>
        {description ? (
          <AppFieldMessage id={descriptionId}>{description}</AppFieldMessage>
        ) : null}
      </div>
      {children}
      {error ? (
        <AppFieldMessage id={errorId} role="alert" tone="error">
          {error}
        </AppFieldMessage>
      ) : null}
    </div>
  );
}
