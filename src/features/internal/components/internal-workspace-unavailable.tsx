import { AlertTriangle } from "lucide-react";

import { AppCard } from "@/components/ui/app-card";

export function InternalWorkspaceUnavailable({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <AppCard tone="soft" padding="lg" className="space-y-4">
      <div className="inline-flex size-12 items-center justify-center rounded-full bg-role-accent-soft text-role-accent">
        <AlertTriangle className="size-5" />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </AppCard>
  );
}
