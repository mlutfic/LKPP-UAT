import Script from "next/script";
import { ArrowRight, Search, ShieldCheck, X } from "lucide-react";

import { AppActionBar } from "@/components/ui/app-action-bar";
import { AppButton } from "@/components/ui/app-button";
import {
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from "@/components/ui/app-card";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";

export function LandingQueueCheckCard() {
  return (
    <>
      <div id="landing-queue-check-root" className="space-y-0">
        <AppCardHeader className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Cek Antrean
          </p>
          <AppCardTitle className="max-w-2xl text-[1.9rem] leading-[1.08] md:text-[2rem]">
            Cek status antrean langsung.
          </AppCardTitle>
          <AppCardDescription className="max-w-2xl">
            Masukkan email terdaftar atau nomor antrean untuk melihat status terbaru.
          </AppCardDescription>
        </AppCardHeader>

        <AppCardContent className="mt-6 space-y-4 border-t border-border/70 pt-5">
          <form data-landing-queue-form className="space-y-3">
            <label htmlFor="landing-queue-lookup" className="sr-only">
              Email terdaftar atau nomor antrean
            </label>

            <AppActionBar className="gap-3 px-4 py-3 md:grid md:grid-cols-[minmax(0,1fr)_220px] md:items-center md:justify-normal">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <AppInput
                  id="landing-queue-lookup"
                  name="lookup"
                  className="h-12 rounded-[var(--radius-2xl)] pl-11 text-sm"
                  placeholder="nama@email.com atau D22-01-260414-001"
                  autoComplete="off"
                />
              </div>
              <AppButton
                size="lg"
                type="submit"
                className="w-full rounded-[var(--radius-2xl)]"
                data-landing-queue-submit
              >
                Cek antrean
                <ArrowRight className="size-4" />
              </AppButton>
            </AppActionBar>

            <p
              data-landing-queue-error
              className="hidden text-sm leading-6 text-destructive"
              role="alert"
            />
          </form>

          <AppNotice
            icon={ShieldCheck}
            title="Hasil tampil langsung di popup"
            description="Nomor antrean, status, unit tujuan, dan jadwal ditampilkan tanpa perlu masuk akun."
          />
        </AppCardContent>

        <div
          id="landing-queue-dialog"
          className="fixed inset-0 z-(--z-dialog) hidden items-center justify-center p-4"
          aria-hidden="true"
        >
          <button
            type="button"
            data-landing-queue-close
            aria-label="Tutup dialog"
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-queue-dialog-title"
            aria-describedby="landing-queue-dialog-description"
            className="relative flex max-h-[min(86vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-3xl)] bg-surface-container-lowest p-6 shadow-(--shadow-float) md:p-8"
          >
            <button
              type="button"
              data-landing-queue-close
              aria-label="Tutup dialog"
              className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-surface-container-low"
            >
              <X className="size-4" />
            </button>
            <div className="space-y-2">
              <h2
                id="landing-queue-dialog-title"
                className="font-heading text-2xl font-bold tracking-tight md:text-3xl"
              >
                Hasil cek antrean
              </h2>
              <p
                id="landing-queue-dialog-description"
                className="text-sm leading-6 text-muted-foreground"
              >
                Status antrean akan tampil di sini.
              </p>
            </div>
            <div id="landing-queue-dialog-body" className="mt-6 min-h-0 overflow-y-auto pr-1" />
          </div>
        </div>
      </div>

      <Script src="/scripts/landing-queue-lookup.js" strategy="afterInteractive" />
    </>
  );
}
