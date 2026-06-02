"use client";

import type { LucideIcon } from "lucide-react";

import { AppCheckbox } from "@/components/ui/app-checkbox";

type InternalSettingRowProps = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: LucideIcon;
};

export function InternalSettingRow({
  title,
  description,
  checked,
  onChange,
  icon: Icon,
}: InternalSettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[24px] border border-border bg-surface-container-lowest px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-role-accent-soft text-role-accent">
          <Icon className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <label className="mt-1 flex shrink-0 items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {checked ? "Aktif" : "Nonaktif"}
        </span>
        <AppCheckbox checked={checked} onChange={(event) => onChange(event.target.checked)} />
      </label>
    </div>
  );
}
