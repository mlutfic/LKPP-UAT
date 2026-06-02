import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { AppBadge } from "@/components/ui/app-badge";
import { AppButton } from "@/components/ui/app-button";
import {
  AppCard,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from "@/components/ui/app-card";
import { AppNotice } from "@/components/ui/app-notice";
import {
  staffAccessGroups,
  staffAccessIntro,
} from "@/content/staff-access-content";

export function StaffAccessOverview() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {staffAccessIntro.eyebrow}
        </p>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-balance md:text-3xl">
            {staffAccessIntro.title}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            {staffAccessIntro.description}
          </p>
        </div>
      </div>

      <AppNotice
        icon={ShieldCheck}
        title="Login petugas berlaku untuk semua role internal"
        description="Resepsionis, unit organisasi, supervisor, humas monitoring, dan humas admin masuk dari halaman ini. Setelah autentikasi aktif, pengarahan dashboard akan mengikuti peran akun."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {staffAccessGroups.map((group) => (
          <AppCard key={group.role} padding="lg" className="flex h-full flex-col gap-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-role-accent-soft text-role-accent">
                  <group.icon className="size-5" />
                </div>
                <AppBadge tone="role">Area Internal</AppBadge>
              </div>

              <AppCardHeader>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.eyebrow}
                </p>
                <AppCardTitle className="text-xl">{group.title}</AppCardTitle>
                <AppCardDescription>{group.description}</AppCardDescription>
              </AppCardHeader>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Fitur utama
              </p>
              <div className="flex flex-wrap gap-2">
                {group.features.map((feature) => (
                  <span
                    key={feature.href}
                    className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface-container-low px-3 py-2 text-sm font-medium text-foreground"
                  >
                    {feature.label}
                  </span>
                ))}
              </div>
            </div>

            <Link href={group.loginHref} className="mt-auto">
              <AppButton variant="outline" size="lg" fullWidth>
                Gunakan Area Ini
                <ArrowRight className="size-4" />
              </AppButton>
            </Link>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
