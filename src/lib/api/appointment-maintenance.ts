export async function syncExpiredAppointments() {
  const response = await fetch("/api/internal/appointments/expire-stale", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Sinkron tiket hangus otomatis gagal dijalankan.");
  }

  return payload;
}
