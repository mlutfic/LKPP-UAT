"use client";

import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <AppCard padding="lg" className="w-full max-w-lg space-y-4 text-center">
        <AppCardTitle>Halaman tidak berhasil dimuat</AppCardTitle>
        <AppCardDescription>
          Coba muat ulang halaman. Jika masih berlanjut, hubungi admin layanan LKPP.
        </AppCardDescription>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <AppButton size="lg" onClick={reset}>
            Coba Lagi
          </AppButton>
          <AppButton size="lg" variant="outline" onClick={() => window.location.assign("/")}>
            Kembali ke Beranda
          </AppButton>
        </div>
      </AppCard>
    </div>
  );
}
