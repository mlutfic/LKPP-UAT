export type PublicQueueLookupResult = {
  id: string;
  queueNumber: string;
  status:
    | "booked"
    | "confirmed"
    | "calling"
    | "in-service"
    | "completed"
    | "cancelled"
    | "no-show";
  statusLabel: string;
  statusBadge:
    | "aktif"
    | "menunggu"
    | "selesai"
    | "dipanggil"
    | "diproses"
    | "warning"
    | "danger"
    | "dijadwalkan"
    | "dibatalkan"
    | "tidak-hadir";
  summaryNote: string;
  checkedIn: boolean;
  callCount: number;
  counterId?: number;
  serviceId: string;
  serviceTitle: string;
  unitLabel: string;
  date: string;
  dateLabel: string;
  timeRange: string;
};

export type PublicQueueLookupResponse = {
  ok: boolean;
  lookupType?: "email" | "queue-number";
  lookup?: string;
  matches?: PublicQueueLookupResult[];
  error?: string;
};

export async function lookupPublicQueue(lookup: string) {
  const response = await fetch("/api/public/queue-lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ lookup }),
  });

  const payload = (await response.json().catch(() => ({}))) as PublicQueueLookupResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Gagal memeriksa status antrean.");
  }

  return payload;
}
