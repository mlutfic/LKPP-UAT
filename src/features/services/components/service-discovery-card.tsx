"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { type BookingServiceEntry } from "@/content/service-booking-content";
import { AppHoverNote } from "@/components/ui/app-hover-note";
import {
  AppCard,
  AppCardDescription,
  AppCardTitle,
} from "@/components/ui/app-card";

export function ServiceDiscoveryCard({
  service,
}: {
  service: BookingServiceEntry;
}) {
  return (
    <Link
      href={`/layanan/${service.slug}`}
      className="relative z-0 block h-full overflow-visible hover:z-20 focus-within:z-20"
    >
      <AppCard
        tone="elevated"
        padding="md"
        className="relative isolate z-0 flex h-full min-h-[154px] flex-col gap-2 overflow-visible rounded-[22px] border-border/75 bg-background px-3.5 py-3.5 shadow-[0_10px_24px_-20px_rgba(17,24,39,0.14)] transition-[transform,box-shadow,border-color,z-index] hover:z-20 focus-within:z-20 hover:-translate-y-[1px] hover:border-role-accent/30 hover:shadow-(--shadow-soft)"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-[22px] bg-gradient-to-r from-role-accent via-red-500 to-orange-400" />

        <div className="flex items-start justify-between gap-2.5">
          <p className="inline-flex items-center rounded-full border border-border bg-surface-container-low px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {service.id}
          </p>

          <AppHoverNote
            label={`Detail layanan ${service.title}`}
            className="relative z-30 shrink-0"
            triggerClassName="size-7 border-border/80 bg-background shadow-[0_8px_18px_-16px_rgba(17,24,39,0.2)]"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Unit layanan
                </p>
                <p className="text-sm leading-6 text-foreground">{service.unitLabel}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Nama resmi
                </p>
                <p className="text-sm leading-6 text-foreground">{service.officialName}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Ringkasan
                </p>
                <p className="text-sm leading-6 text-foreground">{service.description}</p>
              </div>
            </div>
          </AppHoverNote>
        </div>

        <div className="space-y-1.5">
          <AppCardTitle className="max-w-none text-[0.92rem] leading-[1.3] tracking-[-0.018em] text-balance md:text-[0.96rem]">
            {service.title}
          </AppCardTitle>
          <AppCardDescription
            className="max-w-none line-clamp-2 text-[0.82rem] leading-5 text-foreground/72"
          >
            {service.description}
          </AppCardDescription>
        </div>

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-border/60 pt-2.5">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-role-accent">
            Pilih layanan
            <ArrowRight className="size-4" />
          </span>
        </div>
      </AppCard>
    </Link>
  );
}
