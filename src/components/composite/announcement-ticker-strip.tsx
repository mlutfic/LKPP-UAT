"use client";

import * as React from "react";
import { Megaphone, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type AnnouncementTickerItem = {
  id: string;
  label: string;
  title?: string;
  message?: string;
  startDate?: string;
  endDate?: string;
  tone?: "info" | "warning" | "danger";
};

function getToneClass(tone: AnnouncementTickerItem["tone"]) {
  if (tone === "warning" || tone === "danger") {
    return "text-foreground/84";
  }

  return "text-foreground/84";
}

export function AnnouncementTickerStrip({
  items,
  label = "Pengumuman",
  icon: Icon = Megaphone,
  className,
  duration,
  mobileDuration,
  onSelectItem,
}: {
  items: AnnouncementTickerItem[];
  label?: string;
  icon?: LucideIcon;
  className?: string;
  duration?: string;
  mobileDuration?: string;
  onSelectItem?: (item: AnnouncementTickerItem) => void;
}) {
  const normalizedItems = React.useMemo(
    () =>
      items.length
        ? items
        : [
            {
              id: "announcement-fallback",
              label: "Belum ada pengumuman aktif",
              tone: "info" as const,
            },
          ],
    [items],
  );
  const marqueeItems = React.useMemo(
    () => [...normalizedItems, ...normalizedItems],
    [normalizedItems],
  );
  const itemIsInteractive = typeof onSelectItem === "function";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-5",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 text-role-accent">
        <Icon className="size-4" />
        <span className="text-sm font-semibold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>

      <div className="hidden h-6 w-px shrink-0 bg-border md:block" />

      <div
        className="app-marquee-touch-surface group min-w-0 flex-1 overflow-hidden"
      >
        <div
          className={cn(
            "app-marquee-track group-hover:[animation-play-state:paused]",
            itemIsInteractive && "group-focus-within:[animation-play-state:paused]",
          )}
          style={{
            ["--marquee-duration" as string]:
              duration ?? `${Math.max(26, normalizedItems.length * 10)}s`,
            ["--marquee-duration-mobile" as string]:
              mobileDuration ?? duration ?? `${Math.max(26, normalizedItems.length * 10)}s`,
          }}
          aria-hidden="true"
        >
          {marqueeItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex shrink-0 items-center gap-4 pr-4"
            >
              {itemIsInteractive ? (
                <button
                  type="button"
                  className={cn(
                    "cursor-pointer text-left text-sm font-medium leading-6 whitespace-nowrap transition-opacity hover:opacity-80 focus:outline-none",
                    getToneClass(item.tone),
                  )}
                  onClick={() => onSelectItem?.(item)}
                >
                  {item.label}
                </button>
              ) : (
                <p
                  className={cn(
                    "text-sm font-medium leading-6 whitespace-nowrap",
                    getToneClass(item.tone),
                  )}
                >
                  {item.label}
                </p>
              )}
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
            </div>
          ))}
        </div>
        <p className="sr-only">{normalizedItems.map((item) => item.label).join(" • ")}</p>
      </div>
    </div>
  );
}
