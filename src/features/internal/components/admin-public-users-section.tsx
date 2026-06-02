"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppActionBar } from "@/components/ui/app-action-bar";
import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import { AppPasswordInput } from "@/components/ui/app-password-input";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppSelect } from "@/components/ui/app-select";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";
import { PASSWORD_POLICY_HINT } from "@/lib/password-policy";
import {
  USER_ASAL_INSTANSI_OPTIONS,
  USER_REGION_OPTIONS,
} from "@/lib/mock-user-profile";
import {
  type AdminPublicUserRecord,
  createAdminPublicUser,
  deleteAdminPublicUser,
  updateAdminPublicUser,
} from "@/lib/api/admin-public-users";
import {
  AdminEditorSection,
  AdminFormField,
} from "@/features/internal/components/admin-editor-section";
import { useAdminPublicUsersQuery } from "@/features/internal/use-admin-public-users-query";

type AdminPublicUsersChrome = {
  actionEyebrow?: string;
  actionDescription?: string;
  actionPills?: string[];
};

type StatusFilter = "all" | "ready" | "verification" | "incomplete";

type DialogState =
  | {
      mode: "create";
      user: null;
    }
  | {
      mode: "edit";
      user: AdminPublicUserRecord;
    }
  | null;

type UserDraft = {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  asalInstansi: string;
  namaInstansi: string;
  nik: string;
  provinsi: string;
  kabupatenKota: string;
};

function createEmptyDraft(): UserDraft {
  return {
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirmation: "",
    asalInstansi: "",
    namaInstansi: "",
    nik: "",
    provinsi: "",
    kabupatenKota: "",
  };
}

function createDraftFromUser(user: AdminPublicUserRecord): UserDraft {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    password: "",
    passwordConfirmation: "",
    asalInstansi: user.asalInstansi,
    namaInstansi: user.namaInstansi,
    nik: user.nik,
    provinsi: user.provinsi,
    kabupatenKota: user.kabupatenKota,
  };
}

function resolveReadinessBadge(user: AdminPublicUserRecord) {
  if (user.readyForLogin) {
    return {
      tone: "aktif" as const,
      label: "Siap login",
      description: "Akun sudah siap dipakai masuk ke portal.",
    };
  }

  if (user.emailVerified) {
    return {
      tone: "warning" as const,
      label: "Perlu sinkron auth",
      description: "Email sudah valid, tetapi koneksi auth belum lengkap.",
    };
  }

  return {
    tone: "danger" as const,
    label: "Belum verifikasi",
    description: "Perlu tindak lanjut sebelum akun dianggap siap.",
  };
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function sortUsers(items: AdminPublicUserRecord[]) {
  return [...items].sort((left, right) => {
    if (left.readyForLogin !== right.readyForLogin) {
      return Number(right.readyForLogin) - Number(left.readyForLogin);
    }

    if (left.profileComplete !== right.profileComplete) {
      return Number(right.profileComplete) - Number(left.profileComplete);
    }

    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return left.name.localeCompare(right.name);
  });
}

async function invalidateAdminPublicUserQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["admin-public-users"] });
}

