import { createElement } from "react";
import {
  ChartColumn,
  ClipboardList,
  Download,
  MonitorCog,
  QrCode,
  RefreshCcw,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";
import { AppActionBar } from "@/components/ui/app-action-bar";
import { type AppRole } from "@/design-system/roles";
import { InternalWorkspaceUnavailable } from "@/features/internal/components/internal-workspace-unavailable";
import {
  getInternalPageConfig,
  getInternalPagePath,
  type InternalPageKey,
  type InternalRole,
} from "@/features/internal/internal-workspace-config";
import {
  getWorkspaceRowActions,
  getWorkspaceRowAssistText,
  normalizeWorkspaceStatus,
  resolveWorkspaceStatusTone,
  type WorkspaceActionDescriptor,
} from "@/features/internal/internal-workspace-actions";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";
import { getInternalUnavailableCopy } from "@/features/internal/internal-workspace-registry";

function resolveActionIcon(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("check-in") || normalized.includes("lobby") || normalized.includes("qr")) {
    return QrCode;
  }
  if (normalized.includes("riwayat")) {
    return RefreshCcw;
  }
  if (normalized.includes("analitik")) {
    return ChartColumn;
  }
  if (normalized.includes("antrean")) {
    return ClipboardList;
  }
  if (normalized.includes("ekspor") || normalized.includes("unduh") || normalized.includes("download")) {
    return Download;
  }
  if (normalized.includes("monitor")) {
    return MonitorCog;
  }
  if (normalized.includes("filter")) {
    return SlidersHorizontal;
  }
  return RefreshCcw;
}

function WorkspaceActionPill({
  action,
}: {
  action: WorkspaceActionDescriptor;
}) {
  const toneClass =
    action.tone === "primary"
      ? "border-role-accent/20 bg-role-accent-soft text-role-accent-strong"
      : action.tone === "secondary"
        ? "border-border bg-surface-container-low text-foreground"
        : "border-transparent bg-surface-container-low text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${toneClass}`}
    >
      {action.tone === "primary" ? <ArrowRight className="size-3" /> : null}
      {action.label}
    </span>
  );
}

function getWorkspaceTableLabels(role: InternalRole, page: InternalPageKey) {
  if (role === "resepsionis" && page === "dashboard") {
    return {
      reference: "No. Antrean",
      item: "Layanan",
      status: "Status",
      note: "Keterangan",
      actions: "Aksi",
    };
  }

  return {
    reference: "Referensi",
    item: "Item",
    status: "Status",
    note: "Catatan",
    actions: "Aksi Berikutnya",
  };
}

