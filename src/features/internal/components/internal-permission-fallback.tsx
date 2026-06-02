"use client";

import { useRouter } from "next/navigation";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { type AppRole } from "@/design-system/roles";

export function InternalPermissionFallback({
  role,
  currentPath,
  title,
  subtitle,
  message,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  role: AppRole;
  currentPath: string;
  title: string;
  subtitle: string;
  message: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const router = useRouter();

  return (
    <DashboardShell
      role={role}
      currentPath={currentPath}
      title={title}
      subtitle={subtitle}
    >
      <div className="space-y-6">
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="flex flex-wrap gap-3">
          <AppButton onClick={() => router.push(primaryHref)}>{primaryLabel}</AppButton>
          {secondaryHref && secondaryLabel ? (
            <AppButton variant="outline" onClick={() => router.push(secondaryHref)}>
              {secondaryLabel}
            </AppButton>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
