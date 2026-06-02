"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { AppDialog } from "@/components/ui/app-dialog";
import {
  AnnouncementTickerStrip,
  type AnnouncementTickerItem,
} from "@/components/composite/announcement-ticker-strip";
import { getPublicAnnouncements, type PublicAnnouncementRecord } from "@/lib/api/public-announcements";

function normalizeAnnouncements(records: PublicAnnouncementRecord[], fallbackMessage: string) {
  const normalized = records
    .map<AnnouncementTickerItem | null>((record) => {
      const title = String(record.title || "").trim();
      const message = String(record.message || "").trim();
      if (!title && !message) return null;

      return {
        id: String(record.id || `${title}-${message}`).trim() || `${title}-${message}`,
        label: title && message ? `${title}: ${message}` : title || message,
        title: title || "Pengumuman layanan",
        message: message || title || fallbackMessage,
        startDate: String(record.startDate || "").trim() || undefined,
        endDate: String(record.endDate || "").trim() || undefined,
        tone:
          record.type === "warning"
            ? "warning"
            : record.type === "danger"
              ? "danger"
              : "info",
      };
    })
    .filter(Boolean) as AnnouncementTickerItem[];

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      id: "landing-fallback-announcement",
      label: fallbackMessage,
      title: "Pengumuman layanan",
      message: fallbackMessage,
      tone: "info" as const,
    },
  ];
}

function buildAnnouncementPeriodLabel(item: AnnouncementTickerItem) {
  const startDate = String(item.startDate || "").trim();
  const endDate = String(item.endDate || "").trim();

  if (startDate && endDate) {
    return `${startDate} sampai ${endDate}`;
  }

  if (startDate) {
    return `Mulai ${startDate}`;
  }

  if (endDate) {
    return `Sampai ${endDate}`;
  }

  return "";
}

export function PublicAnnouncementTicker({
  fallbackMessage,
}: {
  fallbackMessage: string;
}) {
  const [selectedAnnouncement, setSelectedAnnouncement] =
    React.useState<AnnouncementTickerItem | null>(null);
  const query = useQuery({
    queryKey: ["public-announcements"],
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const response = await getPublicAnnouncements("no-store");
      return Array.isArray(response.announcements) ? response.announcements : [];
    },
  });

  const announcements = React.useMemo(
    () => normalizeAnnouncements(query.data ?? [], fallbackMessage),
    [fallbackMessage, query.data],
  );
  const selectedAnnouncementPeriod = selectedAnnouncement
    ? buildAnnouncementPeriodLabel(selectedAnnouncement)
    : "";

  return (
    <>
      <section className="border-y border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <AnnouncementTickerStrip
            items={announcements}
            duration={`${Math.max(40, announcements.length * 14)}s`}
            mobileDuration={`${Math.max(60, announcements.length * 18)}s`}
            onSelectItem={setSelectedAnnouncement}
          />
        </div>
      </section>

      <AppDialog
        open={Boolean(selectedAnnouncement)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAnnouncement(null);
          }
        }}
        title={selectedAnnouncement?.title || "Pengumuman layanan"}
        description={
          selectedAnnouncementPeriod
            ? `Periode tayang ${selectedAnnouncementPeriod}.`
            : "Informasi pengumuman layanan LKPP."
        }
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-surface-container-low px-5 py-4">
            <p className="text-sm leading-7 text-foreground/88">
              {selectedAnnouncement?.message || selectedAnnouncement?.label || fallbackMessage}
            </p>
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            Teks berjalan tetap dipakai sebagai ringkasan cepat. Klik atau tap pengumuman untuk
            membaca isi lengkap dengan lebih nyaman.
          </p>
        </div>
      </AppDialog>
    </>
  );
}
