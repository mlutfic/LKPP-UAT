import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";

export function AppEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <AppCard padding="lg" className="flex flex-col items-start gap-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-role-accent-soft text-role-accent">
        <Icon className="size-6" />
      </div>
      <div className="space-y-2">
        <h3 className="font-heading text-xl font-bold tracking-tight">{title}</h3>
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionLabel ? (
        actionHref ? (
          <Link href={actionHref}>
            <AppButton>{actionLabel}</AppButton>
          </Link>
        ) : (
          <AppButton>{actionLabel}</AppButton>
        )
      ) : null}
    </AppCard>
  );
}
