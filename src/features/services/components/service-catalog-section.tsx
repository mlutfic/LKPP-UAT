"use client";

import { type BookingCatalogCategoryGroup } from "@/content/service-booking-content";
import { ServiceUnitGroup } from "@/features/services/components/service-unit-group";

export function ServiceCatalogSection({
  section,
}: {
  section: BookingCatalogCategoryGroup;
}) {
  return (
    <section className="rounded-[28px] border border-border/70 bg-surface-container-lowest/75 p-4 shadow-(--shadow-soft) md:p-5">
      <div className="flex flex-col gap-2.5 border-b border-border/70 pb-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="font-heading text-[1.45rem] font-bold tracking-tight text-foreground md:text-[1.55rem]">
            {section.category}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {section.description}
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-border bg-surface-container-low px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {section.serviceCount} layanan
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {section.units.map((unit) => (
          <ServiceUnitGroup
            key={`${section.category}-${unit.unitId}`}
            unit={unit}
          />
        ))}
      </div>
    </section>
  );
}
