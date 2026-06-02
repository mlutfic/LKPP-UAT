import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
} from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import {
  landingAnnouncement,
  landingFaqs,
  landingHero,
  landingServiceHighlights,
  landingServiceSteps,
  landingStats,
  landingVisitInfo,
} from "@/content/portal-content";
import { AppButton } from "@/components/ui/app-button";
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from "@/components/ui/app-card";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { LandingQueueCheckCard } from "@/features/marketing/components/landing-queue-check-card";
import { PublicAnnouncementTicker } from "@/features/marketing/components/public-announcement-ticker";

const heroImage = "/brand/hero-gedung-lkpp-user-hq.jpg";

export function LandingPage() {
  return (
    <PublicShell>
      <section className="relative flex min-h-[620px] items-center overflow-hidden md:min-h-[680px]">
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImage}
            alt="Gedung LKPP"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(19,25,35,0.78)_0%,rgba(19,25,35,0.7)_24%,rgba(19,25,35,0.36)_50%,rgba(19,25,35,0.08)_100%)]" />
          <div className="absolute inset-y-0 left-0 z-10 w-[38%] bg-black/12" />
        </div>
        <div className="relative z-20 mx-auto w-full max-w-7xl px-4 py-10 sm:px-5 sm:py-12 md:px-6 md:py-16">
          <div className="max-w-[39rem]">
            <p className="mb-5 inline-flex items-center rounded-full border border-white/16 bg-white/10 px-4 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-white/88 backdrop-blur-sm sm:mb-6 sm:px-5 sm:text-[0.88rem] md:mb-7 md:text-[0.95rem] md:tracking-[0.16em]">
              {landingHero.eyebrow}
            </p>
            <h1 className="mb-4 max-w-[10ch] font-heading text-[3rem] font-bold leading-[0.98] tracking-tight text-white sm:mb-5 sm:text-[3.3rem] md:mb-6 md:max-w-none md:text-[4.1rem]">
              {landingHero.title}
            </h1>
            <p className="mb-7 max-w-[28rem] text-[0.98rem] leading-7 text-white/82 sm:mb-8 sm:max-w-[31rem] sm:text-[1rem] md:mb-10 md:max-w-[35rem] md:text-[1.02rem] md:leading-8">
              {landingHero.description}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link href="/layanan">
                <AppButton
                  size="lg"
                  className="w-full rounded-2xl shadow-[0_24px_40px_rgba(153,27,27,0.28)] sm:w-auto"
                >
                  {landingHero.primaryCta}
                  <ArrowRight className="size-4" />
                </AppButton>
              </Link>
              <Link href="/panduan">
                <AppButton
                  size="lg"
                  variant="outline"
                  className="w-full rounded-2xl border border-white/22 bg-white/10 text-white backdrop-blur-md hover:bg-white/18 sm:w-auto"
                >
                  {landingHero.secondaryCta}
                </AppButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicAnnouncementTicker fallbackMessage={landingAnnouncement} />

      <section className="mx-auto max-w-7xl px-6 py-24">
        <AppSectionHeader
          eyebrow="Layanan Utama"
          title="Pengalaman layanan yang terasa institusional, tenang, dan modern."
          description="Susunan layanan dibuat jelas agar warga cepat memahami pilihan layanan dan alur antreannya."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {landingServiceHighlights.map((item) => (
            <AppCard key={item.title} padding="lg" className="flex h-full flex-col gap-6 hover:-translate-y-1">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-container-low text-role-accent">
                <item.icon className="size-6" />
              </div>
              <div className="space-y-3">
                <AppCardTitle>{item.title}</AppCardTitle>
                <AppCardDescription>{item.description}</AppCardDescription>
              </div>
            </AppCard>
          ))}
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,var(--color-surface-container-low)_0%,white_100%)] py-24">
        <div className="mx-auto max-w-7xl space-y-12 px-6 md:space-y-14">
          <AppCard padding="lg" className="border-border/80 bg-white/92">
            <AppCardHeader>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Ringkasan Hari Ini
              </p>
              <AppCardTitle className="max-w-2xl text-[1.9rem] leading-[1.08] md:text-[2rem]">
                Layanan hari ini dalam tiga angka.
              </AppCardTitle>
              <AppCardDescription className="max-w-2xl">
                Cukup untuk membaca ritme layanan sebelum mengambil antrean atau datang ke lokasi.
              </AppCardDescription>
            </AppCardHeader>

            <AppCardContent className="mt-8 grid gap-3 border-t border-border/70 pt-6 xl:grid-cols-3">
              {landingStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest px-5 py-5"
                >
                  <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start xl:grid-cols-1">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-role-accent-soft text-role-accent">
                      <item.icon className="size-5" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="font-heading text-[2rem] font-bold leading-none tracking-tight text-foreground">
                        {item.value}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </AppCardContent>
          </AppCard>

          <div className="border-t border-border/70 pt-10 md:pt-12">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              <AppCard
                padding="lg"
                className="h-full border-border/80 bg-white/94 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
              >
                <LandingQueueCheckCard />
              </AppCard>

              <AppCard padding="lg" className="h-full border-border/80 bg-white/88">
                <AppCardHeader>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                    Informasi Kunjungan
                  </p>
                  <AppCardDescription className="max-w-none">
                    Lokasi, jam layanan, dan alur check-in dibaca dari sini sebelum berangkat.
                  </AppCardDescription>
                </AppCardHeader>

                <AppCardContent className="mt-8 space-y-3 border-t border-border/70 pt-6">
                  {landingVisitInfo.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-role-accent-soft text-role-accent">
                          <item.icon className="size-4" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </AppCardContent>
              </AppCard>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low py-24">
        <div className="mx-auto max-w-7xl px-6">
          <AppSectionHeader
            eyebrow="Prosedur Layanan"
            title="Empat langkah yang membuat layanan tetap tertib dan cepat."
            description="Alur ini dirancang supaya warga, resepsionis, dan unit kerja punya konteks yang sama dari awal sampai akhir."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {landingServiceSteps.map((step, index) => (
              <AppCard key={step.title} padding="lg">
                <div className="flex size-12 items-center justify-center rounded-full bg-role-accent-soft font-heading text-lg font-bold text-role-accent">
                  {index + 1}
                </div>
                <div className="mt-6 space-y-3">
                  <AppCardTitle>{step.title}</AppCardTitle>
                  <AppCardDescription>{step.description}</AppCardDescription>
                </div>
              </AppCard>
            ))}
          </div>
        </div>
      </section>

      <section id="landing-faq" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              FAQ
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-balance">
              Pertanyaan yang paling sering muncul sebelum warga datang ke LKPP.
            </h2>
            <p className="text-sm leading-6 text-muted-foreground md:text-base">
              Bagian ini menutup beban tanya berulang sekaligus menjaga landing tetap informatif.
            </p>
          </div>
          <div className="space-y-4">
            {landingFaqs.map((item) => (
              <AppCard key={item.question} className="p-0">
                <details className="group">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-foreground">
                    <span>{item.question}</span>
                    <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-6 pb-5 pt-0 text-sm leading-6 text-muted-foreground">
                    {item.answer}
                  </div>
                </details>
              </AppCard>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
