import { apiRequest } from "@/lib/api/client";

export function fetchAuditLogs() {
  return apiRequest<{ logs: unknown[] }>("/audit-logs");
}

export function fetchAdminDashboardOverview() {
  return apiRequest<{ overview: unknown }>("/admin/dashboard/overview");
}

export function fetchAdminServicesOverview() {
  return apiRequest<{ overview: unknown }>("/admin/services/overview");
}

export function fetchAdminStaffOverview() {
  return apiRequest<{ overview: unknown }>("/admin/staff/overview");
}
