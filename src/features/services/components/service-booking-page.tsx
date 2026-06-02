"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppSelect } from "@/components/ui/app-select";
import { AppTextarea } from "@/components/ui/app-textarea";
import {
  bookingApplicantCategories,
  bookingServices,
  type BookingServiceEntry,
} from "@/content/service-booking-content";
import { userAppointments } from "@/content/user-appointments-content";
import { createAppointment } from "@/lib/api/appointments";
import { getInitialData } from "@/lib/api/services";
import { readMockSession } from "@/lib/mock-auth";
import { BookingConfirmationContent } from "@/features/services/components/booking-confirmation-content";
import { buildLegacyQueueNumberForService } from "@/features/services/legacy-queue-number";
import {
  getAvailableSlotsRuntime,
  getDateAvailabilityRuntime,
} from "@/features/services/legacy-slot-runtime";
import { normalizeBookingRuntimeData } from "@/features/services/runtime-data";
import { useMockUserProfile } from "@/hooks/use-mock-user-profile";
import { isUserAppointmentBlockingNewBooking } from "@/features/user/appointment-status-utils";
import {
  seedLiveUserAppointmentCache,
  useLiveUserAppointments,
} from "@/features/user/use-live-user-appointments";

const BOOKING_STEPS = ["complaint", "date", "confirm"] as const;
const FALLBACK_BOOKING_SETTINGS = {
  operatingHours: { start: "08:00", end: "15:00" },
  breakHours: null,
  operatingDays: [1, 2, 3, 4, 5] as number[],
  maxAdvanceBookingDays: 14,
  holidays: [] as string[],
};
const FALLBACK_RUNTIME_SERVICES = bookingServices.map((entry) => ({
  id: entry.id,
  enabled: true,
  slotDurationMinutes: entry.durationMinutes,
  dailyQuota: entry.dailyQuota,
  unorId: entry.unitId,
}));
const FALLBACK_RUNTIME_APPOINTMENTS = userAppointments.map((appointment) => {
  const [startSegment = "", endSegment = ""] = appointment.timeRange.split("-").map((segment) => segment.trim());
  const startTime = startSegment.slice(0, 5);
  const endTime = endSegment.replace("WIB", "").trim().slice(0, 5);

  return {
    id: appointment.id,
    serviceId: appointment.serviceId,
    date: appointment.date,
    startTime,
    endTime,
    queueNumber: appointment.queueNumber,
    status: appointment.status,
  };
});

