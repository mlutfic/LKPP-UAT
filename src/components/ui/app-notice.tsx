import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function AppNotice({
  icon: Icon,
  title,
  description,
  tone = "role",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "role" | "warning" | "danger";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-amber-50/80 text-amber-800"
      : tone === "danger"
        ? "bg-red-50/80 text-red-800"
        : "bg-role-accent-soft/80 text-role-accent-strong";

  return (
    <div className={cn("flex items-start gap-3 rounded-[var(--radius-xl)] px-4 py-3 text-sm", toneClass)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="leading-6 opacity-90">{description}</p>
      </div>
    </div>
  );
}
