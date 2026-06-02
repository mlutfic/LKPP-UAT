"use client";

import * as React from "react";
import Link from "next/link";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppPageIntro } from "@/components/composite/app-page-intro";
import { getPageCopyByRoute } from "@/content/page-copy";
import {
  buildBookingCatalogGroups,
  bookingServices,
} from "@/content/service-booking-content";
import { AppCard } from "@/components/ui/app-card";
import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { ServiceCategoryFilterBar } from "@/features/services/components/service-category-filter-bar";
import { ServiceCatalogSection } from "@/features/services/components/service-catalog-section";

export function ServiceSelectionPage() {
  const copy = getPageCopyByRoute("/layanan");
  const categoryPills = React.useMemo(
    () => ["Semua", ...Array.from(new Set(bookingServices.map((service) => service.groupLabel)))],
    [],
  );
  const [activeCategory, setActiveCategory] = React.useState("Semua");
  const [query, setQuery] = React.useState("");

  const filteredServices = React.useMemo(
    () =>
      bookingServices.filter((service) => {
        const matchesCategory =
          activeCategory === "Semua" || service.groupLabel === activeCategory;

        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return matchesCategory;

        const haystack = [
          service.groupLabel,
          service.unitLabel,
          service.title,
          service.officialName,
          service.description,
          ...service.exampleNeeds,
        ]
          .join(" ")
          .toLowerCase();

        return matchesCategory && haystack.includes(normalizedQuery);
      }),
    [activeCategory, query],
  );

  const groupedSections = React.useMemo(() => {
    return buildBookingCatalogGroups(filteredServices);
  }, [filteredServices]);

  return (
    <DashboardShell
      role="user"
      currentPath="/layanan"
      title={copy?.title ?? "Ambil Antrean"}
      subtitle={copy?.description ?? "Pilih layanan yang paling sesuai dengan kebutuhan Anda."}
    >
      <div className="space-y-7">
        <AppPageIntro
          eyebrow={copy?.heroEyebrow || undefined}
          title={copy?.heroTitle ?? "Pilih layanan"}
          description={copy?.heroDescription || undefined}
          className="gap-4 pb-4"
          actions={
            <Link href="/jadwal-saya">
              <AppButton variant="outline" className="rounded-full">
                Jadwal Saya
              </AppButton>
            </Link>
          }
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <AppInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari kebutuhan atau nama layanan"
            aria-label="Cari kebutuhan atau nama layanan"
          />
          <p className="text-sm font-medium text-muted-foreground">
            {filteredServices.length} layanan
          </p>
        </div>

        <ServiceCategoryFilterBar
          categories={categoryPills}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        {groupedSections.length > 0 ? (
          <div className="space-y-7">
            {groupedSections.map((group) => (
              <ServiceCatalogSection key={group.category} section={group} />
            ))}
          </div>
        ) : (
          <AppCard
            tone="soft"
            padding="md"
            className="flex min-h-56 flex-col items-center justify-center text-center"
          >
            <p className="text-lg font-semibold">Layanan tidak ditemukan</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Coba gunakan kata kunci yang lebih singkat atau pilih kategori lain.
            </p>
          </AppCard>
        )}
      </div>
    </DashboardShell>
  );
}