type BookingStep = (typeof BOOKING_STEPS)[number];

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T08:00:00+07:00`);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatSlotLabel(dateKey: string, startTime: string, endTime: string) {
  return `${formatDateLabel(dateKey)} • ${startTime} WIB - ${endTime} WIB`;
}

export function ServiceBookingPage({
  service,
}: {
  service: BookingServiceEntry;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    profile,
    completionStatus,
    hasResolvedProfileCompletion,
    isLiveProfileSyncPending,
  } = useMockUserProfile(true);
  const currentSession = React.useMemo(() => readMockSession(), []);
  const isLiveSession =
    currentSession?.authMode === "live" && Boolean(currentSession.userId);
  const runtimeQuery = useQuery({
    queryKey: [
      "booking-runtime-data",
      currentSession?.authMode ?? "mock",
      isLiveSession ? currentSession?.userId ?? "anonymous" : "anonymous",
    ],
    queryFn: async () => {
      const response = await getInitialData(
        isLiveSession && currentSession?.userId
          ? { userId: currentSession.userId }
          : undefined,
      );
      return normalizeBookingRuntimeData(response.data);
    },
    staleTime: 30_000,
  });
  const {
    refetch: refetchRuntimeData,
    isLoading: isLoadingRuntimeData,
    isFetching: isFetchingRuntimeData,
  } = runtimeQuery;
  const liveAppointments = useLiveUserAppointments();
  const [step, setStep] = React.useState<BookingStep>("complaint");
  const [applicantCategory, setApplicantCategory] = React.useState("");
  const [institutionName, setInstitutionName] = React.useState(profile?.namaInstansi ?? "");
  const [serviceTopic, setServiceTopic] = React.useState(service.topicOptions?.[0] ?? "");
  const [complaint, setComplaint] = React.useState("");
  const [guestCount, setGuestCount] = React.useState("1");
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [booking, setBooking] = React.useState(false);

  React.useEffect(() => {
    if (profile?.asalInstansi && bookingApplicantCategories.includes(profile.asalInstansi as (typeof bookingApplicantCategories)[number])) {
      setApplicantCategory(profile.asalInstansi);
    }
  }, [profile?.asalInstansi]);

  React.useEffect(() => {
    if (!institutionName.trim() && profile?.namaInstansi?.trim()) {
      setInstitutionName(profile.namaInstansi.trim());
    }
  }, [institutionName, profile?.namaInstansi]);

  const runtimeData = runtimeQuery.data;
  const runtimeServices = runtimeData?.services ?? [];
  const runtimeAppointments = runtimeData?.appointments ?? [];
  const runtimeUnorConfigs = runtimeData?.unorConfigs ?? [];
  const runtimeServiceConfig = React.useMemo(
    () => runtimeServices.find((entry) => entry.id === service.id) ?? null,
    [runtimeServices, service.id],
  );
  const effectiveSlotDurationMinutes =
    runtimeServiceConfig?.slotDurationMinutes ?? service.durationMinutes;
  const effectiveDailyQuota =
    runtimeServiceConfig?.dailyQuota ?? service.dailyQuota;

  const selectedDateLabel = selectedDate ? formatDateLabel(selectedDate) : null;
  const selectedRuntimeSlots =
    selectedDate && runtimeData
      ? getAvailableSlotsRuntime(
          service.id,
          selectedDate,
          runtimeServices,
          runtimeAppointments,
          runtimeData.settings,
          runtimeUnorConfigs,
        )
      : [];
  const selectedFallbackSlots =
    selectedDate && !isLiveSession && !runtimeData
      ? getAvailableSlotsRuntime(
          service.id,
          selectedDate,
          FALLBACK_RUNTIME_SERVICES,
          FALLBACK_RUNTIME_APPOINTMENTS,
          FALLBACK_BOOKING_SETTINGS,
        )
      : [];
  const selectedRuntimeAvailability =
    selectedDate && runtimeData
      ? getDateAvailabilityRuntime(
          service.id,
          selectedDate,
          runtimeServices,
          runtimeAppointments,
          runtimeData.settings,
          runtimeUnorConfigs,
        )
      : null;
  const selectedFallbackAvailability =
    selectedDate && !isLiveSession && !runtimeData
      ? getDateAvailabilityRuntime(
          service.id,
          selectedDate,
          FALLBACK_RUNTIME_SERVICES,
          FALLBACK_RUNTIME_APPOINTMENTS,
          FALLBACK_BOOKING_SETTINGS,
        )
      : null;
  const selectedAvailableSlots = runtimeData
    ? selectedRuntimeSlots
    : isLiveSession
      ? []
      : selectedFallbackSlots;
  const selectedDateAvailability =
    selectedRuntimeAvailability ??
    (runtimeData ? null : isLiveSession ? null : selectedFallbackAvailability);
  const effectiveSlot = selectedAvailableSlots[0] ?? null;
  const selectedSlot = selectedDate
    ? effectiveSlot
      ? {
          label: formatSlotLabel(
            selectedDate,
            effectiveSlot.startTime,
            effectiveSlot.endTime,
          ),
          start: `${effectiveSlot.startTime} WIB`,
          end: `${effectiveSlot.endTime} WIB`,
          startTime: effectiveSlot.startTime,
          endTime: effectiveSlot.endTime,
        }
      : null
    : null;
  const previewQueueNumber = selectedDate
    ? buildLegacyQueueNumberForService(
        service.id,
        runtimeAppointments.length > 0
          ? runtimeAppointments
          : isLiveSession
            ? []
            : userAppointments,
        selectedDate,
      )
    : null;
  const activeBlockingAppointment = React.useMemo(() => {
    if (!isLiveSession) {
      return null;
    }

    return (
      liveAppointments.appointments?.find((appointment) =>
        isUserAppointmentBlockingNewBooking(appointment.status),
      ) ?? null
    );
  }, [isLiveSession, liveAppointments.appointments]);

  function ensureNoActiveBlockingAppointment() {
    if (!activeBlockingAppointment) {
      return true;
    }

    const queueLabel = activeBlockingAppointment.queueNumber || "antrean aktif";
    toast.error(
      `Anda masih memiliki antrean aktif ${queueLabel}. Selesaikan atau batalkan antrean tersebut sebelum mengambil antrean baru.`,
    );
    return false;
  }

  React.useEffect(() => {
    if (!isLiveSession || (step !== "date" && step !== "confirm")) {
      return;
    }

    void refetchRuntimeData();
  }, [isLiveSession, refetchRuntimeData, step]);

  React.useEffect(() => {
    if (step !== "confirm" || !selectedDate || !isLiveSession || !runtimeData) {
      return;
    }

    if (selectedAvailableSlots.length === 0) {
      if (selectedDateAvailability?.state === "closed") {
        toast.error(
          "Tanggal ini sudah tidak menerima booking lagi. Pilih tanggal lain yang masih tersedia.",
        );
      } else if (selectedDateAvailability?.state === "holiday") {
        toast.error("Tanggal ini adalah hari libur layanan. Pilih tanggal lain.");
      } else {
        toast.error("Slot pada tanggal ini sudah habis. Pilih tanggal lain yang masih tersedia.");
      }
      setStep("date");
      return;
    }

    if (!selectedSlot) {
      toast.warning("Estimasi waktu datang sedang disesuaikan otomatis. Coba lanjutkan lagi.");
      setStep("date");
    }
  }, [
    isLiveSession,
    runtimeData,
    selectedAvailableSlots,
    selectedDate,
    selectedDateAvailability,
    selectedSlot,
    step,
  ]);

  function handleComplaintNext() {
    if (!ensureNoActiveBlockingAppointment()) {
      return;
    }

    if (isLiveProfileSyncPending || !hasResolvedProfileCompletion) {
      toast.info("Profil pengguna sedang disinkronkan. Tunggu sebentar lalu coba lagi.");
      return;
    }

    if (!completionStatus.isComplete) {
      toast.error("Lengkapi profil pengguna terlebih dahulu sebelum mengambil antrian.");
      router.push("/profil");
      return;
    }

    if (!applicantCategory.trim()) {
      toast.error("Pilih kategori pemohon terlebih dahulu.");
      return;
    }

    if (!institutionName.trim()) {
      toast.error("Isi nama instansi, badan usaha, atau perorangan terlebih dahulu.");
      return;
    }

    if (service.topicOptions?.length && !serviceTopic.trim()) {
      toast.error("Pilih topik layanan terlebih dahulu.");
      return;
    }

    if (!service.topicOptions?.length && !complaint.trim()) {
      toast.error("Tuliskan keluhan atau keperluan Anda.");
      return;
    }

    if (!/^\d+$/.test(guestCount) || Number(guestCount) < 1) {
      toast.error("Jumlah tamu minimal 1 orang.");
      return;
    }

    setStep("date");
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDate(dateKey);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!ensureNoActiveBlockingAppointment()) {
      return;
    }

    if (isLiveProfileSyncPending || !hasResolvedProfileCompletion) {
      toast.info("Profil pengguna sedang disinkronkan. Tunggu sebentar lalu coba lagi.");
      return;
    }

    if (!completionStatus.isComplete) {
      toast.error("Lengkapi profil pengguna terlebih dahulu sebelum mengambil antrian.");
      router.push("/profil");
      return;
    }

    if (!selectedDate) {
      toast.error("Pilih tanggal kunjungan terlebih dahulu.");
      return;
    }

    if (isLiveSession && !runtimeData) {
      toast.error("Jadwal live masih dimuat. Tunggu sebentar lalu coba lagi.");
      return;
    }

    if (!selectedSlot) {
      if (selectedDateAvailability?.state === "closed") {
        toast.error("Tanggal ini sudah tidak menerima booking lagi. Pilih tanggal lain.");
      } else if (selectedDateAvailability?.state === "holiday") {
        toast.error("Tanggal yang dipilih sedang libur layanan. Pilih tanggal lain.");
      } else {
        toast.error(
          "Estimasi waktu datang otomatis belum tersedia. Pilih tanggal lain yang masih tersedia.",
        );
      }
      return;
    }

    setBooking(true);
    try {
      const complaintSummary = complaint.trim() || "Tidak ada rincian tambahan.";
      const normalizedGuestCount = Math.max(Number(guestCount) || 1, 1);
      const fallbackQueueNumber =
        previewQueueNumber ??
        buildLegacyQueueNumberForService(
          service.id,
          runtimeAppointments.length > 0
            ? runtimeAppointments
            : isLiveSession
              ? []
              : userAppointments,
          selectedDate,
        );

      let liveSlotToBook = effectiveSlot;
      let wasAutoAdjusted = false;

      if (isLiveSession && currentSession?.userId) {
        const latestRuntimeResult = await refetchRuntimeData();
        const latestRuntimeData = latestRuntimeResult.data ?? runtimeData;

        if (!latestRuntimeData) {
          toast.error("Jadwal live belum berhasil dimuat. Coba lagi sesaat.");
          return;
        }

        const latestAvailableSlots = getAvailableSlotsRuntime(
          service.id,
          selectedDate,
          latestRuntimeData.services,
          latestRuntimeData.appointments,
          latestRuntimeData.settings,
          latestRuntimeData.unorConfigs,
        );

        if (latestAvailableSlots.length === 0) {
          const latestAvailability = getDateAvailabilityRuntime(
            service.id,
            selectedDate,
            latestRuntimeData.services,
            latestRuntimeData.appointments,
            latestRuntimeData.settings,
            latestRuntimeData.unorConfigs,
          );
          if (latestAvailability.state === "closed") {
            toast.error(
              "Tanggal ini sudah tidak menerima booking lagi. Pilih tanggal lain yang masih tersedia.",
            );
          } else if (latestAvailability.state === "holiday") {
            toast.error("Tanggal ini adalah hari libur layanan. Pilih tanggal lain.");
          } else {
            toast.error("Jam pada tanggal ini sudah penuh. Pilih tanggal lain yang masih tersedia.");
          }
          setStep("date");
          return;
        }

        liveSlotToBook = latestAvailableSlots[0] ?? null;
        wasAutoAdjusted =
          Boolean(selectedSlot) &&
          Boolean(liveSlotToBook) &&
          (liveSlotToBook.startTime !== selectedSlot.startTime ||
            liveSlotToBook.endTime !== selectedSlot.endTime);
      }

      if (isLiveSession && currentSession?.userId && liveSlotToBook) {
        const result = await createAppointment({
          userId: currentSession.userId,
          serviceId: service.id,
          date: selectedDate,
          startTime: liveSlotToBook.startTime,
          endTime: liveSlotToBook.endTime,
          complaint: complaintSummary,
          jumlahTamu: normalizedGuestCount,
          applicantCategory: applicantCategory.trim() || undefined,
          institutionName: institutionName.trim() || undefined,
          serviceTopic: serviceTopic.trim() || undefined,
          asalInstansi: profile?.asalInstansi || applicantCategory || "Instansi belum diisi",
        });
        const appointment =
          result.appointment && typeof result.appointment === "object"
            ? (result.appointment as Record<string, unknown>)
            : null;
        const liveAppointmentId =
          typeof appointment?.id === "string" && appointment.id.trim()
            ? appointment.id.trim()
            : typeof appointment?.queueNumber === "string" && appointment.queueNumber.trim()
              ? appointment.queueNumber.trim()
              : "";
        const liveQueueNumber =
          typeof appointment?.queueNumber === "string" && appointment.queueNumber.trim()
            ? appointment.queueNumber.trim()
            : "";
        const liveQrToken =
          typeof appointment?.qrToken === "string" && appointment.qrToken.trim()
            ? appointment.qrToken.trim()
            : typeof appointment?.qr_token === "string" && appointment.qr_token.trim()
              ? appointment.qr_token.trim()
            : undefined;
        if (liveAppointmentId && liveQueueNumber) {
          seedLiveUserAppointmentCache(queryClient, currentSession.userId, {
            id: liveAppointmentId,
            qrToken: liveQrToken,
            userId: currentSession.userId,
            serviceId: service.id,
            date: selectedDate,
            startTime: liveSlotToBook.startTime,
            endTime: liveSlotToBook.endTime,
            queueNumber: liveQueueNumber,
            complaint: complaintSummary,
            jumlahTamu: normalizedGuestCount,
            status: "booked",
            checkedIn: false,
            callCount: 0,
            applicantCategory: applicantCategory.trim() || undefined,
            institutionName: institutionName.trim() || undefined,
            serviceTopic: serviceTopic.trim() || undefined,
            asalInstansi: profile?.asalInstansi || applicantCategory || "Instansi belum diisi",
          });
        }
        void queryClient.invalidateQueries({
          queryKey: ["user-live-appointments", currentSession.userId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["booking-runtime-data"],
        });

        toast.success(
          wasAutoAdjusted
            ? `Antrian berhasil dibuat. Estimasi waktu datang otomatis disesuaikan ke ${liveSlotToBook.startTime} WIB - ${liveSlotToBook.endTime} WIB.`
            : "Antrian berhasil dibuat.",
        );
        if (liveAppointmentId) {
          router.push(`/jadwal-saya/${encodeURIComponent(liveAppointmentId)}`);
          return;
        }
        router.push("/jadwal-saya");
        return;
      }

      toast.success("Antrian berhasil disimpan.");
      const params = new URLSearchParams({
        preview: "booking",
        serviceId: service.id,
        applicantCategory,
        institutionName,
        ...(serviceTopic ? { topic: serviceTopic } : {}),
        date: selectedDateLabel ?? selectedDate,
        dateKey: selectedDate,
        timeRange: `${selectedSlot.start} - ${selectedSlot.end}`,
        complaint: complaintSummary,
        guestCount: String(normalizedGuestCount),
        queueNumber: fallbackQueueNumber,
        asalInstansi: profile?.asalInstansi || applicantCategory || "Instansi belum diisi",
      });
      router.push(`/jadwal-saya/${encodeURIComponent(fallbackQueueNumber)}?${params.toString()}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal membuat antrian. Coba lagi.";
      toast.error(message);
    } finally {
      setBooking(false);
    }
  }

  return (
    <DashboardShell
      role="user"
      currentPath="/layanan"
      title={
        step === "complaint"
          ? "Lengkapi keperluan"
          : step === "date"
            ? "Tentukan jadwal"
            : "Konfirmasi antrian"
      }
      subtitle={service.title}
    >
      <div className="space-y-8">
        <AppSectionHeader
          eyebrow="Ambil Antrian"
          title={
            step === "complaint"
              ? service.title
              : step === "date"
                ? "Pilih tanggal kunjungan"
                : "Periksa detail antrian"
          }
          description={
            step === "complaint"
              ? service.description
              : step === "date"
                ? "Pilih tanggal kunjungan yang masih tersedia."
                : "Pastikan layanan, jadwal, dan keperluan sudah sesuai."
          }
          actions={
            <>
              <Link href="/layanan">
                <AppButton variant="outline">Pilih layanan lain</AppButton>
              </Link>
              <Link href="/bantuan">
                <AppButton>Buka Bantuan</AppButton>
              </Link>
            </>
          }
        />

        {activeBlockingAppointment ? (
          <AppCard padding="md" className="space-y-3 border-red-200 bg-red-50/80">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-700" />
              <div className="space-y-1">
                <AppCardTitle className="text-base text-red-900">
                  Akun ini masih punya antrean aktif
                </AppCardTitle>
                <AppCardDescription className="text-red-800">
                  {`Antrean ${activeBlockingAppointment.queueNumber} untuk ${activeBlockingAppointment.serviceTitle} masih aktif. Selesaikan atau batalkan antrean tersebut sebelum mengambil antrean baru.`}
                </AppCardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/jadwal-saya/${encodeURIComponent(activeBlockingAppointment.id)}`}>
                <AppButton variant="outline">Buka antrean aktif</AppButton>
              </Link>
              <Link href="/jadwal-saya">
                <AppButton>Jadwal Saya</AppButton>
              </Link>
            </div>
          </AppCard>
        ) : null}

        <AppCard padding="md" className="space-y-3">
          <div className="flex items-center gap-1.5">
            {BOOKING_STEPS.map((entry, index) => {
              const activeIndex = BOOKING_STEPS.indexOf(step);
              const isDone = index < activeIndex;
              const isActive = index === activeIndex;

              return (
                <div
                  key={entry}
                  className={`h-2 rounded-full transition-all ${
                    isActive
                      ? "w-8 bg-role-accent"
                      : isDone
                        ? "w-4 bg-role-accent/45"
                        : "w-2 bg-border"
                  }`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>Langkah {BOOKING_STEPS.indexOf(step) + 1} dari 3</span>
            <span>
              {step === "complaint"
                ? "Lengkapi keperluan"
                : step === "date"
                  ? "Tentukan jadwal"
                  : "Konfirmasi antrian"}
            </span>
          </div>
        </AppCard>

        <div className="mx-auto max-w-3xl space-y-6">
          {step === "complaint" ? (
            <>
              <AppCard padding="lg" className="space-y-5">
                <div className="space-y-2">
                  <AppCardTitle>Kebutuhan layanan</AppCardTitle>
                  <AppCardDescription>
                    Lengkapi data yang dibutuhkan agar layanan sesuai dengan alur form asli dan petugas bisa menyiapkan sesi dengan tepat.
                  </AppCardDescription>
                </div>

                <AppFormField
                  label="Kategori instansi"
                  labelTone="quiet"
                  density="compact"
                >
                  <AppSelect
                    value={applicantCategory}
                    onChange={(event) => setApplicantCategory(event.target.value)}
                  >
                    <option value="">Pilih kategori pemohon</option>
                    {bookingApplicantCategories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </AppSelect>
                </AppFormField>

                <AppFormField
                  label="Nama instansi"
                  labelTone="quiet"
                  density="compact"
                >
                  <AppInput
                    value={institutionName}
                    onChange={(event) => setInstitutionName(event.target.value)}
                    placeholder="Tulis nama instansi secara manual"
                  />
                </AppFormField>

                {service.topicOptions?.length ? (
                  <AppFormField
                    label={service.topicLabel ?? "Topik layanan"}
                    labelTone="quiet"
                    density="compact"
                  >
                    <AppSelect
                      value={serviceTopic}
                      onChange={(event) => setServiceTopic(event.target.value)}
                    >
                      <option value="">Pilih topik layanan</option>
                      {service.topicOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </AppSelect>
                  </AppFormField>
                ) : null}

                <AppFormField
                  label={service.topicOptions?.length ? "Rincian tambahan" : "Keluhan atau keperluan"}
                  labelTone="quiet"
                  density="compact"
                >
                  <AppTextarea
                    rows={5}
                    value={complaint}
                    onChange={(event) => setComplaint(event.target.value)}
                    placeholder={
                      service.topicOptions?.length
                        ? "Tambahkan rincian singkat jika ada konteks khusus yang perlu diketahui petugas."
                        : "Tuliskan kebutuhan atau keluhan Anda secara singkat."
                    }
                  />
                </AppFormField>
              </AppCard>

              <AppCard padding="lg" className="space-y-4">
                <AppCardTitle>Jumlah tamu</AppCardTitle>
                <AppFormField
                  label="Jumlah tamu"
                  labelTone="quiet"
                  density="compact"
                >
                  <AppInput
                    min="1"
                    step="1"
                    type="number"
                    inputMode="numeric"
                    value={guestCount}
                    onChange={(event) => setGuestCount(event.target.value)}
                  />
                </AppFormField>
              </AppCard>

              <AppButton size="lg" onClick={handleComplaintNext} className="w-full">
                Lanjut
              </AppButton>
            </>
          ) : null}

          {step === "date" ? (
            <DatePicker
              service={service}
              selectedDate={selectedDate}
              availableSlots={selectedAvailableSlots}
              runtimeData={runtimeData}
              isLiveSession={isLiveSession}
              isLoadingAvailability={isLoadingRuntimeData || isFetchingRuntimeData}
              slotDurationMinutes={effectiveSlotDurationMinutes}
              dailyQuota={effectiveDailyQuota}
              selectedAvailabilityState={selectedDateAvailability?.state ?? null}
              onSelectDate={handleSelectDate}
            />
          ) : null}

          {step === "confirm" && selectedDate && selectedSlot ? (
            <BookingConfirmationContent
              draft={{
                service,
                serviceId: service.id,
                applicantCategory: applicantCategory || undefined,
                institutionName: institutionName.trim() || undefined,
                serviceTopic: serviceTopic || undefined,
                dateKey: selectedDate,
                dateLabel: selectedDateLabel ?? selectedDate,
                timeRange: `${selectedSlot.start} - ${selectedSlot.end}`,
                complaint: complaint.trim() || "Tidak ada rincian tambahan.",
                guestCount: Math.max(Number(guestCount) || 1, 1),
                queueNumber:
                  previewQueueNumber ??
                  buildLegacyQueueNumberForService(
                    service.id,
                    isLiveSession ? runtimeAppointments : userAppointments,
                    selectedDate,
                  ),
                asalInstansi: profile?.asalInstansi || applicantCategory || "Instansi belum diisi",
              }}
              busy={booking}
              onEditSchedule={() => setStep("date")}
              onConfirm={handleConfirm}
            />
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}

function DatePicker({
  service,
  selectedDate,
  availableSlots,
  runtimeData,
  isLiveSession,
  isLoadingAvailability,
  slotDurationMinutes,
  dailyQuota,
  selectedAvailabilityState,
  onSelectDate,
}: {
  service: BookingServiceEntry;
  selectedDate: string | null;
  availableSlots: ReturnType<typeof getAvailableSlotsRuntime>;
  runtimeData: ReturnType<typeof normalizeBookingRuntimeData> | undefined;
  isLiveSession: boolean;
  isLoadingAvailability: boolean;
  slotDurationMinutes: number;
  dailyQuota: number;
  selectedAvailabilityState:
    | ReturnType<typeof getDateAvailabilityRuntime>["state"]
    | null;
  onSelectDate: (date: string) => void;
}) {
  const today = React.useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const selectedDateValue = React.useMemo(
    () => (selectedDate ? new Date(`${selectedDate}T08:00:00+07:00`) : null),
    [selectedDate],
  );
  const [viewMonth, setViewMonth] = React.useState(
    selectedDateValue?.getMonth() ?? today.getMonth(),
  );
  const [viewYear, setViewYear] = React.useState(
    selectedDateValue?.getFullYear() ?? today.getFullYear(),
  );

  React.useEffect(() => {
    if (!selectedDateValue) {
      return;
    }

    setViewMonth(selectedDateValue.getMonth());
    setViewYear(selectedDateValue.getFullYear());
  }, [selectedDateValue]);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow = firstDay.getDay();

  const cells: Array<number | null> = [];
  for (let index = 0; index < startDow; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  const availability = React.useMemo(() => {
    const map: Record<
      string,
      ReturnType<typeof getDateAvailabilityRuntime>
    > = {};

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (dateKey < todayKey) {
        continue;
      }

      if (runtimeData) {
        map[dateKey] = getDateAvailabilityRuntime(
          service.id,
          dateKey,
          runtimeData.services,
          runtimeData.appointments,
          runtimeData.settings,
          runtimeData.unorConfigs,
        );
        continue;
      }

      if (!isLiveSession) {
        map[dateKey] = getDateAvailabilityRuntime(
          service.id,
          dateKey,
          FALLBACK_RUNTIME_SERVICES,
          FALLBACK_RUNTIME_APPOINTMENTS,
          FALLBACK_BOOKING_SETTINGS,
        );
      }
    }

    return map;
  }, [daysInMonth, isLiveSession, runtimeData, service, todayKey, viewMonth, viewYear]);

  const canPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  function prevMonth() {
    if (!canPrev) {
      return;
    }

    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((current) => current - 1);
      return;
    }

    setViewMonth((current) => current - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((current) => current + 1);
      return;
    }

    setViewMonth((current) => current + 1);
  }

  return (
    <AppCard padding="lg" className="space-y-5">
      <div className="space-y-2">
        <AppCardTitle>Pilih tanggal kunjungan</AppCardTitle>
        <AppCardDescription>
          Pilih tanggal yang masih tersedia. Sistem akan otomatis memberi estimasi waktu datang paling awal yang masih kosong.
        </AppCardDescription>
        <p className="text-xs text-muted-foreground">
          Slot {slotDurationMinutes} menit • {dailyQuota} booking / hari
        </p>
        {isLiveSession && !runtimeData ? (
          <p className="text-xs text-muted-foreground">
            {isLoadingAvailability
              ? "Memuat slot live dari server antrian..."
              : "Slot live belum terbaca. Coba muat ulang halaman jika ini berlangsung lama."}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          onClick={prevMonth}
          disabled={!canPrev}
          className="inline-flex size-10 items-center justify-center rounded-2xl border border-border bg-surface-container-low text-muted-foreground transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>

        <p className="font-heading text-base font-semibold tracking-tight">
          {firstDay.toLocaleDateString("id-ID", { month: "long" })} {viewYear}
        </p>

        <button
          type="button"
          aria-label="Bulan berikutnya"
          onClick={nextMonth}
          className="inline-flex size-10 items-center justify-center rounded-2xl border border-border bg-surface-container-low text-muted-foreground transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest p-3">
        <div className="grid grid-cols-7 gap-1">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
            <div key={day} className="px-0 py-1 text-center text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (day === null) {
              return <div key={`pad-${index}`} />;
            }

            const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const availabilityState = availability[dateKey] ?? {
              slots: 0,
              state: "closed" as const,
            };
            const slots = availabilityState.slots;
            const isPast = dateKey < todayKey;
            const isToday = dateKey === todayKey;
            const isSelectedDate = dateKey === selectedDate;
            const isSelectionLocked = isLiveSession && !runtimeData;
            const isClosed =
              !isPast && !isSelectionLocked && availabilityState.state === "closed";
            const isHoliday =
              !isPast && !isSelectionLocked && availabilityState.state === "holiday";
            const isFull =
              !isPast &&
              !isSelectionLocked &&
              !isHoliday &&
              !isClosed &&
              availabilityState.state !== "available";
            const isAvailable = !isPast && !isSelectionLocked && availabilityState.state === "available";

            return (
              <button
                key={dateKey}
                type="button"
                disabled={isPast || isFull || isClosed || isSelectionLocked || isHoliday}
                onClick={() => onSelectDate(dateKey)}
                className={`aspect-square rounded-[1.1rem] border transition-all ${
                  isPast
                    ? "cursor-default border-border bg-muted/40 text-muted-foreground"
                    : isHoliday
                      ? "cursor-default border-red-200 bg-red-50 text-red-700"
                    : isClosed
                      ? "cursor-default border-border bg-surface-container-low text-muted-foreground"
                    : isSelectedDate
                      ? "border-role-accent bg-role-accent-soft/55 shadow-[0_12px_28px_-24px_rgba(185,28,28,0.5)]"
                    : isAvailable
                      ? "border-transparent bg-surface-container-low hover:-translate-y-0.5 hover:bg-role-accent-soft/60"
                      : "cursor-default border-border bg-surface-container-low text-muted-foreground"
                } ${isToday || isSelectedDate ? "ring-1 ring-role-accent/40" : ""}`}
              >
                <span
                  className={`block pt-1 text-sm font-semibold ${
                    isPast
                      ? "text-muted-foreground"
                      : isHoliday
                        ? "text-red-700"
                        : "text-foreground"
                  }`}
                >
                  {day}
                </span>
                {!isPast ? (
                  <span
                    className={`mt-1 block text-[0.45rem] font-semibold ${
                      isSelectionLocked
                        ? "text-muted-foreground"
                        : isHoliday
                          ? "text-red-600"
                          : isClosed
                            ? "text-muted-foreground"
                          : isAvailable
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                    }`}
                  >
                    {isSelectionLocked
                      ? "Memuat"
                      : isHoliday
                        ? "Libur"
                        : isClosed
                          ? isToday
                            ? "Selesai"
                            : "Tutup"
                          : isAvailable
                            ? slots
                            : "Penuh"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <LegendDot tone="emerald" label="Tersedia" />
        <LegendDot tone="danger" label="Libur" />
        <LegendDot tone="muted" label="Penuh / Tutup" />
      </div>

      <div className="rounded-[var(--radius-2xl)] border border-border bg-surface-container-low px-4 py-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Estimasi waktu datang
          </p>
          <p className="text-sm font-semibold">
            {selectedDate ? formatDateLabel(selectedDate) : "Pilih tanggal terlebih dahulu"}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedDate
              ? "Jam akan ditentukan otomatis dari slot kosong paling awal pada tanggal ini."
              : "Estimasi waktu datang akan muncul otomatis setelah tanggal dipilih."}
          </p>
        </div>

        {selectedDate ? (
          availableSlots.length > 0 ? (
            <div className="mt-4 rounded-[1rem] border border-role-accent/20 bg-background px-4 py-4">
              <p className="text-sm font-semibold">
                {availableSlots[0]?.startTime} WIB - {availableSlots[0]?.endTime} WIB
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Slot ini dipilih otomatis karena masih menjadi jadwal paling awal yang kosong.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Setelah Anda konfirmasi, pemesan berikutnya akan mendapat slot kosong sesudahnya.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {selectedAvailabilityState === "closed"
                ? "Booking untuk tanggal ini sudah ditutup karena tidak ada window jam yang masih tersisa."
                : selectedAvailabilityState === "holiday"
                  ? "Tanggal ini adalah hari libur layanan. Pilih tanggal lain yang masih tersedia."
                  : "Tidak ada jam kosong di tanggal ini. Pilih tanggal lain yang masih tersedia."}
            </p>
          )
        ) : null}
      </div>
    </AppCard>
  );
}

function LegendDot({
  tone,
  label,
}: {
  tone: "emerald" | "muted" | "danger";
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`size-2 rounded-full ${
          tone === "emerald"
            ? "bg-emerald-500"
            : tone === "danger"
              ? "bg-red-500"
              : "bg-muted-foreground/40"
        }`}
      />
      <span className="text-[0.7rem]">{label}</span>
    </div>
  );
}
