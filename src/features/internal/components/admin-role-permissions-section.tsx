"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import { AppButton } from "@/components/ui/app-button";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppCheckbox } from "@/components/ui/app-checkbox";
import { AppNotice } from "@/components/ui/app-notice";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";
import {
  getRolePermissions,
  updateRolePermissions,
} from "@/lib/api/admin-roles";
import {
  getInternalRoleLabel,
  normalizeInternalRolePermissionMatrix,
  serializeInternalRolePermissionMatrix,
  type InternalRolePermissionMatrix,
  type InternalStaffRole,
  type StaffPermissionKey,
} from "@/lib/internal-role-policy";

type PermissionDefinition = {
  key: StaffPermissionKey;
  label: string;
  description: string;
};

const ROLE_ORDER: InternalStaffRole[] = [
  "resepsionis",
  "unit-organisasi",
  "supervisor-monitoring",
  "humas-monitoring",
  "humas-admin",
];

const ADMIN_BYPASS_ROLE: InternalStaffRole = "humas-admin";

const PERMISSION_GROUPS: Array<{
  title: string;
  description: string;
  items: PermissionDefinition[];
}> = [
  {
    title: "Operasional antrean",
    description: "Izin aksi harian untuk frontdesk dan unit.",
    items: [
      {
        key: "canCheckIn",
        label: "Check-in lobby",
        description: "Tampilkan check-in dan walk-in di frontdesk.",
      },
      {
        key: "canCallQueue",
        label: "Panggil antrean",
        description: "Tampilkan aksi panggil antrean di unit.",
      },
      {
        key: "canConfirmAppointment",
        label: "Konfirmasi appointment",
        description: "Tampilkan aksi konfirmasi appointment.",
      },
      {
        key: "canMarkNoShow",
        label: "Tandai tidak hadir",
        description: "Tampilkan aksi tidak hadir.",
      },
      {
        key: "canStartService",
        label: "Mulai / selesaikan layanan",
        description: "Tampilkan aksi mulai dan selesai layanan.",
      },
      {
        key: "canCancelAppointment",
        label: "Batalkan appointment",
        description: "Tampilkan aksi batal appointment.",
      },
      {
        key: "canAddStaffNote",
        label: "Catatan staff",
        description: "Tampilkan catatan petugas saat layanan berjalan.",
      },
    ],
  },
  {
    title: "Visibilitas & monitoring",
    description: "Izin baca untuk dashboard, statistik, dan ekspor.",
    items: [
      {
        key: "canViewDashboard",
        label: "Lihat dashboard",
        description: "Buka dashboard role.",
      },
      {
        key: "canViewOwnUnor",
        label: "Lihat unit sendiri",
        description: "Baca data unit sendiri.",
      },
      {
        key: "canViewAllServices",
        label: "Lihat semua layanan",
        description: "Baca data lintas unit.",
      },
      {
        key: "canViewStatistics",
        label: "Lihat statistik",
        description: "Buka analitik atau statistik.",
      },
      {
        key: "canExportData",
        label: "Ekspor data",
        description: "Tampilkan unduh atau ekspor.",
      },
      {
        key: "canViewAudit",
        label: "Lihat audit",
        description: "Buka log audit.",
      },
      {
        key: "canViewSystemHealth",
        label: "Lihat kesehatan sistem",
        description: "Buka status kesehatan sistem.",
      },
    ],
  },
  {
    title: "Administrasi sistem",
    description: "Izin kelola layanan, petugas, dan konfigurasi.",
    items: [
      {
        key: "canManageServices",
        label: "Kelola layanan",
        description: "Kelola layanan.",
      },
      {
        key: "canManageStaff",
        label: "Kelola staff",
        description: "Kelola petugas.",
      },
      {
        key: "canManageAnnouncements",
        label: "Kelola pengumuman",
        description: "Kelola pengumuman publik.",
      },
      {
        key: "canManageOperatingSettings",
        label: "Kelola pengaturan operasional",
        description: "Kelola jam dan hari operasional.",
      },
      {
        key: "canRunSystemMaintenance",
        label: "Jalankan maintenance",
        description: "Jalankan maintenance sistem.",
      },
      {
        key: "canManageUnorConfig",
        label: "Kelola konfigurasi unit",
        description: "Kelola konfigurasi unit.",
      },
      {
        key: "canManageRolePermissions",
        label: "Kelola hak akses role",
        description: "Kelola hak akses role.",
      },
    ],
  },
];

