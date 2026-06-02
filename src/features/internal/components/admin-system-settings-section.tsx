"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AppBadge } from "@/components/ui/app-badge";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppProgress } from "@/components/ui/app-progress";
import { AppStatCard } from "@/components/ui/app-stat-card";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";

type RuntimeStatus = {
  backendConfigured: boolean;
  turnstileConfigured: boolean;
  brevoConfigured: boolean;
  cloudflareConfigured: boolean;
};

type RuntimeTelemetry = {
  ok: boolean;
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  functionName: string;
  backendBaseUrl: string;
  turnstileSiteKey: string;
  status: RuntimeStatus;
};

type HealthTelemetry = {
  ok: boolean;
  service: string;
  timestamp: string;
  env: RuntimeStatus;
};

type StorageTelemetry = {
  projectRef: string;
  timestamp: string;
  disk: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usedRatio: number;
  };
  storage: {
    fileSizeLimitBytes: number;
    features: Record<string, unknown>;
    capabilities: Record<string, unknown>;
    external: Record<string, unknown>;
    migrationVersion: string;
    databasePoolMode: string;
  };
};

type SystemTelemetrySnapshot = {
  ok: boolean;
  generatedAt: string;
  runtime: RuntimeTelemetry;
  health: HealthTelemetry;
  storage: StorageTelemetry | null;
  warning?: string;
};

type TelemetryStat = {
  label: string;
  value: string;
  description: string;
  tone: "role" | "info" | "warning" | "success" | "danger" | "neutral";
  icon: LucideIcon;
};

const ADMIN_MANAGED_EVENT_PREFIX = "lkpp:admin-managed";

