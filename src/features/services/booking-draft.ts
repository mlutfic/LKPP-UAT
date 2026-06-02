import {
  getBookingServiceById,
  type BookingServiceEntry,
} from "@/content/service-booking-content";
import { buildLegacyQueueNumber } from "@/features/services/legacy-queue-number";

export type BookingDraftData = {
  service: BookingServiceEntry;
  serviceId: string;
  applicantCategory?: string;
  institutionName?: string;
  serviceTopic?: string;
  dateKey: string;
  dateLabel: string;
  timeRange: string;
  complaint: string;
  guestCount: number;
  queueNumber: string;
  asalInstansi: string;
};

export function parseBookingDraftData(
  params: Record<string, string | undefined>,
): BookingDraftData | null {
  const serviceId = params.serviceId?.trim().toUpperCase();
  if (!serviceId) {
    return null;
  }

  const service = getBookingServiceById(serviceId);
  if (!service) {
    return null;
  }

  const applicantCategory = params.applicantCategory?.trim() || undefined;
  const institutionName = params.institutionName?.trim() || undefined;
  const serviceTopic = params.topic?.trim() || undefined;
  const dateKey = params.dateKey?.trim() || "";
  const dateLabel = params.date?.trim() || dateKey || "Tanggal belum dipilih";
  const timeRange = params.timeRange?.trim() || "Slot akan ditentukan";
  const complaint = params.complaint?.trim() || "Topik layanan belum dituliskan.";
  const queueNumber =
    params.queueNumber?.trim() || buildLegacyQueueNumber(service.id, [], dateKey || undefined);
  const guestCount = Number(params.guestCount || "1");

  return {
    service,
    serviceId: service.id,
    applicantCategory,
    institutionName,
    serviceTopic,
    dateKey: dateKey || dateLabel,
    dateLabel,
    timeRange,
    complaint,
    guestCount: Number.isFinite(guestCount) && guestCount > 0 ? guestCount : 1,
    queueNumber,
    asalInstansi: params.asalInstansi?.trim() || "Instansi belum diisi",
  };
}
