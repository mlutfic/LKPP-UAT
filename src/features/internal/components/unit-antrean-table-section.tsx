"use client";

import * as React from "react";

import { AppButton } from "@/components/ui/app-button";
import { AppCard } from "@/components/ui/app-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";
import {
  getWorkspaceRowActions,
  resolveWorkspaceStatusTone,
  type WorkspaceActionDescriptor,
} from "@/features/internal/internal-workspace-actions";
import {
  getUnitRowCounterId,
  isUnitCallingRow,
  isUnitCompletedRow,
  isUnitDeferredRow,
  isUnitInServiceRow,
  isUnitReadyRow,
  isUnitWaitingRow,
  type UnitWorkspaceRow,
} from "@/features/internal/unit/workspace";
import type {
  InternalPageKey,
  InternalRole,
} from "@/features/internal/internal-workspace-config";
import type { StaffPermissionSet } from "@/lib/internal-role-policy";
import { cn } from "@/lib/utils";

function buildReadyOrderMap(rows: UnitWorkspaceRow[]) {
  const readyRows = rows.filter(isUnitReadyRow);
  return new Map(readyRows.map((row, index) => [row.id, index + 1]));
}

function truncateSupportCopy(value: string | null | undefined, maxLength = 120) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function getQueueMeta(
  role: InternalRole,
  row: UnitWorkspaceRow,
  nextReadyRowId?: string | null,
  readyOrderMap?: Map<string, number>,
) {
  const readyOrder = readyOrderMap?.get(row.id);
  const normalizedStatus = row.status.trim().toLowerCase();

  if (normalizedStatus.includes("eskalasi") || normalizedStatus.includes("level 2")) {
    return normalizedStatus.includes("selesai")
      ? "Riwayat tindak lanjut level 2"
      : "Diteruskan ke petugas level 2";
  }

  if (isUnitWaitingRow(row)) {
    return "Menunggu check-in";
  }

  if (isUnitReadyRow(row)) {
    if (row.isEscalated) {
      return "Hasil eskalasi";
    }

    if (isUnitDeferredRow(row)) {
      return row.id === nextReadyRowId
        ? "Dilewati sementara · siap dipanggil ulang"
        : "Dilewati sementara";
    }

    if (role === "petugas-level-2") {
      return "Siap diproses";
    }

    if (row.id === nextReadyRowId) {
      return `Urutan ${readyOrder ?? 1} · berikutnya`;
    }

    if ((row.callCount ?? 0) > 0) {
      return `Panggilan ke-${row.callCount}`;
    }

    return `Urutan ${readyOrder ?? "-"}`;
  }

  if (isUnitCallingRow(row) || isUnitInServiceRow(row)) {
    if (isUnitCallingRow(row) && (row.callCount ?? 0) > 0) {
      if ((row.callCount ?? 0) >= 3) {
        return "Panggilan ke-3 · siap dilewati sementara";
      }
      return `Panggilan ke-${row.callCount}`;
    }

    if (role === "petugas-level-2") {
      return "Sedang diproses";
    }

    return "Sedang ditangani";
  }

  if (isUnitCompletedRow(row)) {
    if (role === "petugas-level-2") {
      return "Selesai";
    }

    return "Layanan selesai";
  }

  return row.status;
}

function getRowStatusLabel(
  row: UnitWorkspaceRow,
  nextReadyRowId?: string | null,
) {
  if (isUnitDeferredRow(row) && isUnitReadyRow(row)) {
    return row.id === nextReadyRowId
      ? "Siap Panggil Ulang"
      : "Dilewati Sementara";
  }

  return row.status;
}

function getActionEmptyLabel(
  row: UnitWorkspaceRow,
  nextReadyRowId?: string | null,
) {
  if (isUnitDeferredRow(row) && isUnitReadyRow(row)) {
    return row.id === nextReadyRowId
      ? "Siap dipanggil ulang"
      : "Menunggu giliran panggil ulang";
  }

  if (isUnitReadyRow(row)) {
    return row.id === nextReadyRowId
      ? "Menunggu diproses"
      : "Menunggu urutan panggil";
  }

  return "Tidak ada aksi";
}

