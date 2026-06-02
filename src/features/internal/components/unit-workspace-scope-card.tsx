"use client";

import { Building2 } from "lucide-react";

import { AppCard } from "@/components/ui/app-card";
import { AppNotice } from "@/components/ui/app-notice";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";

export function UnitWorkspaceScopeCard({
  value,
  onValueChange,
  options,
  blocking = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSearchSelectOption[];
  blocking?: boolean;
}) {
  return (
    <AppCard
      tone={blocking ? "soft" : "elevated"}
      padding="lg"
      className="space-y-4"
    >
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          Scope Unit
        </p>
        <h2 className="text-2xl font-bold tracking-tight">
          {blocking
            ? "Pilih unit organisasi"
            : "Unit yang sedang dipantau"}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {blocking
            ? "Dashboard Unit, Data Antrean, dan Analitik Unit akan membaca unit yang Anda pilih."
            : "Ganti unit di sini bila ingin membaca data unit lain pada menu yang sama."}
        </p>
      </div>

      <AppSearchSelect
        value={value}
        onValueChange={onValueChange}
        options={options}
        placeholder="Pilih unit organisasi"
        searchPlaceholder="Cari unit organisasi"
        emptyMessage="Unit tidak ditemukan."
      />

      {blocking ? (
        <AppNotice
          icon={Building2}
          title="Unit belum dipilih"
          description="Pilih satu unit organisasi terlebih dahulu agar data dashboard, antrean, dan analitik tidak tampil kosong."
          tone="warning"
        />
      ) : null}
    </AppCard>
  );
}
