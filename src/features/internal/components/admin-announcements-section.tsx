"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import { AppButton } from "@/components/ui/app-button";
import { AppCheckbox } from "@/components/ui/app-checkbox";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import {
  AppCard,
  AppCardDescription,
  AppCardTitle,
} from "@/components/ui/app-card";
import { AppFilterBar } from "@/components/ui/app-filter-bar";
import { AppFilterTrigger } from "@/components/ui/app-filter-trigger";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import {
  AppTable,
  AppTableCell,
  AppTableHead,
  AppTableHeaderCell,
  AppTableRow,
} from "@/components/ui/app-table";
import { AppTextarea } from "@/components/ui/app-textarea";
import {
  AdminEditorSection,
  AdminFormField,
} from "@/features/internal/components/admin-editor-section";
import {
  AnnouncementTickerStrip,
  type AnnouncementTickerItem,
} from "@/components/composite/announcement-ticker-strip";
import { landingAnnouncement } from "@/content/portal-content";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "@/lib/api/admin-announcements";

type AnnouncementTone = "info" | "warning" | "event";
type AnnouncementStatusFilter = "all" | "live" | "scheduled" | "attention" | "archived";
type AnnouncementToneFilter = "all" | AnnouncementTone;

type AdminAnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  type: AnnouncementTone;
  active: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  source: "live" | "fallback";
};

type AdminAnnouncementDraft = {
  title: string;
  message: string;
  type: AnnouncementTone;
  active: boolean;
  startDate: string;
  endDate: string;
};

type AnnouncementFieldErrors = {
  title?: string;
  message?: string;
  endDate?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getJakartaTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeAnnouncementType(value: unknown): AnnouncementTone {
  return value === "warning" || value === "event" ? value : "info";
}

function normalizeAnnouncementRecord(
  rawAnnouncement: unknown,
  source: "live" | "fallback",
): AdminAnnouncementRecord | null {
  if (!isRecord(rawAnnouncement)) {
    return null;
  }

  const id = asString(rawAnnouncement.id).trim();
  const title = asString(rawAnnouncement.title).trim();
  const message = asString(rawAnnouncement.message).trim();
  if (!id || (!title && !message)) {
    return null;
  }

  return {
    id,
    title: title || "Tanpa judul",
    message,
    type: normalizeAnnouncementType(rawAnnouncement.type),
    active: rawAnnouncement.active !== false,
    startDate: asString(rawAnnouncement.startDate).trim(),
    endDate: asString(rawAnnouncement.endDate).trim(),
    createdAt: asString(rawAnnouncement.createdAt).trim(),
    source,
  };
}

function normalizeAnnouncements(payload: unknown) {
  const root = isRecord(payload) ? payload : {};
  const records = Array.isArray(root.announcements) ? root.announcements : [];

  return records
    .map((record) => normalizeAnnouncementRecord(record, "live"))
    .filter((record): record is AdminAnnouncementRecord => record !== null)
    .sort((left, right) => {
      const leftDate = left.createdAt || left.startDate || "";
      const rightDate = right.createdAt || right.startDate || "";
      return rightDate.localeCompare(leftDate);
    });
}

function buildFallbackAnnouncements() {
  return [
    {
      id: "fallback-announcement-1",
      title: "Pengumuman layanan publik",
      message: landingAnnouncement,
      type: "info",
      active: true,
      startDate: "",
      endDate: "",
      createdAt: "",
      source: "fallback",
    } satisfies AdminAnnouncementRecord,
    {
      id: "fallback-announcement-2",
      title: "Pemeliharaan sistem akhir pekan",
      message: "Perubahan jadwal layanan digital diumumkan H-1 agar warga sempat menyesuaikan kunjungan.",
      type: "warning",
      active: false,
      startDate: "",
      endDate: "",
      createdAt: "",
      source: "fallback",
    } satisfies AdminAnnouncementRecord,
  ];
}

function buildAnnouncementDraft(
  announcement: AdminAnnouncementRecord | null,
): AdminAnnouncementDraft {
  return {
    title: announcement?.title ?? "",
    message: announcement?.message ?? "",
    type: announcement?.type ?? "info",
    active: announcement?.active ?? true,
    startDate: announcement?.startDate ?? "",
    endDate: announcement?.endDate ?? "",
  };
}

function validateAnnouncementDraft(
  draft: AdminAnnouncementDraft,
): AnnouncementFieldErrors {
  const errors: AnnouncementFieldErrors = {};

  if (!draft.title.trim()) {
    errors.title = "Judul pengumuman wajib diisi.";
  }

  if (!draft.message.trim()) {
    errors.message = "Pesan pengumuman wajib diisi.";
  }

  if (
    draft.startDate &&
    draft.endDate &&
    draft.endDate.localeCompare(draft.startDate) < 0
  ) {
    errors.endDate = "Tanggal akhir harus sama atau setelah tanggal mulai.";
  }

  return errors;
}

function getAnnouncementLifecycleStatus(announcement: AdminAnnouncementRecord) {
  const today = getJakartaTodayKey();

  if (!announcement.active) {
    return {
      tone: "selesai" as const,
      label: "Arsip",
      note: "Tidak tampil ke publik",
    };
  }

  if (announcement.startDate && today < announcement.startDate) {
    return {
      tone: "diproses" as const,
      label: "Terjadwal",
      note: `Mulai ${announcement.startDate}`,
    };
  }

  if (announcement.endDate && today > announcement.endDate) {
    return {
      tone: "warning" as const,
      label: "Lewat jadwal",
      note: `Berakhir ${announcement.endDate}`,
    };
  }

  return {
    tone: "aktif" as const,
    label: "Tayang",
    note: announcement.endDate ? `Sampai ${announcement.endDate}` : "Tanpa akhir tayang",
  };
}

function getToneLabel(type: AnnouncementTone) {
  if (type === "warning") return "Peringatan";
  if (type === "event") return "Agenda";
  return "Info";
}

function getAnnouncementStatusFilterLabel(filter: AnnouncementStatusFilter) {
  switch (filter) {
    case "live":
      return "Tayang";
    case "scheduled":
      return "Terjadwal";
    case "attention":
      return "Lewat jadwal";
    case "archived":
      return "Arsip";
    default:
      return "Semua status";
  }
}

function getAnnouncementToneFilterLabel(filter: AnnouncementToneFilter) {
  switch (filter) {
    case "warning":
      return "Peringatan";
    case "event":
      return "Agenda";
    case "info":
      return "Info";
    default:
      return "Semua tipe";
  }
}

async function invalidateAnnouncementQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
    queryClient.invalidateQueries({ queryKey: ["public-announcements"] }),
  ]);
}