function getCounterDisplayLabel(
  role: InternalRole,
  row: UnitWorkspaceRow,
  counterId?: number,
  validCounterNumbers?: number[],
) {
  if (typeof counterId !== "number") {
    return null;
  }

  if (
    role !== "petugas-level-2" &&
    row.isEscalated &&
    Array.isArray(validCounterNumbers) &&
    validCounterNumbers.length > 0 &&
    !validCounterNumbers.includes(counterId)
  ) {
    return null;
  }

  if (role === "petugas-level-2" && isUnitCompletedRow(row)) {
    return "Level 2";
  }

  if (role === "petugas-level-2" && isUnitCallingRow(row)) {
    return "Level 2";
  }

  if (role === "petugas-level-2" && isUnitInServiceRow(row)) {
    return "Level 2";
  }

  return `Loket ${counterId}`;
}

function isLockedToOtherActiveCounter(
  row: UnitWorkspaceRow,
  activeCounterNumber?: number,
) {
  return false;
}

function ActionChip({
  action,
  busy,
  disabled,
  onClick,
}: {
  action: WorkspaceActionDescriptor;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const variant =
    action.tone === "primary"
      ? "default"
      : action.tone === "secondary"
        ? "outline"
        : "ghost";

  return (
    <AppButton size="xs" variant={variant} disabled={disabled || busy} loading={busy} loadingLabel="Memproses..." onClick={onClick}>
      {action.label}
    </AppButton>
  );
}

export function UnitAntreanTableSection({
  title,
  description,
  rows,
  role = "unit-organisasi",
  page,
  nextReadyRowId,
  actionBusyKey,
  permissions,
  readOnly = false,
  compact = false,
  highlightEscalated = false,
  activeCounterNumber,
  validCounterNumbers,
  onAction,
  emptyMessage,
}: {
  title: string;
  description: string;
  rows: UnitWorkspaceRow[];
  role?: InternalRole;
  page: InternalPageKey;
  nextReadyRowId?: string | null;
  actionBusyKey: string | null;
  permissions?: Partial<StaffPermissionSet> | null;
  readOnly?: boolean;
  compact?: boolean;
  highlightEscalated?: boolean;
  activeCounterNumber?: number;
  validCounterNumbers?: number[];
  onAction: (row: UnitWorkspaceRow, action: WorkspaceActionDescriptor) => void;
  emptyMessage: string;
}) {
  const readyOrderMap = React.useMemo(() => buildReadyOrderMap(rows), [rows]);

  return (
    <AppCard padding="lg" className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
          {title}
        </p>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>

      <AppTable className="table-fixed">
        <AppTableHead>
          <tr>
            <AppTableHeaderCell className={cn("w-[14%]", compact ? "px-4 py-3" : undefined)}>
              No. Antrean
            </AppTableHeaderCell>
            <AppTableHeaderCell className={cn("w-[20%]", compact ? "px-4 py-3" : undefined)}>
              Pengunjung
            </AppTableHeaderCell>
            <AppTableHeaderCell className={cn("w-[24%]", compact ? "px-4 py-3" : undefined)}>
              Layanan
            </AppTableHeaderCell>
            <AppTableHeaderCell className={cn("w-[14%]", compact ? "px-4 py-3" : undefined)}>
              Jam
            </AppTableHeaderCell>
            <AppTableHeaderCell className={cn("w-[12%]", compact ? "px-4 py-3" : undefined)}>
              Status
            </AppTableHeaderCell>
            <AppTableHeaderCell className={cn("w-[16%]", compact ? "px-4 py-3" : undefined)}>
              Aksi
            </AppTableHeaderCell>
          </tr>
        </AppTableHead>
        <tbody>
          {rows.length ? (
            rows.map((row) => {
              const displayCounterId =
                role !== "petugas-level-2" &&
                row.isEscalated &&
                typeof row.originCounterId === "number"
                  ? row.originCounterId
                  : getUnitRowCounterId(row);
              const counterDisplayLabel =
                role !== "petugas-level-2" &&
                row.isEscalated &&
                isUnitCompletedRow(row)
                  ? "Riwayat tindak lanjut level 2"
                  : getCounterDisplayLabel(
                      role,
                      row,
                      displayCounterId,
                      validCounterNumbers,
                    );
              const escalationOriginLabel = truncateSupportCopy(
                row.escalationOriginLabel,
                100,
              );
              const escalationReason = truncateSupportCopy(
                row.escalationReason,
                120,
              );
              const staffProcessNote = truncateSupportCopy(
                row.staffProcessNote,
                140,
              );
              const lockedToOtherCounter = isLockedToOtherActiveCounter(
                row,
                activeCounterNumber,
              );
              const actions = readOnly || lockedToOtherCounter
                ? []
                : getWorkspaceRowActions(
                role,
                page,
                row,
                nextReadyRowId,
                permissions,
              );
              const displayStatusLabel = getRowStatusLabel(row, nextReadyRowId);
              const emptyActionLabel = getActionEmptyLabel(row, nextReadyRowId);

              return (
                <AppTableRow
                  key={`${row.source}-${row.appointmentId ?? row.id}`}
                  className={cn(
                    highlightEscalated && row.isEscalated
                      ? "bg-amber-100/70 dark:bg-amber-500/12"
                      : undefined,
                  )}
                >
                  <AppTableCell className={cn("space-y-1", compact ? "px-4 py-3" : undefined)}>
                    <p className="font-semibold text-foreground">
                      {row.displayQueueNumber || row.id}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {getQueueMeta(role, row, nextReadyRowId, readyOrderMap)}
                    </p>
                    {counterDisplayLabel ? (
                      <p className="text-xs font-medium text-role-accent-strong">
                        {counterDisplayLabel}
                      </p>
                    ) : null}
                  </AppTableCell>
                  <AppTableCell className={cn("space-y-1", compact ? "px-4 py-3" : undefined)}>
                    <p className="font-semibold text-foreground">{row.userName || "Pengunjung layanan"}</p>
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {row.complaint?.trim() || row.note}
                    </p>
                  </AppTableCell>
                  <AppTableCell className={cn("space-y-2", compact ? "px-4 py-3" : undefined)}>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{row.title}</p>
                      <p className="text-xs text-muted-foreground">{row.unitId || row.serviceId || "-"}</p>
                      {row.isEscalated && escalationOriginLabel ? (
                        <p className="line-clamp-2 text-xs font-medium text-role-accent-strong">
                          Asal eskalasi: {escalationOriginLabel}
                        </p>
                      ) : null}
                      {row.isEscalated && escalationReason ? (
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {escalationReason}
                        </p>
                      ) : null}
                      {role === "petugas-level-2" && staffProcessNote ? (
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {isUnitCompletedRow(row)
                            ? `Ringkasan level 2: ${staffProcessNote}`
                            : `Catatan level 2: ${staffProcessNote}`}
                        </p>
                      ) : null}
                    </div>
                  </AppTableCell>
                  <AppTableCell className={cn("space-y-1", compact ? "px-4 py-3" : undefined)}>
                    <p className="font-semibold text-foreground">{row.startTime || "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.checkedIn ? "Sudah check-in" : "Belum check-in"}
                    </p>
                  </AppTableCell>
                  <AppTableCell className={compact ? "px-4 py-3" : undefined}>
                    <AppStatusBadge
                      status={resolveWorkspaceStatusTone(displayStatusLabel)}
                      label={displayStatusLabel}
                    />
                  </AppTableCell>
                  <AppTableCell className={compact ? "px-4 py-3" : undefined}>
                    {actions.length ? (
                      <div className="flex flex-wrap gap-2">
                        {actions.map((action) => {
                          const key = `${row.appointmentId ?? row.id}:${action.label}`;
                          return (
                            <ActionChip
                              key={key}
                              action={action}
                              busy={actionBusyKey === key}
                              disabled={!row.appointmentId && row.source === "live"}
                              onClick={() => onAction(row, action)}
                            />
                          );
                        })}
                      </div>
                    ) : lockedToOtherCounter ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        Diproses loket lain
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        {emptyActionLabel}
                      </span>
                    )}
                  </AppTableCell>
                </AppTableRow>
              );
            })
          ) : (
            <AppTableRow>
              <AppTableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                {emptyMessage}
              </AppTableCell>
            </AppTableRow>
          )}
        </tbody>
      </AppTable>
    </AppCard>
  );
}