function useManagedEvent(
  page: "pengaturan",
  action: "primary" | "secondary",
  handler: () => void,
) {
  React.useEffect(() => {
    const eventName = `${ADMIN_MANAGED_EVENT_PREFIX}:${page}:${action}`;
    const onEvent = () => handler();

    window.addEventListener(eventName, onEvent);
    return () => window.removeEventListener(eventName, onEvent);
  }, [action, handler, page]);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value)}%`;
}

function maskValue(value: string, fallback = "Belum ada") {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.length <= 10) {
    return trimmed;
  }

  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

async function fetchTelemetry(): Promise<SystemTelemetrySnapshot> {
  const response = await fetch("/api/admin/system-telemetry", {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Telemetry sistem belum dapat dibaca.");
  }

  return (await response.json()) as SystemTelemetrySnapshot;
}

function getStatusTone(ready: boolean): "success" | "warning" {
  return ready ? "success" : "warning";
}

export function AdminSystemSettingsSection() {
  const [showDetails, setShowDetails] = React.useState(true);
  const telemetryQuery = useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: fetchTelemetry,
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  const telemetry = telemetryQuery.data ?? null;
  const runtime = telemetry?.runtime ?? null;
  const health = telemetry?.health ?? null;
  const storage = telemetry?.storage ?? null;
  const warning = telemetry?.warning ?? "";
  const isTelemetryPending =
    !telemetry && (telemetryQuery.isPending || telemetryQuery.isFetching);

  const backendReady = Boolean(runtime?.status.backendConfigured);
  const realtimeReady = Boolean(runtime?.backendBaseUrl && runtime?.functionName);
  const securityReady = Boolean(runtime?.status.turnstileConfigured);

  const telemetryCheckedAt = telemetry?.generatedAt
    ? new Date(telemetry.generatedAt).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Belum diperbarui";
  const lastChecked = health?.timestamp
    ? new Date(health.timestamp).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : telemetryCheckedAt;

  const storageUsedPercent = storage ? storage.disk.usedRatio * 100 : 0;
  const storageAvailableLabel = storage ? formatBytes(storage.disk.availableBytes) : "Belum terbaca";
  const storageUsedLabel = storage ? formatBytes(storage.disk.usedBytes) : "Belum terbaca";
  const storageTotalLabel = storage ? formatBytes(storage.disk.totalBytes) : "Belum terbaca";
  const storageLimitLabel = storage ? formatBytes(storage.storage.fileSizeLimitBytes) : "Belum terbaca";

  const stats: TelemetryStat[] = isTelemetryPending
    ? [
        {
          label: "Server backend",
          value: "…",
          description: "Sedang membaca koneksi backend aktif.",
          tone: "success" as const,
          icon: Server,
        },
        {
          label: "Supabase Disk",
          value: "…",
          description: "Mengambil kapasitas storage dari telemetry.",
          tone: "info" as const,
          icon: HardDrive,
        },
        {
          label: "Realtime",
          value: "…",
          description: "Memeriksa function dan kanal realtime.",
          tone: "role" as const,
          icon: Workflow,
        },
        {
          label: "Keamanan",
          value: "…",
          description: "Memvalidasi proteksi Turnstile untuk login.",
          tone: "warning" as const,
          icon: ShieldCheck,
        },
      ]
    : [
        {
          label: "Server backend",
          value: backendReady ? "Aktif" : "Belum siap",
          description: runtime?.backendBaseUrl || "Backend belum terbaca.",
          tone: getStatusTone(backendReady),
          icon: Server,
        },
        {
          label: "Supabase Disk",
          value: storageAvailableLabel,
          description: storage
            ? `Dipakai ${storageUsedLabel} dari ${storageTotalLabel}.`
            : "Telemetry storage Supabase belum tersedia.",
          tone: storage ? "info" : "warning",
          icon: HardDrive,
        },
        {
          label: "Realtime",
          value: realtimeReady ? "Siap" : "Belum siap",
          description: runtime?.functionName
            ? `Function ${runtime.functionName}`
            : "Function belum terbaca.",
          tone: getStatusTone(realtimeReady),
          icon: Workflow,
        },
        {
          label: "Keamanan",
          value: securityReady ? "Siap" : "Perlu cek",
          description:
            runtime?.status.turnstileConfigured
              ? "Turnstile siap dipakai untuk verifikasi login."
              : "Kunci Turnstile belum lengkap.",
          tone: getStatusTone(securityReady),
          icon: ShieldCheck,
        },
      ];

  useManagedEvent("pengaturan", "primary", () => {
    void telemetryQuery.refetch();
    toast.success("Status sistem disegarkan.");
  });

  useManagedEvent("pengaturan", "secondary", () => {
    setShowDetails((current) => {
      const nextValue = !current;
      toast.success(nextValue ? "Rincian status sistem ditampilkan." : "Rincian status sistem disembunyikan.");
      return nextValue;
    });
  });

  return (
    <div className="space-y-6">
      <AppCard tone="soft" padding="lg" className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Status sistem realtime
            </p>
            <h2 className="text-2xl font-bold tracking-tight">Storage dan backend Supabase</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Data dibaca langsung dari telemetry server dan management API Supabase.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone={health?.ok ? "success" : isTelemetryPending ? "default" : "warning"}>
              {isTelemetryPending ? "Memuat..." : health?.ok ? "Sehat" : "Perlu cek"}
            </AppBadge>
            <AppBadge tone="default">Update {telemetryCheckedAt}</AppBadge>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <AppButton
            variant="outline"
            onClick={() => void telemetryQuery.refetch()}
            loading={telemetryQuery.isFetching}
          >
            <RefreshCw className="size-4" />
            Muat ulang status
          </AppButton>
          <AppButton variant="outline" onClick={() => setShowDetails((current) => !current)}>
            {showDetails ? "Sembunyikan detail" : "Tampilkan detail"}
          </AppButton>
        </div>

        {warning ? (
          <div className="rounded-[24px] border border-dashed border-border bg-surface-container-lowest px-4 py-4">
            <p className="text-sm font-semibold tracking-tight">Sebagian telemetry belum lengkap</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{warning}</p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <AppStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              tone={stat.tone}
            />
          ))}
        </div>
      </AppCard>

      {telemetryQuery.isError ? (
        <AppCard padding="lg" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold tracking-tight">Status sistem belum dapat dimuat</p>
              <p className="text-sm leading-6 text-muted-foreground">
                {telemetryQuery.error instanceof Error
                  ? telemetryQuery.error.message
                  : "Terjadi kendala saat membaca telemetry sistem."}
              </p>
            </div>
            <AppBadge tone="warning">Perlu cek</AppBadge>
          </div>
          <div>
            <AppButton
              variant="outline"
              onClick={() => void telemetryQuery.refetch()}
              loading={telemetryQuery.isFetching}
            >
              <RefreshCw className="size-4" />
              Coba lagi
            </AppButton>
          </div>
        </AppCard>
      ) : null}

      {showDetails ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <AppCard padding="lg" className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Kapasitas storage
                </p>
                <h3 className="text-xl font-bold tracking-tight">Sisa ruang Supabase</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {storage
                    ? `Terpakai ${storageUsedLabel} dari ${storageTotalLabel}. Sisa ${storageAvailableLabel}.`
                    : "Data kapasitas storage Supabase belum berhasil dibaca."}
                </p>
              </div>
              <AppBadge tone={storage ? "success" : "warning"}>
                {storage ? `${formatPercent(storageUsedPercent)} terpakai` : "Belum terbaca"}
              </AppBadge>
            </div>

            <AppProgress value={storageUsedPercent} />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-border bg-surface-container-low px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Terpakai
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight">{storageUsedLabel}</p>
              </div>
              <div className="rounded-[24px] border border-border bg-surface-container-low px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Sisa
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight">{storageAvailableLabel}</p>
              </div>
              <div className="rounded-[24px] border border-border bg-surface-container-low px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Batas file
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight">{storageLimitLabel}</p>
              </div>
            </div>
          </AppCard>

          <AppCard padding="lg" className="space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Rincian runtime
              </p>
              <h3 className="text-xl font-bold tracking-tight">Status server dan layanan</h3>
            </div>

            <AppTable className="table-fixed">
              <AppTableHead>
                <tr>
                  <AppTableHeaderCell className="w-[36%]">Parameter</AppTableHeaderCell>
                  <AppTableHeaderCell className="w-[42%]">Nilai</AppTableHeaderCell>
                  <AppTableHeaderCell className="w-[22%]">Status</AppTableHeaderCell>
                </tr>
              </AppTableHead>
              <tbody>
                <AppTableRow>
                  <AppTableCell className="font-semibold">Project Supabase</AppTableCell>
                  <AppTableCell className="break-all text-muted-foreground">
                    {storage?.projectRef || runtime?.supabaseUrl || "-"}
                  </AppTableCell>
                  <AppTableCell>
                    <AppBadge tone={storage || runtime?.supabaseUrl ? "success" : "warning"}>
                      {storage || runtime?.supabaseUrl ? "Terbaca" : "Kosong"}
                    </AppBadge>
                  </AppTableCell>
                </AppTableRow>
                <AppTableRow>
                  <AppTableCell className="font-semibold">Backend URL</AppTableCell>
                  <AppTableCell className="break-all text-muted-foreground">
                    {runtime?.backendBaseUrl || "-"}
                  </AppTableCell>
                  <AppTableCell>
                    <AppBadge tone={backendReady ? "success" : "warning"}>
                      {backendReady ? "Aktif" : "Belum siap"}
                    </AppBadge>
                  </AppTableCell>
                </AppTableRow>
                <AppTableRow>
                  <AppTableCell className="font-semibold">Koneksi realtime</AppTableCell>
                  <AppTableCell className="text-muted-foreground">
                    {runtime?.functionName ? `Function ${runtime.functionName}` : "Belum terbaca"}
                  </AppTableCell>
                  <AppTableCell>
                    <AppBadge tone={realtimeReady ? "success" : "warning"}>
                      {realtimeReady ? "Siap" : "Belum"}
                    </AppBadge>
                  </AppTableCell>
                </AppTableRow>
                <AppTableRow>
                  <AppTableCell className="font-semibold">Turnstile site key</AppTableCell>
                  <AppTableCell className="text-muted-foreground">
                    {maskValue(runtime?.turnstileSiteKey ?? "")}
                  </AppTableCell>
                  <AppTableCell>
                    <AppBadge tone={runtime?.turnstileSiteKey ? "success" : "warning"}>
                      {runtime?.turnstileSiteKey ? "Tersedia" : "Kosong"}
                    </AppBadge>
                  </AppTableCell>
                </AppTableRow>
                <AppTableRow>
                  <AppTableCell className="font-semibold">Cloudflare management API</AppTableCell>
                  <AppTableCell className="text-muted-foreground">
                    {runtime?.status.cloudflareConfigured ? "Aktif" : "Belum terhubung"}
                  </AppTableCell>
                  <AppTableCell>
                    <AppBadge tone={runtime?.status.cloudflareConfigured ? "success" : "default"}>
                      {runtime?.status.cloudflareConfigured ? "Opsional aktif" : "Opsional"}
                    </AppBadge>
                  </AppTableCell>
                </AppTableRow>
                <AppTableRow>
                  <AppTableCell className="font-semibold">Terakhir dibaca</AppTableCell>
                  <AppTableCell className="text-muted-foreground">{lastChecked}</AppTableCell>
                  <AppTableCell>
                    <AppBadge tone={health?.ok ? "success" : "warning"}>
                      {health?.ok ? "Terbaca" : "Belum ada"}
                    </AppBadge>
                  </AppTableCell>
                </AppTableRow>
              </tbody>
            </AppTable>

            <div className="rounded-[24px] border border-border bg-surface-container-low px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Endpoint aktif
              </p>
              <p className="mt-2 break-all text-sm leading-6 text-muted-foreground">
                {runtime?.backendBaseUrl || "Backend belum terbaca."}
              </p>
            </div>
          </AppCard>
        </div>
      ) : null}
    </div>
  );
}