const PERMISSION_DEFINITIONS = PERMISSION_GROUPS.flatMap((group) => group.items);

function countEnabledPermissions(matrix: InternalRolePermissionMatrix) {
  return ROLE_ORDER.filter((role) => role !== ADMIN_BYPASS_ROLE).reduce(
    (total, role) =>
      total +
      Object.values(matrix[role]).filter(Boolean).length,
    0,
  );
}

function countDraftChanges(
  left: InternalRolePermissionMatrix,
  right: InternalRolePermissionMatrix,
) {
  let total = 0;

  for (const role of ROLE_ORDER) {
    for (const permissionKey of Object.keys(left[role]) as StaffPermissionKey[]) {
      if (left[role][permissionKey] !== right[role][permissionKey]) {
        total += 1;
      }
    }
  }

  return total;
}

function countLockedPermissions(role: InternalStaffRole) {
  return PERMISSION_DEFINITIONS.filter((permission) =>
    isPermissionLocked(role, permission.key),
  ).length;
}

function isPermissionLocked(role: InternalStaffRole, permission: StaffPermissionKey) {
  void permission;
  return role === ADMIN_BYPASS_ROLE;
}

function getPermissionLockReason(role: InternalStaffRole, permission: StaffPermissionKey) {
  void permission;
  if (role === ADMIN_BYPASS_ROLE) {
    return "Backend memperlakukan Humas Admin sebagai bypass penuh, jadi matrix ini tidak menjadi sumber enforcement final.";
  }

  return null;
}

function PermissionMatrixGroupTable({
  group,
  matrix,
  editable,
  saving,
  onToggle,
}: {
  group: (typeof PERMISSION_GROUPS)[number];
  matrix: InternalRolePermissionMatrix;
  editable: boolean;
  saving: boolean;
  onToggle: (
    role: InternalStaffRole,
    permission: StaffPermissionKey,
    checked: boolean,
  ) => void;
}) {
  const roleColumnStats = ROLE_ORDER.map((role) => {
    const activeCount = group.items.filter((permission) => matrix[role][permission.key]).length;
    const lockedCount = group.items.filter((permission) =>
      isPermissionLocked(role, permission.key),
    ).length;

    return {
      role,
      label: getInternalRoleLabel(role),
      activeCount,
      lockedCount,
    };
  });

  return (
    <AppCard padding="lg" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Kategori akses
          </p>
          <AppCardTitle className="text-xl">{group.title}</AppCardTitle>
          <AppCardDescription>{group.description}</AppCardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-muted-foreground">
            {group.items.length} izin
          </span>
          <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-muted-foreground">
            {ROLE_ORDER.length} role
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <AppTable className="min-w-[860px]">
          <AppTableHead>
            <AppTableRow className="hover:bg-transparent">
              <AppTableHeaderCell className="sticky left-0 z-20 w-[36%] bg-surface-container-lowest normal-case tracking-normal text-foreground">
                Izin
              </AppTableHeaderCell>
              {roleColumnStats.map(({ role, label }) => (
                <AppTableHeaderCell
                  key={role}
                  className="min-w-[145px] text-center normal-case tracking-normal text-foreground"
                >
                  <p className="text-sm font-semibold tracking-tight">{label}</p>
                </AppTableHeaderCell>
              ))}
            </AppTableRow>
          </AppTableHead>

          <tbody>
            {group.items.map((permission) => (
              <AppTableRow key={permission.key}>
                <AppTableCell className="sticky left-0 z-10 bg-surface-container-lowest">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{permission.label}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{permission.description}</p>
                  </div>
                </AppTableCell>

                {ROLE_ORDER.map((role) => {
                  const checked = matrix[role][permission.key];
                  const locked = isPermissionLocked(role, permission.key);
                  const lockReason = getPermissionLockReason(role, permission.key);

                  return (
                    <AppTableCell key={role} className="text-center align-middle">
                      <div className="flex items-center justify-center">
                        <AppCheckbox
                          checked={checked}
                          disabled={saving || !editable || locked}
                          onChange={(event) =>
                            onToggle(role, permission.key, event.target.checked)
                          }
                          aria-label={`${permission.label} untuk ${getInternalRoleLabel(role)}`}
                          title={lockReason ?? undefined}
                          className="mt-0"
                        />
                      </div>
                    </AppTableCell>
                  );
                })}
              </AppTableRow>
            ))}
          </tbody>
        </AppTable>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        <span>Sel terkunci mengikuti policy role dan tidak bisa diubah.</span>
      </div>
    </AppCard>
  );
}

