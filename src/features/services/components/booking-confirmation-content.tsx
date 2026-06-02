"use client";

import type { ComponentType } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  Clock3,
  MessageSquare,
  Tag,
  UsersRound,
} from "lucide-react";

import { AppBadge } from "@/components/ui/app-badge";
import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppNotice } from "@/components/ui/app-notice";
import { type BookingDraftData } from "@/features/services/booking-draft";

function getGradientClass(serviceId: string) {
  const seed = serviceId
    .split("")
    .reduce((total, value) => total + value.charCodeAt(0), 0);

  const gradients = [
    "from-red-600 via-red-500 to-orange-400",
    "from-rose-600 via-red-500 to-amber-400",
    "from-amber-600 via-red-500 to-rose-500",
  ] as const;

  return gradients[seed % gradients.length];
}

export function BookingConfirmationContent({
  draft,
  busy = false,
  onConfirm,
  onEditSchedule,
}: {
  draft: BookingDraftData;
  busy?: boolean;
  onConfirm?: () => void;
  onEditSchedule?: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        Periksa kembali detail antrean Anda sebelum dikirim.
      </p>

      <AppCard padding="md" className="space-y-4 overflow-hidden">
        <div className={`-mx-5 -mt-5 h-1 bg-gradient-to-r ${getGradientClass(draft.serviceId)}`} />

        <div className="space-y-1">
          <AppBadge tone="role">{draft.service.groupLabel}</AppBadge>
          <AppCardTitle className="text-lg">{draft.service.title}</AppCardTitle>
          <AppCardDescription>{draft.service.officialName}</AppCardDescription>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryRow
            icon={CalendarDays}
            label="Tanggal"
            value={draft.dateLabel}
            onClick={onEditSchedule}
          />
          <SummaryRow
            icon={Clock3}
            label="Estimasi Waktu Datang"
            value={draft.timeRange}
            onClick={onEditSchedule}
          />
          <SummaryRow
            icon={UsersRound}
            label="Jumlah Tamu"
            value={`${draft.guestCount} orang`}
          />
          {draft.applicantCategory ? (
            <SummaryRow
              icon={UsersRound}
              label="Kategori Instansi"
              value={draft.applicantCategory}
            />
          ) : null}
          {draft.institutionName ? (
            <SummaryRow
              icon={Building2}
              label="Nama Instansi"
              value={draft.institutionName}
            />
          ) : null}
          {draft.serviceTopic ? (
            <SummaryRow
              icon={Tag}
              label="Topik Layanan"
              value={draft.serviceTopic}
            />
          ) : null}
        </div>

        <div className="rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="size-4" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              Rincian tambahan
            </p>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {draft.complaint}
          </p>
        </div>
      </AppCard>

      <AppNotice
        icon={Clock3}
        tone="warning"
        title="Datang 15 menit lebih awal"
        description="Mohon hadir sebelum jam layanan untuk konfirmasi kehadiran agar antrean tidak hangus."
      />

      {onConfirm ? (
        <AppButton size="lg" onClick={onConfirm} disabled={busy} className="w-full">
          <Check className="size-4" />
          {busy ? "Memproses..." : "Konfirmasi antrean"}
        </AppButton>
      ) : null}
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const baseClassName = "rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ubah ${label.toLowerCase()}`}
        className={`${baseClassName} w-full text-left transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-role-accent-soft/45 hover:shadow-[0_14px_28px_-24px_rgba(185,28,28,0.45)]`}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
            {label}
          </p>
        </div>
        <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
      </button>
    );
  }

  return (
    <div className={baseClassName}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}
