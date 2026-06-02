import { apiRequest } from "@/lib/api/client";
import { syncExpiredAppointments } from "@/lib/api/appointment-maintenance";

export async function getInitialData(actor?: { userId?: string; staffId?: string }) {
  await syncExpiredAppointments();
  return apiRequest<{ data: unknown }>("/init", {
    actor,
    cache: "no-store",
  });
}

export async function getScopedData(actor?: { userId?: string; staffId?: string }) {
  await syncExpiredAppointments();
  return apiRequest<{ data: unknown }>("/data", {
    actor,
    cache: "no-store",
  });
}