export function AdminRolePermissionsSection() {
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const sessionQuery = useAuthSessionQuery();
  const session = sessionQuery.data?.session;
  const isHumasAdminSession =
    session?.variant === "staff" && session.role === "humas-admin";
  const canPersistChanges =
    isHumasAdminSession &&
    session?.authMode === "live" &&
    Boolean(session.staffId);

  const rolePermissionsQuery = useQuery({
    queryKey: ["admin-role-permissions", session?.staffId ?? "anonymous"],
    queryFn: () => getRolePermissions(),
    enabled: hydrated && isHumasAdminSession && Boolean(session?.staffId),
    staleTime: 60_000,
  });

  const serverMatrix = React.useMemo(
    () =>
      normalizeInternalRolePermissionMatrix(
        rolePermissionsQuery.data?.settings &&
          typeof rolePermissionsQuery.data.settings === "object" &&
          rolePermissionsQuery.data.settings !== null &&
          "rolePermissions" in rolePermissionsQuery.data.settings
          ? rolePermissionsQuery.data.settings.rolePermissions
          : undefined,
      ),
    [rolePermissionsQuery.data],
  );
  const hasLoadedServerMatrix = Boolean(
    rolePermissionsQuery.data &&
      rolePermissionsQuery.data.settings &&
      typeof rolePermissionsQuery.data.settings === "object" &&
      "rolePermissions" in rolePermissionsQuery.data.settings,
  );
  const serializedServerMatrix = React.useMemo(
    () => JSON.stringify(serverMatrix),
    [serverMatrix],
  );
  const [draftMatrix, setDraftMatrix] =
    React.useState<InternalRolePermissionMatrix | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const currentMatrix = draftMatrix ?? serverMatrix;
  const isDirty =
    JSON.stringify(currentMatrix) !== serializedServerMatrix;

  React.useEffect(() => {
    if (!hasLoadedServerMatrix) {
      return;
    }

    if (draftMatrix === null || !isDirty) {
      setDraftMatrix(serverMatrix);
    }
  }, [draftMatrix, hasLoadedServerMatrix, isDirty, serverMatrix]);

  const enabledPermissionCount = React.useMemo(
    () => countEnabledPermissions(currentMatrix),
    [currentMatrix],
  );
  const changedCellCount = React.useMemo(
    () => countDraftChanges(currentMatrix, serverMatrix),
    [currentMatrix, serverMatrix],
  );
  const lockedCellCount = React.useMemo(
    () =>
      ROLE_ORDER.reduce((total, role) => total + countLockedPermissions(role), 0),
    [],
  );

  const saveMutation = useMutation({
    mutationFn: async (matrix: InternalRolePermissionMatrix) => {
      if (!session?.staffId) {
        throw new Error("Masuk sebagai Humas Admin live terlebih dahulu.");
      }

      return updateRolePermissions(serializeInternalRolePermissionMatrix(matrix));
    },
    onSuccess: async (response) => {
      queryClient.setQueryData(
        ["admin-role-permissions", session?.staffId ?? "anonymous"],
        response,
      );

      const nextServerMatrix = normalizeInternalRolePermissionMatrix(
        response.settings &&
          typeof response.settings === "object" &&
          response.settings !== null &&
          "rolePermissions" in response.settings
          ? response.settings.rolePermissions
          : undefined,
      );

      setDraftMatrix(nextServerMatrix);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-role-permissions", session?.staffId ?? "anonymous"],
        }),
        queryClient.invalidateQueries({ queryKey: ["runtime-role-permissions"] }),
      ]);
      toast.success("Hak akses role berhasil disimpan.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menyimpan hak akses role.";
      toast.error(message);
    },
  });

  function handleToggle(
    role: InternalStaffRole,
    permission: StaffPermissionKey,
    checked: boolean,
  ) {
    setDraftMatrix((currentValue) => {
      const base = currentValue ?? serverMatrix;
      return {
        ...base,
        [role]: {
          ...base[role],
          [permission]: checked,
        },
      };
    });
  }

  function handleReset() {
    setDraftMatrix(serverMatrix);
    toast.success("Draft hak akses dikembalikan ke data terakhir.");
  }

  async function handleSave() {
    if (!canPersistChanges) {
      toast.error("Masuk sebagai Humas Admin live untuk menyimpan perubahan.");
      return;
    }

    await saveMutation.mutateAsync(currentMatrix);
  }

  if (!hydrated) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {["Role yang bisa diatur", "Izin aktif", "Sel terkunci", "Perubahan draft"].map(
          (label) => (
            <AppStatCard
              key={label}
              label={label}
              value="..."
              description="Menyiapkan hak akses role"
            />
          ),
        )}
      </div>
    );
  }

  if (!isHumasAdminSession) {
    return (
      <AppCard tone="soft" padding="lg" className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Akses dibatasi</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Buka sebagai Humas Admin untuk mengubah hak akses.
        </p>
      </AppCard>
    );
  }

  if (rolePermissionsQuery.isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          "Role bisa diatur",
          "Izin aktif",
          "Sel terkunci",
          "Perubahan draft",
        ].map((label) => (
          <AppStatCard
            key={label}
            label={label}
            value="..."
            description="Memuat data hak akses"
          />
        ))}
      </div>
    );
  }

  if (rolePermissionsQuery.isError || !hasLoadedServerMatrix) {
    const errorMessage =
      rolePermissionsQuery.error instanceof Error
        ? rolePermissionsQuery.error.message
        : "Data hak akses live belum berhasil dimuat.";

    return (
      <AppNotice
        icon={RefreshCw}
        title="Hak akses live belum termuat"
        description={`${errorMessage} Segarkan halaman atau login ulang sebagai Humas Admin live sebelum mengubah matrix akses.`}
        tone="warning"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          label="Role yang bisa diatur"
          value={String(ROLE_ORDER.filter((role) => role !== ADMIN_BYPASS_ROLE).length)}
          description="Role yang hak aksesnya bisa diatur dari panel ini."
        />
        <AppStatCard
          label="Izin aktif"
          value={String(enabledPermissionCount)}
          description="Total izin aktif lintas role non-bypass."
          tone="success"
        />
        <AppStatCard
          label="Sel Terkunci"
          value={String(lockedCellCount)}
          description="Izin yang dipaksa policy dan tidak bisa diubah."
          tone="warning"
        />
        <AppStatCard
          label="Perubahan Draft"
          value={String(changedCellCount)}
          description="Selisih draft lokal terhadap data tersimpan."
          tone={changedCellCount > 0 ? "info" : "success"}
        />
      </div>

      <AppCard tone="soft" padding="md" className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Editor hak akses
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Perubahan langsung memengaruhi halaman, tombol, dan aksi di role terkait.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AppButton
            variant="outline"
            onClick={() => setResetConfirmOpen(true)}
            disabled={!isDirty || saveMutation.isPending}
          >
            <RefreshCw className="size-4" />
            Kembalikan Draft
          </AppButton>
          <AppButton
            onClick={handleSave}
            loading={saveMutation.isPending}
            loadingLabel="Menyimpan..."
            disabled={!isDirty || !canPersistChanges}
          >
            <Save className="size-4" />
            Simpan Hak Akses
          </AppButton>
        </div>
      </AppCard>

      <div className="space-y-6">
        {PERMISSION_GROUPS.map((group) => (
          <PermissionMatrixGroupTable
            key={group.title}
            group={group}
            matrix={currentMatrix}
            editable={canPersistChanges}
            saving={saveMutation.isPending}
            onToggle={handleToggle}
          />
        ))}
      </div>

      <AppConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Kembalikan hak akses?"
        description="Perubahan yang belum disimpan akan dibuang dan hak akses kembali ke data terakhir."
        confirmLabel="Kembalikan Draft"
        confirmVariant="default"
        onConfirm={async () => {
          setResetConfirmOpen(false);
          handleReset();
        }}
      />
    </div>
  );
}
