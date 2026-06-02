import Link from "next/link";
import { Clock3, MapPin, PhoneCall } from "lucide-react";

import { lkppBrand } from "@/design-system/site";

import { LogoLockup } from "./logo-lockup";

const standaloneQuickLinks = [
  { href: "/login", label: "Masuk Pengguna" },
  { href: "/login/petugas", label: "Masuk Petugas" },
  { href: "/layanan", label: "Katalog Layanan" },
  { href: "/jadwal-saya", label: "Jadwal Saya" },
  { href: "/bantuan", label: "Bantuan" },
] as const;

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface-container-lowest">
      <div data-footer-mode="web" className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 text-sm text-muted-foreground lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <div className="space-y-3">
              <LogoLockup compact />
              <p>Portal layanan digital pengadaan barang dan jasa pemerintah.</p>
            </div>
            <p className="max-w-sm leading-6">
              Layanan publik LKPP dirancang agar jadwal, antrean, dan komunikasi layanan lebih tertib,
              transparan, dan mudah dipantau.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Alamat
            </p>
            <div className="flex items-start gap-3 leading-6">
              <MapPin className="mt-0.5 size-4 text-role-accent" />
              <div>
                <p className="font-semibold text-foreground">Kompleks Rasuna Epicentrum</p>
                <p>Jl. Epicentrum Tengah Lot 11B, Jakarta Selatan, DKI Jakarta 12940</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Jam Layanan
            </p>
            <div className="space-y-4 leading-6">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-4 text-role-accent" />
                <div>
                  <p className="font-semibold text-foreground">Senin - Jumat</p>
                  <p>09:00 - 14:00 WIB</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <PhoneCall className="mt-0.5 size-4 text-role-accent" />
                <div>
                  <p className="font-semibold text-foreground">Kontak Layanan</p>
                  <p>(021) 2993 5500</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Tautan Cepat
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/login">Masuk Pengguna</Link>
              <Link href="/register">Daftar Akun</Link>
              <Link href="/layanan">Katalog Layanan</Link>
              <Link href="/jadwal-saya">Jadwal Saya</Link>
              <Link href="/panduan">Panduan</Link>
              <Link href="/bantuan">Bantuan</Link>
              <Link href="/login/petugas">Masuk Petugas</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {lkppBrand.shortName}. Portal layanan publik digital yang lebih terstruktur dan mudah diakses.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/panduan">Panduan Layanan</Link>
            <Link href="/bantuan">Kontak Kami</Link>
          </div>
        </div>
      </div>

      <div data-footer-mode="standalone" className="mx-auto hidden max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-[32px] border border-border bg-white px-5 py-5 shadow-[0_16px_36px_rgba(25,28,29,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <LogoLockup compact />
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Portal layanan publik LKPP untuk jadwal, antrean, dan informasi layanan.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full bg-role-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              PWA
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {standaloneQuickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center justify-center rounded-full border border-border bg-surface-container-low px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-role-accent/30 hover:bg-role-accent-soft/70 hover:text-role-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-5 grid gap-3 rounded-[24px] bg-surface-container-low px-4 py-4 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Alamat
              </p>
              <p className="leading-6">
                Kompleks Rasuna Epicentrum, Jl. Epicentrum Tengah Lot 11B, Jakarta Selatan.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Jam Layanan
              </p>
              <p className="leading-6">Senin - Jumat, 09:00 - 14:00 WIB</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Kontak
              </p>
              <p className="leading-6">(021) 2993 5500</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} {lkppBrand.shortName}. Dibuka dalam mode aplikasi.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/panduan" className="transition-colors hover:text-role-accent">
                Panduan
              </Link>
              <Link href="/login/petugas" className="transition-colors hover:text-role-accent">
                Masuk Petugas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
