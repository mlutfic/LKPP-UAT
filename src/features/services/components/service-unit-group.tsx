"use client";

import { type BookingCatalogUnitGroup } from "@/content/service-booking-content";
import { ServiceDiscoveryCard } from "@/features/services/components/service-discovery-card";

export function ServiceUnitGroup({
  unit,
}: {
  unit: BookingCatalogUnitGroup;
}) {
  return (
    <div className="rounded-[26px] border border-border/60 bg-surface-container-low px-3.5 py-3.5 md:px-4">
      <div className="space-y-1 border-b border-border/60 pb-3.5">
        <h3 className="text-[0.98rem] font-semibold tracking-tight text-foreground md:text-[1.02rem]">
          {unit.unitLabel}
        </h3>
        <p className="max-w-2xl text-[0.88rem] leading-5 text-muted-foreground">
          {unit.unitDescription}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {unit.services.map((service) => (
          <ServiceDiscoveryCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
