function asFiniteInteger(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : 0;
}

export function normalizeCallingCounterId(counterId: number | null | undefined) {
  const normalized = asFiniteInteger(counterId);
  return normalized > 0 ? normalized : 0;
}

export function normalizeCallingCount(callCount: number | null | undefined) {
  return Math.max(asFiniteInteger(callCount), 0);
}

export function buildCallingNotificationSignature(args: {
  appointmentId: string;
  callCount?: number | null;
  counterId?: number | null;
}) {
  const appointmentId = String(args.appointmentId || "").trim();
  if (!appointmentId) {
    return "";
  }

  return `${appointmentId}:${normalizeCallingCount(args.callCount)}:${normalizeCallingCounterId(args.counterId)}`;
}

export function buildCallingNotificationTag(args: {
  appointmentId: string;
  callCount?: number | null;
  counterId?: number | null;
}) {
  const signature = buildCallingNotificationSignature(args);
  return signature ? `lkpp-calling-${signature}` : "";
}