export function AdminPublicUsersSection({
  chrome,
}: {
  chrome?: AdminPublicUsersChrome;
}) {
  const queryClient = useQueryClient();
  const publicUsersQuery = useAdminPublicUsersQuery();
  const items = React.useMemo(
    () => sortUsers(publicUsersQuery.data?.items ?? []),
    [publicUsersQuery.data?.items],
  );
  const [searchValue, setSearchValue] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [dialogState, setDialogState] = React.useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminPublicUserRecord | null>(null);
  const [draft, setDraft] = React.useState<UserDraft>(createEmptyDraft);

  const provinceOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      Object.keys(USER_REGION_OPTIONS).map((option) => ({
        value: option,
        label: option,
      })),
    [],
  );

  const cityOptions = React.useMemo<AppSearchSelectOption[]>(
    () =>
      (draft.provinsi ? USER_REGION_OPTIONS[draft.provinsi] ?? [] : []).map((option) => ({
        value: option,
        label: option,
        keywords: [draft.provinsi],
      })),
    [draft.provinsi],
  );

  const stats = React.useMemo(() => {
    const total = items.length;
    const ready = items.filter((item) => item.readyForLogin).length;
    const complete = items.filter((item) => item.profileComplete).length;
    const needsAttention = items.filter(
      (item) => !item.readyForLogin || !item.profileComplete,
    ).length;

    return {
      total,
      ready,
      complete,
      needsAttention,
    };
  }, [items]);

  const filteredItems = React.useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchValue);

    return items.filter((item) => {
      if (statusFilter === "ready" && !item.readyForLogin) {
        return false;
      }

      if (statusFilter === "verification" && item.emailVerified) {
        return false;
      }

      if (statusFilter === "incomplete" && item.profileComplete) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        item.id,
        item.name,
        item.email,
        item.phone,
        item.asalInstansi,
        item.namaInstansi,
        item.nik,
        item.provinsi,
        item.kabupatenKota,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [items, searchValue, statusFilter]);

  const createMutation = useMutation({
    mutationFn: createAdminPublicUser,
    onSuccess: async () => {
      await invalidateAdminPublicUserQueries(queryClient);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: Parameters<typeof updateAdminPublicUser>[1] }) =>
      updateAdminPublicUser(userId, payload),
    onSuccess: async () => {
      await invalidateAdminPublicUserQueries(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminPublicUser(userId),
    onSuccess: async () => {
      await invalidateAdminPublicUserQueries(queryClient);
    },
  });

  const isSaving =
    createMutation.isPending || updateMutation.isPending;

  function openCreateDialog() {
    setDialogState({ mode: "create", user: null });
    setDraft(createEmptyDraft());
  }

  function openEditDialog(user: AdminPublicUserRecord) {
    setDialogState({ mode: "edit", user });
    setDraft(createDraftFromUser(user));
  }

  function closeDialog() {
    if (isSaving) {
      return;
    }

    setDialogState(null);
    setDraft(createEmptyDraft());
  }

  function updateDraftField<Key extends keyof UserDraft>(key: Key, value: UserDraft[Key]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave() {
    const payload = {
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      password: draft.password.trim(),
      asalInstansi: draft.asalInstansi.trim(),
      namaInstansi: draft.namaInstansi.trim(),
      nik: draft.nik.replace(/\D/g, "").slice(0, 16),
      provinsi: draft.provinsi.trim(),
      kabupatenKota: draft.kabupatenKota.trim(),
    };

    if (!payload.name) {
      toast.error("Nama pengguna wajib diisi.");
      return;
    }
    if (!payload.email) {
      toast.error("Email pengguna wajib diisi.");
      return;
    }
    if (!payload.phone) {
      toast.error("Nomor WhatsApp wajib diisi.");
      return;
    }

    if (dialogState?.mode === "create" && !payload.password) {
      toast.error("Password awal wajib diisi untuk akun baru.");
      return;
    }

    if (draft.password || draft.passwordConfirmation) {
      if (draft.password !== draft.passwordConfirmation) {
        toast.error("Konfirmasi password belum sama.");
        return;
      }
    }

    try {
      if (dialogState?.mode === "edit" && dialogState.user) {
        await updateMutation.mutateAsync({
          userId: dialogState.user.id,
          payload,
        });
        toast.success("Akun pengguna umum berhasil diperbarui.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Akun pengguna umum berhasil ditambahkan.");
      }

      closeDialog();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Akun pengguna umum belum berhasil disimpan.",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Akun pengguna umum berhasil dihapus.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Akun pengguna umum belum berhasil dihapus.",
      );
    }
  }

  const content = (
    <div className="space-y-6">
      <AppNotice
        icon={Users}
        title={chrome?.actionEyebrow || "Pengguna portal"}
        description={
          chrome?.actionDescription ||
          "Menu ini memantau akun pengguna yang terdaftar di portal, dengan penekanan pada kesiapan login dan kelengkapan profil."
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          label="Total Pengguna"
          value={stats.total}
          description="Seluruh akun pengguna umum yang masih tercatat."
          tone="role"
          icon={Users}
        />
        <AppStatCard
          label="Siap Login"
          value={stats.ready}
          description="Akun yang sudah siap dipakai masuk ke portal."
          tone="success"
          icon={ShieldCheck}
        />
        <AppStatCard
          label="Profil Lengkap"
          value={stats.complete}
          description="Data utama pengguna sudah terisi lengkap."
          tone="info"
          icon={UserRound}
        />
        <AppStatCard
          label="Perlu Tindak"
          value={stats.needsAttention}
          description="Masih perlu perapihan akun atau data profil."
          tone="warning"
          icon={AlertCircle}
        />
      </div>

      <AppActionBar>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Direktori Pengguna
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Pantau dan kendalikan akun publik
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Cari akun berdasarkan nama, email, WhatsApp, instansi, atau NIK lalu lakukan pembaruan seperlunya.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AppButton variant="outline" onClick={() => void publicUsersQuery.refetch()}>
            <RefreshCw className="size-4" />
            Muat Ulang
          </AppButton>
          <AppButton onClick={openCreateDialog}>
            <Plus className="size-4" />
            Tambah Pengguna
          </AppButton>
        </div>
      </AppActionBar>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <AppCard padding="md" className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Pencarian
          </p>
          <AppInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Cari nama, email, WhatsApp, NIK, instansi, atau wilayah"
          />
        </AppCard>

        <AppCard padding="md" className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Filter
          </p>
          <AppSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Semua akun</option>
            <option value="ready">Siap login</option>
            <option value="verification">Belum verifikasi</option>
            <option value="incomplete">Profil belum lengkap</option>
          </AppSelect>
        </AppCard>
      </div>

      <AdminEditorSection
        eyebrow="Tabel Pengguna"
        title="Daftar pengguna umum"
        description="Gunakan daftar ini untuk memantau kualitas data akun publik dan melakukan pembaruan secara langsung."
      >
        {publicUsersQuery.isLoading ? (
          <AppCard tone="soft" padding="md" className="text-sm leading-6 text-muted-foreground">
            Memuat data pengguna umum.
          </AppCard>
        ) : publicUsersQuery.isError ? (
          <AppNotice
            icon={AlertCircle}
            tone="danger"
            title="Data pengguna umum belum bisa dimuat"
            description={
              publicUsersQuery.error instanceof Error
                ? publicUsersQuery.error.message
                : "Terjadi kendala saat membaca data pengguna umum."
            }
          />
        ) : (
          <AppTable className="w-full table-fixed">
            <AppTableHead>
              <tr>
                <AppTableHeaderCell className="w-[22%]">Pengguna</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[20%]">Kontak</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[16%]">Kesiapan Akun</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[14%]">Profil</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[18%]">Terdaftar</AppTableHeaderCell>
                <AppTableHeaderCell className="w-[10%]">Aksi</AppTableHeaderCell>
              </tr>
            </AppTableHead>
            <tbody>
              {filteredItems.length ? (
                filteredItems.map((item) => {
                  const readiness = resolveReadinessBadge(item);
                  return (
                    <AppTableRow key={item.id}>
                      <AppTableCell className="space-y-1">
                        <p className="font-semibold text-foreground">{item.name || "Tanpa nama"}</p>
                        <p className="text-xs text-muted-foreground">{item.id}</p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {item.namaInstansi || item.asalInstansi || "Instansi belum diisi"}
                        </p>
                      </AppTableCell>
                      <AppTableCell className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{item.email || "-"}</p>
                        <p className="text-sm text-muted-foreground">{item.phone || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.nik ? `NIK ${item.nik}` : "NIK belum diisi"}
                        </p>
                      </AppTableCell>
                      <AppTableCell className="space-y-2">
                        <AppStatusBadge status={readiness.tone} label={readiness.label} />
                        <p className="text-xs leading-5 text-muted-foreground">{readiness.description}</p>
                      </AppTableCell>
                      <AppTableCell className="space-y-2">
                        <AppStatusBadge
                          status={item.profileComplete ? "selesai" : "warning"}
                          label={item.profileComplete ? "Lengkap" : "Belum lengkap"}
                        />
                        <p className="text-xs leading-5 text-muted-foreground">
                          {item.provinsi || item.kabupatenKota
                            ? `${item.provinsi || "-"} · ${item.kabupatenKota || "-"}`
                            : "Wilayah belum diisi"}
                        </p>
                      </AppTableCell>
                      <AppTableCell className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {formatDateLabel(item.createdAt)}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {item.asalInstansi || "Kategori instansi belum diisi"}
                        </p>
                      </AppTableCell>
                      <AppTableCell>
                        <div className="flex flex-col items-start gap-2">
                          <AppButton
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                          >
                            <PencilLine className="size-4" />
                            Ubah
                          </AppButton>
                          <AppButton
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="size-4" />
                            Hapus
                          </AppButton>
                        </div>
                      </AppTableCell>
                    </AppTableRow>
                  );
                })
              ) : (
                <AppTableRow>
                  <AppTableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Belum ada data pengguna yang cocok dengan filter saat ini.
                  </AppTableCell>
                </AppTableRow>
              )}
            </tbody>
          </AppTable>
        )}
      </AdminEditorSection>
    </div>
  );

  return (
    <>
      {content}

      <AppDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
        title={dialogState?.mode === "edit" ? "Perbarui pengguna umum" : "Tambah pengguna umum"}
        description={
          dialogState?.mode === "edit"
            ? "Perbarui data akun pengguna umum tanpa menyentuh flow dashboard publik yang lain."
            : "Buat akun pengguna umum baru agar siap dipantau dan dikelola dari panel admin."
        }
        className="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AdminEditorSection
              eyebrow="Identitas Akun"
              title="Data utama pengguna"
              description="Data ini dipakai untuk identitas akun dan pencarian cepat di panel admin."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField label="Nama lengkap">
                  <AppInput
                    value={draft.name}
                    onChange={(event) => updateDraftField("name", event.target.value)}
                    placeholder="Nama lengkap pengguna"
                  />
                </AdminFormField>
                <AdminFormField label="Email">
                  <AppInput
                    value={draft.email}
                    onChange={(event) => updateDraftField("email", event.target.value)}
                    placeholder="email@contoh.go.id"
                  />
                </AdminFormField>
                <AdminFormField label="Nomor WhatsApp">
                  <AppInput
                    value={draft.phone}
                    onChange={(event) => updateDraftField("phone", event.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </AdminFormField>
                <AdminFormField label="NIK" description="Opsional, tetapi akan memengaruhi status profil lengkap.">
                  <AppInput
                    inputMode="numeric"
                    value={draft.nik}
                    onChange={(event) =>
                      updateDraftField("nik", event.target.value.replace(/\D/g, "").slice(0, 16))
                    }
                    placeholder="16 digit NIK"
                  />
                </AdminFormField>
              </div>
            </AdminEditorSection>

            <AdminEditorSection
              eyebrow="Akses Login"
              title="Password dan kesiapan akun"
              description="Untuk akun baru, password awal wajib diisi. Saat edit, kosongkan bila tidak diubah."
            >
              <div className="space-y-4">
                <AdminFormField
                  label="Password"
                  description={
                    dialogState?.mode === "edit"
                      ? `Opsional. ${PASSWORD_POLICY_HINT}`
                      : PASSWORD_POLICY_HINT
                  }
                >
                  <AppPasswordInput
                    value={draft.password}
                    onChange={(event) => updateDraftField("password", event.target.value)}
                    placeholder={
                      dialogState?.mode === "edit"
                        ? "Isi hanya jika ingin mengganti password"
                        : "Password awal pengguna"
                    }
                  />
                </AdminFormField>
                <AdminFormField label="Konfirmasi password">
                  <AppPasswordInput
                    value={draft.passwordConfirmation}
                    onChange={(event) =>
                      updateDraftField("passwordConfirmation", event.target.value)
                    }
                    placeholder="Ulangi password"
                  />
                </AdminFormField>
                <AppNotice
                  icon={ShieldCheck}
                  title="Kesiapan akun dibaca dari status login"
                  description="Akun yang siap login akan tampil sebagai siap pakai di daftar, sedangkan akun yang belum sinkron atau belum verifikasi akan ditandai perlu tindak lanjut."
                />
              </div>
            </AdminEditorSection>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AdminEditorSection
              eyebrow="Instansi"
              title="Latar belakang pengguna"
              description="Isian ini membantu humas admin membaca konteks akun publik dan kelengkapan profil."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField label="Kategori instansi">
                  <AppSelect
                    value={draft.asalInstansi}
                    onChange={(event) => updateDraftField("asalInstansi", event.target.value)}
                  >
                    <option value="">Pilih kategori instansi</option>
                    {USER_ASAL_INSTANSI_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </AppSelect>
                </AdminFormField>
                <AdminFormField label="Nama instansi">
                  <AppInput
                    value={draft.namaInstansi}
                    onChange={(event) => updateDraftField("namaInstansi", event.target.value)}
                    placeholder="Nama instansi"
                  />
                </AdminFormField>
              </div>
            </AdminEditorSection>

            <AdminEditorSection
              eyebrow="Wilayah"
              title="Provinsi dan kabupaten/kota"
              description="Lokasi membantu pembacaan profil dan segmentasi pengguna umum."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField label="Provinsi">
                  <AppSearchSelect
                    value={draft.provinsi}
                    onValueChange={(nextValue) => {
                      updateDraftField("provinsi", nextValue);
                      updateDraftField("kabupatenKota", "");
                    }}
                    options={provinceOptions}
                    placeholder="Pilih provinsi"
                    searchPlaceholder="Cari provinsi"
                    emptyMessage="Provinsi tidak ditemukan."
                  />
                </AdminFormField>
                <AdminFormField label="Kabupaten/Kota">
                  <AppSearchSelect
                    value={draft.kabupatenKota}
                    onValueChange={(nextValue) => updateDraftField("kabupatenKota", nextValue)}
                    options={cityOptions}
                    placeholder={draft.provinsi ? "Pilih kabupaten/kota" : "Pilih provinsi dulu"}
                    searchPlaceholder="Cari kabupaten/kota"
                    emptyMessage="Kabupaten/kota tidak ditemukan."
                    disabled={!draft.provinsi}
                  />
                </AdminFormField>
              </div>
            </AdminEditorSection>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <AppButton variant="outline" onClick={closeDialog} disabled={isSaving}>
              Batal
            </AppButton>
            <AppButton
              onClick={() => void handleSave()}
              loading={isSaving}
              loadingLabel={dialogState?.mode === "edit" ? "Menyimpan perubahan" : "Menyimpan akun"}
            >
              {dialogState?.mode === "edit" ? "Simpan Perubahan" : "Simpan Pengguna"}
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Hapus akun pengguna umum?"
        description="Akun yang dihapus akan keluar dari daftar admin dan akses login pengguna tersebut ikut dicabut."
        confirmLabel="Hapus Akun"
        confirmVariant="outline"
        loading={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
      >
        <AppNotice
          icon={AlertCircle}
          tone="warning"
          title={deleteTarget?.name || "Pengguna umum"}
          description={`Email ${deleteTarget?.email || "-"} dan data akun terkait akan dihapus dari sistem.`}
        />
      </AppConfirmDialog>
    </>
  );
}
