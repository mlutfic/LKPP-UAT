"use client";

import { AppSessionLogoutButton } from "@/components/composite/app-session-logout-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";

export function MobileProfileLogoutSection({
  description = "Akhiri sesi aktif dari perangkat ini dan kembali ke halaman login.",
}: {
  description?: string;
}) {
  return (
    <AppCard padding="lg" className="space-y-4 lg:hidden">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          Akun
        </p>
        <AppCardTitle className="text-xl">Keluar dari sesi</AppCardTitle>
        <AppCardDescription className="max-w-none">
          {description}
        </AppCardDescription>
      </div>

      <AppSessionLogoutButton />
    </AppCard>
  );
}