export function AdminAnnouncementsSection() {
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
  const fallbackAnnouncements = React.useMemo(buildFallbackAnnouncements, []);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<AnnouncementStatusFilter>("all");
  const [toneFilter, setToneFilter] =
    React.useState<AnnouncementToneFilter>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] =
    React.useState<string | "new" | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<AdminAnnouncementDraft>(() =>
    buildAnnouncementDraft(null),
  );
  const [deleteTarget, setDeleteTarget] =
    React.useState<AdminAnnouncementRecord | null>(null);
  const [rowBusyKey, setRowBusyKey] = React.useState<string | null>(null);
  const previewTickerItems = React.useMemo<AnnouncementTickerItem[]>(() => {
    const title = draft.title.trim();
    const message = draft.message.trim();
    const label = [title, message].filter(Boolean).join(" • ") || "Judul pengumuman";

    return [
      {
        id: "admin-announcement-preview",
        label,
        tone: draft.type === "warning" ? "warning" : "info",
      },
    ];
  }, [draft.message, draft.title, draft.type]);

  const announcementsQuery = useQuery({
    queryKey: ["admin-announcements"],
    enabled: hydrated && isHumasAdminSession,
    queryFn: () => getAnnouncements(),
    staleTime: 60_000,
  });

  const liveAnnouncements = React.useMemo(
    () => normalizeAnnouncements(announcementsQuery.data),
    [announcementsQuery.data],
  );
  const usesLiveData = canPersistChanges;
  const announcements = usesLiveData ? liveAnnouncements : fallbackAnnouncements;
  const hasVisibleAnnouncements = announcements.length > 0;

  const filteredAnnouncements = React.useMemo(() => {
    return announcements.filter((announcement) => {
      const lifecycle = getAnnouncementLifecycleStatus(announcement);

      if (statusFilter === "live" && lifecycle.label !== "Tayang") {
        return false;
      }
      if (statusFilter === "scheduled" && lifecycle.label !== "Terjadwal") {
        return false;
      }
      if (
        statusFilter === "attention" &&
        lifecycle.label !== "Lewat jadwal"
      ) {
        return false;
      }
      if (statusFilter === "archived" && lifecycle.label !== "Arsip") {
        return false;
      }
      if (toneFilter !== "all" && announcement.type !== toneFilter) {
        return false;
      }

      if (!searchQuery.trim()) {
        return true;
      }

      const normalizedQuery = searchQuery.trim().toLowerCase();
      return [announcement.title, announcement.message, announcement.id]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [announcements, searchQuery, statusFilter, toneFilter]);

  const selectedAnnouncement =
    selectedAnnouncementId && selectedAnnouncementId !== "new"
      ? announcements.find((announcement) => announcement.id === selectedAnnouncementId) ?? null
      : null;
  const isCreateMode = selectedAnnouncementId === "new";
  const baseDraft = React.useMemo(
    () => buildAnnouncementDraft(isCreateMode ? null : selectedAnnouncement),
    [isCreateMode, selectedAnnouncement],
  );
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseDraft);
  const validationErrors = React.useMemo(
    () => validateAnnouncementDraft(draft),
    [draft],
  );
  const hasValidationErrors = Object.values(validationErrors).some(Boolean);
  const activeFilterCount =
    Number(Boolean(searchQuery.trim())) +
    Number(statusFilter !== "all") +
    Number(toneFilter !== "all");

  const statusFilterOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "all", label: "Semua status" },
      { value: "live", label: "Tayang", keywords: ["aktif", "publish"] },
      { value: "scheduled", label: "Terjadwal", keywords: ["draft", "jadwal"] },
      { value: "attention", label: "Lewat jadwal", keywords: ["perlu cek", "warning"] },
      { value: "archived", label: "Arsip", keywords: ["nonaktif", "arsip"] },
    ],
    [],
  );

  const toneFilterOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "all", label: "Semua tipe" },
      { value: "info", label: "Info", keywords: ["informasi"] },
      { value: "warning", label: "Peringatan", keywords: ["perhatian", "notifikasi"] },
      { value: "event", label: "Agenda", keywords: ["acara", "jadwal"] },
    ],
    [],
  );
  const announcementTypeOptions = React.useMemo<AppSearchSelectOption[]>(
    () => [
      { value: "info", label: "Info", keywords: ["informasi"] },
      { value: "warning", label: "Peringatan", keywords: ["perhatian", "notifikasi"] },
      { value: "event", label: "Agenda", keywords: ["acara", "jadwal"] },
    ],
    [],
  );

  React.useEffect(() => {
    if (selectedAnnouncementId === "new") {
      return;
    }

    if (!selectedAnnouncementId) {
      if (announcements.length > 0) {
        setSelectedAnnouncementId(announcements[0].id);
      }
      return;
    }

    if (!announcements.some((announcement) => announcement.id === selectedAnnouncementId)) {
      setSelectedAnnouncementId(announcements[0]?.id ?? null);
    }
  }, [announcements, selectedAnnouncementId]);

  React.useEffect(() => {
    setDraft(baseDraft);
  }, [baseDraft]);

  function openAnnouncementEditor(announcementId: string | "new") {
    setSelectedAnnouncementId(announcementId);
    setEditorOpen(true);
  }

  function handleEditorOpenChange(nextOpen: boolean) {
    setEditorOpen(nextOpen);

    if (!nextOpen) {
      setDraft(baseDraft);
    }
  }

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setToneFilter("all");
    setShowAdvancedFilters(false);
  }

  const publishedCount = announcements.filter(
    (announcement) => getAnnouncementLifecycleStatus(announcement).label === "Tayang",
  ).length;
  const scheduledCount = announcements.filter(
    (announcement) => getAnnouncementLifecycleStatus(announcement).label === "Terjadwal",
  ).length;
  const overdueCount = announcements.filter(
    (announcement) => getAnnouncementLifecycleStatus(announcement).label === "Lewat jadwal",
  ).length;
  const archivedCount = announcements.filter(
    (announcement) => getAnnouncementLifecycleStatus(announcement).label === "Arsip",
  ).length;

  const saveMutation = useMutation({
    mutationFn: async (currentDraft: AdminAnnouncementDraft) => {
      if (!session?.staffId) {
        throw new Error("Masuk sebagai Humas Admin live terlebih dahulu.");
      }

      const payload = {
        title: currentDraft.title.trim(),
        message: currentDraft.message.trim(),
        type: currentDraft.type,
        active: currentDraft.active,
        startDate: currentDraft.startDate || null,
        endDate: currentDraft.endDate || null,
      };

      return isCreateMode
        ? createAnnouncement(payload, { staffId: session.staffId })
        : updateAnnouncement(selectedAnnouncement?.id ?? "", payload, {
            staffId: session.staffId,
          });
    },
    onSuccess: async (response) => {
      await invalidateAnnouncementQueries(queryClient);

      const savedAnnouncement = normalizeAnnouncementRecord(
        response.announcement,
        "live",
      );
      if (savedAnnouncement) {
        setSelectedAnnouncementId(savedAnnouncement.id);
      }
      setEditorOpen(false);

      toast.success(
        isCreateMode
          ? "Pengumuman baru berhasil ditambahkan."
          : "Perubahan pengumuman berhasil disimpan.",
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pengumuman.";
      toast.error(message);
    },
  });

  async function handleResetDraft() {
    setDraft(baseDraft);
    toast.success(
      isCreateMode
        ? "Form pengumuman baru dikembalikan ke default."
        : "Draft pengumuman dikembalikan ke data terakhir.",
    );
  }

  async function handleSave() {
    if (!canPersistChanges) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu untuk menyimpan.");
      return;
    }

    if (hasValidationErrors) {
      toast.error("Periksa kembali field pengumuman yang wajib.");
      return;
    }

    await saveMutation.mutateAsync(draft);
  }

  async function handleToggleActive(announcement: AdminAnnouncementRecord) {
    if (!session?.staffId) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu.");
      return;
    }

    const busyKey = `${announcement.id}:toggle`;
    setRowBusyKey(busyKey);

    try {
      await updateAnnouncement(
        announcement.id,
        { active: !announcement.active },
        { staffId: session.staffId },
      );
      await invalidateAnnouncementQueries(queryClient);
      toast.success(
        announcement.active
          ? "Pengumuman berhasil diarsipkan."
          : "Pengumuman berhasil diaktifkan kembali.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengubah status pengumuman.";
      toast.error(message);
    } finally {
      setRowBusyKey(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !session?.staffId) {
      return;
    }

    const busyKey = `${deleteTarget.id}:delete`;
    setRowBusyKey(busyKey);

    try {
      await deleteAnnouncement(deleteTarget.id, { staffId: session.staffId });
      await invalidateAnnouncementQueries(queryClient);
      setDeleteTarget(null);
      if (selectedAnnouncementId === deleteTarget.id) {
        setSelectedAnnouncementId(null);
      }
      toast.success("Pengumuman berhasil dihapus.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menghapus pengumuman.";
      toast.error(message);
    } finally {
      setRowBusyKey(null);
    }
  }

  if (!hydrated) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {["Tayang", "Terjadwal", "Lewat jadwal", "Arsip"].map((label) => (
          <AppStatCard
            key={label}
            label={label}
            value="..."
            description="Menyiapkan data pengumuman"
          />
        ))}
      </div>
    );
  }

  if (!isHumasAdminSession) {
    return (
      <AppCard tone="soft" padding="lg" className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Akses dibatasi</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Buka sebagai Humas Admin untuk mengelola pengumuman.
        </p>
      </AppCard>
    );
  }

  if (announcementsQuery.isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {["Tayang", "Terjadwal", "Lewat jadwal", "Arsip"].map((label) => (
          <AppStatCard
            key={label}
            label={label}
            value="..."
            description="Memuat data pengumuman"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {announcementsQuery.isError && !hasVisibleAnnouncements ? (
        <AppCard tone="soft" padding="md" className="rounded-[24px]">
          <p className="text-sm font-semibold text-foreground">Data belum dapat dimuat</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Coba muat ulang halaman setelah koneksi kembali normal.
          </p>
        </AppCard>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          label="Tayang"
          value={String(publishedCount)}
          description="Sedang aktif dibaca publik."
          tone="success"
        />
        <AppStatCard
          label="Terjadwal"
          value={String(scheduledCount)}
          description="Sudah aktif tetapi belum masuk masa tayang."
          tone="info"
        />
        <AppStatCard
          label="Lewat Jadwal"
          value={String(overdueCount)}
          description="Masih aktif padahal tanggal akhir sudah lewat."
          tone={overdueCount > 0 ? "warning" : "success"}
        />
        <AppStatCard
          label="Arsip"
          value={String(archivedCount)}
          description="Tidak ditampilkan ke publik."
          tone="neutral"
        />
      </div>

      <AppFilterBar
        actions={
          <>
            <AppButton variant="outline" onClick={resetFilters} disabled={!activeFilterCount}>
              <RefreshCw className="size-4" />
              Reset Filter
            </AppButton>
            <AppButton onClick={() => openAnnouncementEditor("new")} disabled={!canPersistChanges}>
              <Plus className="size-4" />
              Pengumuman Baru
            </AppButton>
          </>
        }
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            id="admin-announcement-search"
            placeholder="Cari pengumuman..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-11 pl-10 pr-11"
          />
          {searchQuery ? (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <AppFilterTrigger
          icon={SlidersHorizontal}
          label="Filter"
          count={activeFilterCount}
          active={showAdvancedFilters}
          onClick={() => setShowAdvancedFilters((currentValue) => !currentValue)}
        />
      </AppFilterBar>

      {showAdvancedFilters ? (
        <div className="grid gap-3 rounded-[calc(var(--radius-2xl)+4px)] border border-border bg-surface-container-lowest p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <AppSearchSelect
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as AnnouncementStatusFilter)}
            options={statusFilterOptions}
            placeholder="Semua status"
            searchPlaceholder="Cari status"
            emptyMessage="Status tidak ditemukan."
            className="w-full"
          />
          <AppSearchSelect
            value={toneFilter}
            onValueChange={(value) => setToneFilter(value as AnnouncementToneFilter)}
            options={toneFilterOptions}
            placeholder="Semua tipe"
            searchPlaceholder="Cari tipe"
            emptyMessage="Tipe tidak ditemukan."
            className="w-full"
          />
          <div className="flex items-end justify-end">
            <AppButton size="sm" variant="ghost" onClick={resetFilters}>
              Reset filter
            </AppButton>
          </div>
        </div>
      ) : null}

      {activeFilterCount ? (
        <div className="flex flex-wrap items-center gap-2">
          {searchQuery.trim() ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              Cari: {searchQuery.trim()}
            </span>
          ) : null}
          {statusFilter !== "all" ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {getAnnouncementStatusFilterLabel(statusFilter)}
            </span>
          ) : null}
          {toneFilter !== "all" ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground">
              {getAnnouncementToneFilterLabel(toneFilter)}
            </span>
          ) : null}
        </div>
      ) : null}

      <AppCard padding="lg" className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            Pengumuman publik
          </p>
          <AppCardTitle className="text-2xl">Daftar pengumuman</AppCardTitle>
          <AppCardDescription>
            Kelola judul, isi, jenis, masa tayang, dan status aktif pengumuman dari satu panel.
          </AppCardDescription>
        </div>

        <AppTable className="table-fixed">
          <AppTableHead>
            <tr>
              <AppTableHeaderCell className="w-[31%]">Pengumuman</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[14%]">Tipe</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[17%]">Masa Tayang</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[18%]">Status</AppTableHeaderCell>
              <AppTableHeaderCell className="w-[20%]">Aksi</AppTableHeaderCell>
            </tr>
          </AppTableHead>
          <tbody>
            {filteredAnnouncements.length ? (
              filteredAnnouncements.map((announcement) => {
                const lifecycle = getAnnouncementLifecycleStatus(announcement);
                const isSelected = selectedAnnouncementId === announcement.id;

                return (
                  <AppTableRow
                    key={announcement.id}
                    className={isSelected ? "bg-role-accent-soft/25" : undefined}
                  >
                    <AppTableCell className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {announcement.title}
                      </p>
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {announcement.message}
                      </p>
                      <p className="text-xs text-muted-foreground">{announcement.id}</p>
                    </AppTableCell>
                    <AppTableCell className="space-y-1">
                      <AppStatusBadge
                        status={
                          announcement.type === "warning"
                            ? "warning"
                            : announcement.type === "event"
                              ? "diproses"
                              : "aktif"
                        }
                        label={getToneLabel(announcement.type)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {announcement.source === "live" ? "Live" : "Fallback"}
                      </p>
                    </AppTableCell>
                    <AppTableCell className="space-y-1">
                      <p className="font-medium text-foreground">
                        {announcement.startDate || "Segera"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {announcement.endDate || "Tanpa akhir"}
                      </p>
                    </AppTableCell>
                    <AppTableCell className="space-y-2">
                      <AppStatusBadge status={lifecycle.tone} label={lifecycle.label} />
                      <p className="text-xs leading-5 text-muted-foreground">
                        {lifecycle.note}
                      </p>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="flex flex-wrap gap-2">
                        <AppButton
                          size="xs"
                          variant="outline"
                          onClick={() => openAnnouncementEditor(announcement.id)}
                        >
                          <PencilLine className="size-3.5" />
                          Edit
                        </AppButton>
                        <AppButton
                          size="xs"
                          variant="ghost"
                          disabled={!canPersistChanges || rowBusyKey === `${announcement.id}:delete`}
                          loading={rowBusyKey === `${announcement.id}:toggle`}
                          loadingLabel="Memproses..."
                          onClick={() => void handleToggleActive(announcement)}
                        >
                          {announcement.active ? "Arsipkan" : "Aktifkan"}
                        </AppButton>
                        <AppButton
                          size="xs"
                          variant="ghost"
                          disabled={!canPersistChanges || rowBusyKey === `${announcement.id}:toggle`}
                          loading={rowBusyKey === `${announcement.id}:delete`}
                          loadingLabel="Menghapus..."
                          onClick={() => setDeleteTarget(announcement)}
                        >
                          <Trash2 className="size-3.5" />
                          Hapus
                        </AppButton>
                      </div>
                    </AppTableCell>
                  </AppTableRow>
                );
              })
            ) : (
              <AppTableRow>
                <AppTableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Belum ada pengumuman yang cocok dengan filter aktif.
                </AppTableCell>
              </AppTableRow>
            )}
          </tbody>
        </AppTable>
      </AppCard>

      <AppDialog
        open={editorOpen}
        onOpenChange={handleEditorOpenChange}
        title={isCreateMode ? "Tambah pengumuman" : "Ubah pengumuman"}
        className="max-w-5xl"
        description={
          isCreateMode
            ? "Susun pengumuman publik."
            : "Ubah pengumuman tanpa membuat panel terasa penuh."
        }
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <AdminEditorSection
              eyebrow="Konten publik"
              title="Judul dan isi pesan"
              description="Gunakan bahasa yang singkat dan langsung."
            >
              <div className="space-y-4">
                <AdminFormField
                  label="Judul"
                  error={validationErrors.title}
                  controlId="admin-announcement-title"
                >
                  <AppInput
                    id="admin-announcement-title"
                    value={draft.title}
                    disabled={!canPersistChanges || saveMutation.isPending}
                    onChange={(event) =>
                      setDraft((currentValue) => ({
                        ...currentValue,
                        title: event.target.value,
                      }))
                    }
                  />
                </AdminFormField>

                <AdminFormField
                  label="Pesan"
                  error={validationErrors.message}
                  controlId="admin-announcement-message"
                >
                  <AppTextarea
                    id="admin-announcement-message"
                    value={draft.message}
                    disabled={!canPersistChanges || saveMutation.isPending}
                    className="min-h-[180px]"
                    onChange={(event) =>
                      setDraft((currentValue) => ({
                        ...currentValue,
                        message: event.target.value,
                      }))
                    }
                  />
                </AdminFormField>
              </div>
            </AdminEditorSection>

            <AdminEditorSection
              eyebrow="Penayangan"
              title="Tayang dan status aktif"
              description="Atur tipe pesan serta masa tayangnya."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField
                  label="Tipe pesan"
                  controlId="admin-announcement-type"
                >
                  <AppSearchSelect
                    id="admin-announcement-type"
                    value={draft.type}
                    onValueChange={(value) =>
                      setDraft((currentValue) => ({
                        ...currentValue,
                        type: value as AnnouncementTone,
                      }))
                    }
                    options={announcementTypeOptions}
                    placeholder="Pilih tipe"
                    searchPlaceholder="Cari tipe"
                    emptyMessage="Tipe tidak ditemukan."
                    disabled={!canPersistChanges || saveMutation.isPending}
                  />
                </AdminFormField>

                <AdminFormField
                  label="Status aktif"
                  controlId="admin-announcement-active"
                >
                  <label className="flex h-12 items-center justify-between rounded-[var(--radius-xl)] border border-input bg-surface-container-low px-4 text-sm font-medium text-foreground">
                    <span>Aktifkan pengumuman</span>
                    <AppCheckbox
                      id="admin-announcement-active"
                      checked={draft.active}
                      disabled={!canPersistChanges || saveMutation.isPending}
                      onChange={(event) =>
                        setDraft((currentValue) => ({
                          ...currentValue,
                          active: event.target.checked,
                        }))
                      }
                    />
                  </label>
                </AdminFormField>

                <AdminFormField
                  label="Mulai tayang"
                  controlId="admin-announcement-start-date"
                >
                  <AppInput
                    id="admin-announcement-start-date"
                    type="date"
                    value={draft.startDate}
                    disabled={!canPersistChanges || saveMutation.isPending}
                    onChange={(event) =>
                      setDraft((currentValue) => ({
                        ...currentValue,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </AdminFormField>

                <AdminFormField
                  label="Akhir tayang"
                  error={validationErrors.endDate}
                  controlId="admin-announcement-end-date"
                >
                  <AppInput
                    id="admin-announcement-end-date"
                    type="date"
                    value={draft.endDate}
                    disabled={!canPersistChanges || saveMutation.isPending}
                    onChange={(event) =>
                      setDraft((currentValue) => ({
                        ...currentValue,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </AdminFormField>
              </div>
            </AdminEditorSection>

          <div className="flex flex-wrap gap-3">
            <AppButton
              variant="outline"
              onClick={() => setResetConfirmOpen(true)}
              disabled={!isDirty || saveMutation.isPending}
            >
              <RefreshCw className="size-4" />
              Reset Draft
              </AppButton>
              <AppButton
                onClick={() => void handleSave()}
                loading={saveMutation.isPending}
                loadingLabel="Menyimpan..."
                disabled={!canPersistChanges || !isDirty || hasValidationErrors}
              >
                <Save className="size-4" />
                {isCreateMode ? "Buat Pengumuman" : "Simpan Perubahan"}
              </AppButton>
            </div>
          </div>

          <div className="space-y-4 xl:sticky xl:top-0">
            <AppCard tone="soft" padding="md" className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Pratinjau ticker
                </p>
                <AppCardTitle className="text-xl">Tampilan publik</AppCardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  Teks pengumuman bergerak satu baris seperti di landing page.
                </p>
              </div>
              <div className="rounded-[24px] border border-border bg-background px-4 py-4">
                <AnnouncementTickerStrip items={previewTickerItems} duration="28s" />
              </div>
            </AppCard>

            <AppCard tone="soft" padding="md" className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                  Catatan singkat
                </p>
                <AppCardTitle className="text-xl">Agar tetap rapi</AppCardTitle>
              </div>
              <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                <p>Gunakan judul yang singkat.</p>
                <p>Isi pesan langsung ke pokok informasi.</p>
                <p>Tambahkan tanggal akhir jika memang diperlukan.</p>
              </div>
            </AppCard>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Hapus pengumuman"
        description={
          deleteTarget
            ? `Pengumuman ${deleteTarget.title} akan dihapus dari daftar publikasi. Pastikan pesan ini sudah tidak dipakai.`
            : "Pastikan pengumuman ini sudah tidak dipakai."
        }
      >
        <div className="space-y-6">
          <AppNotice
            icon={AlertCircle}
            title="Periksa sebelum hapus"
            description="Pastikan pengumuman ini sudah tidak dipakai."
            tone="danger"
          />
          <div className="flex flex-wrap justify-end gap-3">
            <AppButton variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </AppButton>
            <AppButton
              variant="destructive"
              onClick={() => void handleDelete()}
              loading={deleteTarget != null && rowBusyKey === `${deleteTarget.id}:delete`}
              loadingLabel="Menghapus..."
              disabled={!canPersistChanges}
            >
              <Trash2 className="size-4" />
              Hapus pengumuman
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Kembalikan draft pengumuman?"
        description="Perubahan yang belum disimpan akan dibuang dan form kembali ke data terakhir yang tersimpan."
        confirmLabel="Kembalikan Draft"
        confirmVariant="default"
        onConfirm={async () => {
          setResetConfirmOpen(false);
          await handleResetDraft();
        }}
      />
    </div>
  );
}
