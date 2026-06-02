export type AdminExportWorkspacePackage = {
  id: string;
  title: string;
  status: "Siap" | "Terkirim" | "Perlu Review";
  note: string;
  scope: "rekap" | "audit" | "publik";
  scopeLabel: string;
  rowCount: number;
  formats: Array<"csv" | "pdf">;
  dateKey: string;
  lastUpdatedLabel: string;
  columns: string[];
  rows: string[][];
};

export type AdminExportWorkspaceResponse = {
  ok: boolean;
  generatedAt: string;
  availableRange: {
    minDate: string | null;
    maxDate: string | null;
  };
  packages: AdminExportWorkspacePackage[];
  error?: string;
};

export async function getAdminExportWorkspace(input: {
  startDate: string;
  endDate: string;
}) {
  const params = new URLSearchParams({
    startDate: input.startDate,
    endDate: input.endDate,
  });
  const response = await fetch(`/api/admin/export-workspace?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as Partial<AdminExportWorkspaceResponse>;

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Gagal memuat data ekspor admin.");
  }

  return {
    ok: true,
    generatedAt: String(payload.generatedAt || ""),
    availableRange: {
      minDate:
        typeof payload.availableRange?.minDate === "string"
          ? payload.availableRange.minDate
          : null,
      maxDate:
        typeof payload.availableRange?.maxDate === "string"
          ? payload.availableRange.maxDate
          : null,
    },
    packages: Array.isArray(payload.packages) ? payload.packages : [],
  } satisfies AdminExportWorkspaceResponse;
}
