import Link from "next/link";
import { ArrowLeft, Compass, Search } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";

export default function NotFound() {
  return (
    <PublicShell>
      <section className="mx-auto flex min-h-[70svh] max-w-7xl items-center px-6 py-20">
        <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
          <AppCard className="p-10 md:p-12">
            <div className="inline-flex items-center rounded-full bg-role-accent-soft px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Halaman Tidak Ditemukan
            </div>
            <div className="mt-6 space-y-4">
              <h1 className="font-heading text-4xl font-bold tracking-tight text-balance md:text-5xl">
                Halaman yang Anda cari tidak tersedia di portal LKPP.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                Tautan mungkin sudah berubah, halaman dipindahkan, atau alamat yang dimasukkan belum
                tepat. Kita arahkan kembali ke jalur yang paling relevan.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/">
                <AppButton size="lg">
                  Kembali ke Beranda
                  <ArrowLeft className="size-4" />
                </AppButton>
              </Link>
              <Link href="/layanan">
                <AppButton size="lg" variant="outline">
                  Buka Katalog Layanan
                  <Compass className="size-4" />
                </AppButton>
              </Link>
            </div>
          </AppCard>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
            <AppCard padding="lg">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-container-low text-role-accent">
                <Search className="size-5" />
              </div>
              <div className="mt-5 space-y-3">
                <AppCardTitle>Cari layanan yang benar</AppCardTitle>
                <AppCardDescription>
                  Gunakan katalog layanan untuk menemukan unit, direktorat, dan alur konsultasi yang
                  sesuai.
                </AppCardDescription>
              </div>
            </AppCard>

            <AppCard padding="lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Rute Cepat
              </p>
              <div className="mt-5 space-y-3 text-sm font-semibold">
                <Link href="/dashboard" className="block text-role-accent">
                  Dashboard Pengguna
                </Link>
                <Link href="/login/petugas" className="block text-role-accent">
                  Login Petugas
                </Link>
                <Link href="/register" className="block text-role-accent">
                  Registrasi Akun
                </Link>
              </div>
            </AppCard>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
