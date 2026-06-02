"use client";

import * as React from "react";

import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppFormField } from "@/components/ui/app-form-field";
import { cn } from "@/lib/utils";

type AdminFormFieldProps = Omit<
  React.ComponentProps<typeof AppFormField>,
  "density" | "labelTone"
>;

export function AdminFormField(props: AdminFormFieldProps) {
  return <AppFormField density="compact" labelTone="quiet" {...props} />;
}

export function AdminEditorSection({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AppCard tone="soft" padding="md" className={cn("min-w-0 space-y-4", className)}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {eyebrow}
        </p>
        <AppCardTitle className="text-xl md:text-2xl">{title}</AppCardTitle>
        {description ? (
          <AppCardDescription>{description}</AppCardDescription>
        ) : null}
      </div>
      {children}
    </AppCard>
  );
}
