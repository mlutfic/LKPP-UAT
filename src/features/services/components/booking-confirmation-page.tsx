"use client";

import Link from "next/link";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { BookingConfirmationContent } from "@/features/services/components/booking-confirmation-content";
import { type BookingDraftData } from "@/features/services/booking-draft";

export function BookingConfirmationPage({
  draft,
}: {
  draft: BookingDraftData;
}) {
  return (
    <DashboardShell
      role="user"
      currentPath="/layanan"
      title="Konfirmasi booking"
      subtitle={draft.service.title}
    >
      <div className="space-y-4">
        <BookingConfirmationContent draft={draft} />
        <div className="mx-auto flex max-w-3xl justify-start">
          <Link href={`/layanan/${draft.serviceId}`}>
            <AppButton variant="outline">Kembali ke layanan</AppButton>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