export function InternalWorkspacePage({
  role,
  page = "dashboard",
}: {
  role: InternalRole;
  page?: InternalPageKey;
}) {
  const config = getInternalPageConfig(role, page);
  if (!config) {
    const fallback = getInternalUnavailableCopy(role);
    return (
      <DashboardShell
        role={role}
        currentPath={getInternalPagePath(role, "dashboard")}
        title={fallback.title}
        subtitle={fallback.description}
      >
        <InternalWorkspaceUnavailable {...fallback} />
      </DashboardShell>
    );
  }
  const nextReadyRowId =
    role === "unit-organisasi"
      ? config.rows.find((row) =>
          normalizeWorkspaceStatus(row.status).includes("siap dipanggil"),
        )?.id ?? null
      : null;
  const showRowActions = config.rows.some(
    (row) => getWorkspaceRowActions(role, page, row, nextReadyRowId).length > 0,
  );
  const isResepsionisDashboard = role === "resepsionis" && page === "dashboard";
  const tableLabels = getWorkspaceTableLabels(role, page);
  const tableBlock = (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {config.tableEyebrow}
      </p>
      <AppTable className={isResepsionisDashboard ? "table-fixed" : undefined}>
        <AppTableHead>
          <tr>
            <AppTableHeaderCell className={isResepsionisDashboard ? "w-[16%]" : undefined}>
              {tableLabels.reference}
            </AppTableHeaderCell>
            <AppTableHeaderCell className={isResepsionisDashboard ? "w-[22%]" : undefined}>
              {tableLabels.item}
            </AppTableHeaderCell>
            <AppTableHeaderCell className={isResepsionisDashboard ? "w-[16%]" : undefined}>
              {tableLabels.status}
            </AppTableHeaderCell>
            <AppTableHeaderCell className={isResepsionisDashboard ? "w-[30%]" : undefined}>
              {tableLabels.note}
            </AppTableHeaderCell>
            {showRowActions ? (
              <AppTableHeaderCell className={isResepsionisDashboard ? "w-[16%]" : undefined}>
                {tableLabels.actions}
              </AppTableHeaderCell>
            ) : null}
          </tr>
        </AppTableHead>
        <tbody>
          {config.rows.map((row) => {
            const assistText = getWorkspaceRowAssistText(role, page, row, nextReadyRowId);
            const rowActions = getWorkspaceRowActions(role, page, row, nextReadyRowId);

            return (
              <AppTableRow key={row.id}>
                <AppTableCell className={isResepsionisDashboard ? "font-semibold text-foreground" : "font-semibold"}>
                  {formatQueueNumberForDisplay(row.id)}
                </AppTableCell>
                <AppTableCell>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{row.title}</p>
                  </div>
                </AppTableCell>
                <AppTableCell>
                  <AppStatusBadge status={resolveWorkspaceStatusTone(row.status)} label={row.status} />
                </AppTableCell>
                <AppTableCell className="space-y-1.5 text-muted-foreground">
                  <p>{row.note}</p>
                  {!isResepsionisDashboard && assistText ? (
                    <p className="text-xs leading-5 text-muted-foreground/90">
                      {assistText}
                    </p>
                  ) : null}
                </AppTableCell>
                {showRowActions ? (
                  <AppTableCell>
                    <div className="flex flex-wrap gap-2">
                      {rowActions.map((action) => (
                        <WorkspaceActionPill
                          key={`${row.id}-${action.label}`}
                          action={action}
                        />
                      ))}
                    </div>
                  </AppTableCell>
                ) : null}
              </AppTableRow>
            );
          })}
        </tbody>
      </AppTable>
    </div>
  );

  return (
    <DashboardShell
      role={role}
      currentPath={getInternalPagePath(role, page)}
      title={config.title}
      subtitle={config.description}
    >
      <div className="space-y-8">
        <AppSectionHeader
          eyebrow={config.heroEyebrow}
          title={config.heroTitle}
          description={config.heroDescription}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {config.heroSecondaryAction ? (
                <AppButton variant="outline">
                  {createElement(resolveActionIcon(config.heroSecondaryAction), {
                    className: "size-4",
                  })}
                  {config.heroSecondaryAction}
                </AppButton>
              ) : null}
              <AppButton>
                {createElement(resolveActionIcon(config.heroPrimaryAction), {
                  className: "size-4",
                })}
                {config.heroPrimaryAction}
              </AppButton>
            </div>
          }
        />

        {config.actionPills?.length && !isResepsionisDashboard ? (
          <AppActionBar>
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Aksi cepat
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {role === "resepsionis"
                  ? "Resepsionis hanya check-in, cek riwayat, dan saring antrean hari ini."
                  : role === "unit-organisasi"
                    ? "Unit memproses antrean yang sudah check-in sebelum lanjut ke layanan."
                  : config.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
              {config.actionPills.map((pill) => (
                <AppButton key={pill} variant="outline" className="min-w-fit">
                  {pill}
                </AppButton>
              ))}
            </div>
          </AppActionBar>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {config.stats.map((stat) => (
            <AppStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              description={stat.description}
              tone={stat.tone}
            />
          ))}
        </div>

        {isResepsionisDashboard ? (
          tableBlock
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            {tableBlock}

            <AppCard padding="lg" className="space-y-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {config.insightEyebrow}
              </p>
              <div className="space-y-2">
                <h3 className="font-heading text-2xl font-bold">{config.insightTitle}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{config.insightDescription}</p>
              </div>
              <div className="space-y-3">
                {config.insightPoints.map((point) => (
                  <div key={point.text} className="flex items-start gap-3 rounded-[var(--radius-2xl)] bg-surface-container-low p-4">
                    <point.icon className="mt-0.5 size-4 shrink-0 text-role-accent" />
                    <p className="text-sm leading-6 text-muted-foreground">{point.text}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-[var(--radius-2xl)] bg-role-accent-soft p-5 text-sm leading-6 text-role-accent-strong">
                {config.workspaceNote ??
                  "Gunakan halaman ini sebagai bacaan cepat untuk status utama, keputusan berikutnya, dan catatan operasional yang perlu segera ditindaklanjuti selama layanan berjalan."}
              </div>
            </AppCard>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export function InternalDashboardPage({ role }: { role: AppRole }) {
  if (role === "user") return null;
  return <InternalWorkspacePage role={role} page="dashboard" />;
}
