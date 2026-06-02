"use client";

import * as React from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { cn } from "@/lib/utils";

export type InternalDatePreset = "today" | "yesterday" | "tomorrow" | "custom";

const PRESET_LABELS: Record<InternalDatePreset, string> = {
  today: "Hari Ini",
  yesterday: "Kemarin",
  tomorrow: "Besok",
  custom: "Kalender",
};

function formatDateLabel(dateKey: string) {
  if (!dateKey) return "Pilih tanggal";
  const date = new Date(`${dateKey}T08:00:00+07:00`);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function InternalDatePresetControl({
  value,
  onChange,
  customDate,
  onCustomDateChange,
}: {
  value: InternalDatePreset;
  onChange: (value: InternalDatePreset) => void;
  customDate: string;
  onCustomDateChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const dateInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (!open) return;

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  React.useEffect(() => {
    if (open && value === "custom") {
      window.setTimeout(() => {
        dateInputRef.current?.showPicker?.();
        dateInputRef.current?.focus();
      }, 60);
    }
  }, [open, value]);

  const buttonLabel =
    value === "custom" && customDate
      ? `Kalender • ${formatDateLabel(customDate)}`
      : PRESET_LABELS[value];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-10 min-w-[180px] items-center gap-2 rounded-full border border-border bg-surface-container-lowest px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low",
          open && "border-role-accent/20 bg-role-accent-soft text-role-accent-strong",
        )}
      >
        <CalendarDays className="size-4" />
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown className="ml-auto size-4 opacity-60" />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.6rem)] z-(--z-popover) w-[min(22rem,calc(100vw-2rem))] rounded-[calc(var(--radius-2xl)+2px)] border border-border bg-popover p-3 shadow-(--shadow-float)">
          <div className="grid gap-2">
            {(Object.keys(PRESET_LABELS) as InternalDatePreset[]).map((preset) => {
              const active = preset === value;
              const label =
                preset === "custom" && value === "custom" && customDate
                  ? `${PRESET_LABELS[preset]} • ${formatDateLabel(customDate)}`
                  : PRESET_LABELS[preset];

              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onChange(preset);
                    if (preset !== "custom") {
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[var(--radius-xl)] px-3 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-role-accent-soft text-role-accent-strong"
                      : "text-foreground hover:bg-surface-container-low",
                  )}
                >
                  <span className="inline-flex size-5 items-center justify-center">
                    {active ? <Check className="size-4" /> : null}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>

          {value === "custom" ? (
            <div className="mt-3 space-y-3 rounded-[var(--radius-xl)] border border-border bg-surface-container-low p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Tanggal khusus
              </p>
              <AppInput
                ref={dateInputRef}
                type="date"
                value={customDate}
                onChange={(event) => onCustomDateChange(event.target.value)}
                className="h-11 text-sm"
              />
              <div className="flex justify-end gap-2">
                <AppButton
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    onChange("today");
                    setOpen(false);
                  }}
                >
                  Hari Ini
                </AppButton>
                <AppButton
                  size="xs"
                  onClick={() => setOpen(false)}
                >
                  Terapkan
                </AppButton>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
