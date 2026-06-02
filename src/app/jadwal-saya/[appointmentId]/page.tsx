import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getUserAppointmentPresentation } from "@/content/user-appointments-content";
import { parseBookingDraftData } from "@/features/services/booking-draft";
import { UserAppointmentDetailPage } from "@/features/user/components/user-appointment-detail-page";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { appointmentId } = await params;
  const resolvedSearchParams = await searchParams;
  const normalizedSearchParams = Object.fromEntries(
    Object.entries(resolvedSearchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  const draft = parseBookingDraftData(normalizedSearchParams);
  const appointment =
    normalizedSearchParams.preview === "booking"
      ? null
      : getUserAppointmentPresentation(appointmentId);

  return {
    title: appointment
      ? `Antrean ${formatQueueNumberForDisplay(appointment.queueNumber)}`
      : draft
        ? `Antrean ${formatQueueNumberForDisplay(draft.queueNumber)}`
        : "Detail Antrean",
  };
}

export default async function UserAppointmentDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { appointmentId } = await params;
  const resolvedSearchParams = await searchParams;
  const draftSearchParams = Object.fromEntries(
    Object.entries(resolvedSearchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );

  if (
    draftSearchParams.preview === "booking" &&
    !parseBookingDraftData(draftSearchParams)
  ) {
    notFound();
  }

  return (
    <UserAppointmentDetailPage
      appointmentId={appointmentId}
      draftSearchParams={draftSearchParams}
    />
  );
}
