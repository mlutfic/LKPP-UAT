export type AppointmentQrPayload = {
  type: "lkpp-appointment" | "legacy-appointment";
  appointmentId: string;
  queueNumber?: string;
  serviceId?: string;
  visitDate?: string;
};

export function buildAppointmentQrValue({
  id,
  qrToken,
}: {
  id: string;
  qrToken?: string;
  queueNumber: string;
  serviceId: string;
  date: string;
}) {
  return typeof qrToken === "string" && qrToken.trim() ? qrToken.trim() : id;
}

export function parseAppointmentQrValue(rawValue: string): AppointmentQrPayload | null {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AppointmentQrPayload>;
    if (typeof parsed.appointmentId === "string" && parsed.appointmentId.trim()) {
      return {
        type: parsed.type === "lkpp-appointment" ? "lkpp-appointment" : "legacy-appointment",
        appointmentId: parsed.appointmentId.trim(),
        queueNumber: typeof parsed.queueNumber === "string" ? parsed.queueNumber : undefined,
        serviceId: typeof parsed.serviceId === "string" ? parsed.serviceId : undefined,
        visitDate: typeof parsed.visitDate === "string" ? parsed.visitDate : undefined,
      };
    }
  } catch {
    // Legacy QR values may contain only the appointment id, so keep the fallback below.
  }

  return {
    type: "legacy-appointment",
    appointmentId: value,
  };
}
