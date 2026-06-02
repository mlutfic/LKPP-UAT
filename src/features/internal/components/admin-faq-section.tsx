"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, PencilLine, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AppActionBar } from "@/components/ui/app-action-bar";
import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFilterBar } from "@/components/ui/app-filter-bar";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import {
  AppSearchSelect,
  type AppSearchSelectOption,
} from "@/components/ui/app-search-select";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { AppTextarea } from "@/components/ui/app-textarea";
import { useAuthSessionQuery } from "@/features/auth/hooks/use-auth-session-query";
import {
  AdminEditorSection,
  AdminFormField,
} from "@/features/internal/components/admin-editor-section";
import type { WorkspaceRow } from "@/features/internal/internal-workspace-config";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  createHelpFaq,
  deleteHelpFaq,
  getHelpFaqs,
  updateHelpFaq,
} from "@/lib/api/help-faq";

type AdminFaqChrome = {
  actionEyebrow?: string;
  actionDescription?: string;
  actionPills?: string[];
};

type FaqStatus = "Aktif" | "Perlu Review" | "Arsip";

type FaqItem = {
  backendId: string;
  code: string;
  title: string;
  note: string;
  status: FaqStatus;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  source: "live" | "fallback";
};

type FaqItemWithOptionalCode = Omit<FaqItem, "code"> & {
  code?: string;
};

type FaqDraft = {
  code: string;
  title: string;
  note: string;
  status: FaqStatus;
};

const STATUS_OPTIONS: AppSearchSelectOption[] = [
  { value: "all", label: "Semua status" },
  { value: "Aktif", label: "Aktif" },
  { value: "Perlu Review", label: "Perlu review" },
  { value: "Arsip", label: "Arsip" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function buildDisplayFaqCode(index: number) {
  return `FAQ-${String(index).padStart(2, "0")}`;
}

function normalizeFaqStatus(rawFaq: Record<string, unknown>): FaqStatus {
  const rawStatus = asString(rawFaq.status)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (rawStatus === "perlu review" || rawStatus === "review") {
    return "Perlu Review";
  }

  if (rawStatus === "arsip" || rawStatus === "archive") {
    return "Arsip";
  }

  return rawFaq.active === false ? "Arsip" : "Aktif";
}

function normalizeFaqRecord(
  rawFaq: unknown,
  index: number,
  source: "live" | "fallback",
): FaqItemWithOptionalCode | null {
  if (!isRecord(rawFaq)) {
    return null;
  }

  const backendId = asString(rawFaq.id).trim();
  const title = asString(rawFaq.question || rawFaq.title).trim();
  const note = asString(rawFaq.answer || rawFaq.note || rawFaq.description).trim();
  if (!backendId || !title || !note) {
    return null;
  }

  return {
    backendId,
    code: asString(rawFaq.code || rawFaq.faqCode || rawFaq.faq_code).trim(),
    title,
    note,
    status: normalizeFaqStatus(rawFaq),
    active: rawFaq.active !== false,
    sortOrder:
      typeof rawFaq.sortOrder === "number"
        ? rawFaq.sortOrder
        : typeof rawFaq.order === "number"
          ? rawFaq.order
          : index + 1,
    createdAt: asString(rawFaq.createdAt).trim(),
    updatedAt: asString(rawFaq.updatedAt).trim(),
    source,
  } satisfies FaqItemWithOptionalCode;
}

function decorateFaqCodes(items: FaqItemWithOptionalCode[]) {
  return items.map((item, index) => ({
    ...item,
    code: item.code?.trim() || buildDisplayFaqCode(index + 1),
  }));
}

function normalizeLiveFaqs(payload: unknown) {
  const root = isRecord(payload) ? payload : {};
  const rows = Array.isArray(root.helpFaqs) ? root.helpFaqs : [];

  const items = rows
    .map((row, index) => normalizeFaqRecord(row, index, "live"))
    .filter((row): row is FaqItemWithOptionalCode => row !== null)
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      const leftDate = left.createdAt || left.updatedAt || "";
      const rightDate = right.createdAt || right.updatedAt || "";
      return rightDate.localeCompare(leftDate) || left.title.localeCompare(right.title);
    });

  return decorateFaqCodes(items);
}

function buildFallbackFaqs(rows: WorkspaceRow[]): FaqItem[] {
  return rows.map((row, index) => ({
    backendId: row.id,
    code: row.id || buildDisplayFaqCode(index + 1),
    title: row.title,
    note: row.note,
    status:
      row.status === "Perlu Review" || row.status === "Arsip" ? row.status : "Aktif",
    active: row.status !== "Arsip",
    sortOrder: index + 1,
    createdAt: "",
    updatedAt: "",
    source: "fallback" as const,
  }));
}

function buildFaqDraft(faq: FaqItem | null): FaqDraft {
  return {
    code: faq?.code ?? buildDisplayFaqCode(1),
    title: faq?.title ?? "",
    note: faq?.note ?? "",
    status: faq?.status ?? "Aktif",
  };
}

function getTopSortOrder(items: FaqItem[]) {
  const sortOrders = items
    .map((item) => item.sortOrder)
    .filter((sortOrder) => Number.isFinite(sortOrder));

  if (!sortOrders.length) {
    return 1;
  }

  return Math.min(...sortOrders) - 1;
}

function getFaqBadge(status: FaqStatus) {
  if (status === "Perlu Review") {
    return { tone: "warning" as const, label: "Perlu Review" };
  }

  if (status === "Arsip") {
    return { tone: "menunggu" as const, label: "Arsip" };
  }

  return { tone: "aktif" as const, label: "Aktif" };
}

async function invalidateHelpFaqQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["admin-help-faqs"] });
}

export function AdminFaqSection({
  chrome,
  initialRows,
}: {
  chrome: AdminFaqChrome;
  initialRows: WorkspaceRow[];
}) {
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
  const fallbackItems = React.useMemo(
    () => buildFallbackFaqs(initialRows),
    [initialRows],
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FaqItem | null>(null);
  const [editingFaqId, setEditingFaqId] = React.useState<string | "new" | null>(null);
  const [draft, setDraft] = React.useState<FaqDraft>(() => buildFaqDraft(null));
  const [deletingFaqId, setDeletingFaqId] = React.useState<string | null>(null);
  const deleteInFlightRef = React.useRef<string | null>(null);

  const faqQuery = useQuery({
    queryKey: ["admin-help-faqs", session?.staffId],
    enabled: hydrated && Boolean(session?.staffId) && isHumasAdminSession,
    queryFn: () => getHelpFaqs({ staffId: session?.staffId }),
    staleTime: 60_000,
  });

  const liveItems = React.useMemo(
    () => normalizeLiveFaqs(faqQuery.data),
    [faqQuery.data],
  );
  const usesLiveData = canPersistChanges;
  const items = usesLiveData ? liveItems : fallbackItems;
  const selectedFaq =
    editingFaqId && editingFaqId !== "new"
      ? items.find((item) => item.backendId === editingFaqId) ?? null
      : null;
  const isCreateMode = editingFaqId === "new";
  const baseDraft = React.useMemo(
    () => buildFaqDraft(isCreateMode ? null : selectedFaq),
    [isCreateMode, selectedFaq],
  );
  const activeFilterCount = Number(Boolean(searchQuery.trim())) + Number(statusFilter !== "all");

  React.useEffect(() => {
    if (!editorOpen) {
      return;
    }

    setDraft(baseDraft);
  }, [baseDraft, editorOpen]);

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [item.code, item.title, item.note].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [items, searchQuery, statusFilter]);

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
  }

  function openCreate() {
    setEditingFaqId("new");
    setDraft(buildFaqDraft(null));
    setEditorOpen(true);
  }

  function openEdit(item: FaqItem) {
    setEditingFaqId(item.backendId);
    setDraft(buildFaqDraft(item));
    setEditorOpen(true);
  }

  function handleEditorOpenChange(nextOpen: boolean) {
    setEditorOpen(nextOpen);

    if (!nextOpen) {
      setEditingFaqId(null);
      setDraft(buildFaqDraft(null));
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (currentDraft: FaqDraft) => {
      if (!session?.staffId) {
        throw new Error("Masuk sebagai Humas Admin live terlebih dahulu.");
      }

      const title = currentDraft.title.trim();
      const note = currentDraft.note.trim();
      const status = currentDraft.status;
      const active = status !== "Arsip";
      const sortOrder = isCreateMode
        ? getTopSortOrder(items)
        : selectedFaq?.sortOrder ?? getTopSortOrder(items);
      const payload = {
        question: title,
        answer: note,
        title,
        note,
        active,
        status,
        sortOrder,
        order: sortOrder,
      };

      return isCreateMode
        ? createHelpFaq(payload, { staffId: session.staffId })
        : updateHelpFaq(selectedFaq?.backendId ?? "", payload, {
            staffId: session.staffId,
          });
    },
    onSuccess: async () => {
      await invalidateHelpFaqQueries(queryClient);
      setEditorOpen(false);
      setEditingFaqId(null);
      setDraft(buildFaqDraft(null));
      toast.success(isCreateMode ? "FAQ ditambahkan." : "FAQ diperbarui.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Gagal menyimpan FAQ.";
      toast.error(message);
    },
  });

  async function handleSave() {
    if (!canPersistChanges) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu untuk menyimpan FAQ.");
      return;
    }

    if (!draft.title.trim() || !draft.note.trim()) {
      toast.error("Judul FAQ dan ringkasan wajib diisi.");
      return;
    }

    await saveMutation.mutateAsync(draft);
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    if (!session?.staffId) {
      toast.error("Masuk sebagai Humas Admin live terlebih dahulu untuk menghapus FAQ.");
      return;
    }

    const target = deleteTarget;
    if (deleteInFlightRef.current === target.backendId) {
      return;
    }

    deleteInFlightRef.current = target.backendId;
    setDeletingFaqId(target.backendId);

    try {
      await deleteHelpFaq(target.backendId, { staffId: session.staffId });
      await invalidateHelpFaqQueries(queryClient);
      if (editingFaqId === target.backendId) {
        setEditingFaqId(null);
        setEditorOpen(false);
        setDraft(buildFaqDraft(null));
      }
      setDeleteTarget(null);
      toast.success("FAQ dihapus.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus FAQ.";
      const normalizedMessage = message.toLowerCase();
      if (
        normalizedMessage.includes("faq tidak ditemukan") ||
        (normalizedMessage.includes("faq") && normalizedMessage.includes("not found"))
      ) {
        await invalidateHelpFaqQueries(queryClient);
        if (editingFaqId === target.backendId) {
          setEditingFaqId(null);
          setEditorOpen(false);
          setDraft(buildFaqDraft(null));
        }
        setDeleteTarget(null);
        return;
      }

      toast.error(message);
    } finally {
      deleteInFlightRef.current = null;
      setDeletingFaqId(null);
    }
  }

  const actionButtons = (chrome.actionPills ?? []).map((label) => {
    const lowerLabel = label.toLowerCase();

    return (
      <AppButton
        key={label}
        size="sm"
        variant={lowerLabel.includes("tambah") ? "default" : "outline"}
        onClick={async () => {
          if (lowerLabel.includes("tambah")) {
            if (!canPersistChanges) {
              toast.error("Masuk sebagai Humas Admin live terlebih dahulu untuk menambah FAQ.");
              return;
            }

            openCreate();
            return;
          }

          if (lowerLabel.includes("pratinjau")) {
            toast.success("Pratinjau bantuan dibuka.");
            return;
          }

          try {
            await faqQuery.refetch();
            toast.success("Data bantuan disegarkan.");
          } catch {
            toast.error("Data bantuan belum bisa disegarkan.");
          }
        }}
      >
        {lowerLabel.includes("tambah") ? <Plus className="size-4" /> : null}
        {lowerLabel.includes("pratinjau") ? <Eye className="size-4" /> : null}
        {lowerLabel.includes("segar") ? <RefreshCw className="size-4" /> : null}
        {label}
      </AppButton>
    );
  });

  return (
    <div className="space-y-6">
      {chrome.actionEyebrow && chrome.actionDescription ? (
        <AppActionBar>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {chrome.actionEyebrow}
            </p>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {chrome.actionDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
            {actionButtons}
          </div>
        </AppActionBar>
      ) : null}

      {faqQuery.isError && usesLiveData ? (
        <AppNotice
          icon={RefreshCw}
          title="Daftar FAQ live belum termuat"
          description="Data FAQ belum berhasil dibaca dari backend. Coba segarkan lagi setelah koneksi normal."
          tone="warning"
        />
      ) : null}

      <AppFilterBar
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <AppSearchSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={STATUS_OPTIONS}
              placeholder="Semua status"
              searchPlaceholder="Cari status"
              emptyMessage="Status tidak ditemukan."
              className="w-full md:w-[220px]"
            />
            <AppButton variant="outline" onClick={resetFilters} disabled={!activeFilterCount}>
              <RefreshCw className="size-4" />
              Reset
            </AppButton>
          </div>
        }
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari kode FAQ, judul, atau ringkasan"
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
      </AppFilterBar>

      <div className="space-y-4">
        {filteredItems.map((item) => {
          const badge = getFaqBadge(item.status);

          return (
            <AppCard key={item.backendId} padding="lg" className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.code}
                  </p>
                  <AppCardTitle className="text-xl">{item.title}</AppCardTitle>
                  <AppCardDescription className="max-w-none">{item.note}</AppCardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AppStatusBadge status={badge.tone} label={badge.label} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AppButton size="xs" variant="outline" onClick={() => openEdit(item)}>
                  <PencilLine className="size-3.5" />
                  Ubah
                </AppButton>
                <AppButton size="xs" variant="ghost" onClick={() => setDeleteTarget(item)}>
                  <Trash2 className="size-3.5" />
                  Hapus
                </AppButton>
              </div>
            </AppCard>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <AppCard padding="lg" className="text-sm leading-6 text-muted-foreground">
          Tidak ada FAQ yang sesuai dengan filter aktif.
        </AppCard>
      ) : null}

      <AppDialog
        open={editorOpen}
        onOpenChange={handleEditorOpenChange}
        title={isCreateMode ? "Tambah FAQ" : "Ubah FAQ"}
        description="Perbarui judul, ringkasan, dan status FAQ melalui popup agar daftar tetap ringkas."
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <AdminEditorSection
            eyebrow={isCreateMode ? "FAQ baru" : "Detail FAQ"}
            title="Informasi FAQ"
            description="Gunakan judul dan ringkasan yang singkat serta mudah dipahami publik."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField
                label="Kode FAQ"
                description="Kode dibuat otomatis dari urutan daftar."
                controlId="admin-faq-id"
              >
                <AppInput id="admin-faq-id" value={draft.code} readOnly aria-readonly="true" />
              </AdminFormField>
              <AdminFormField label="Status" controlId="admin-faq-status">
                <AppSearchSelect
                  id="admin-faq-status"
                  value={draft.status}
                  onValueChange={(value) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      status: value as FaqStatus,
                    }))
                  }
                  options={STATUS_OPTIONS.filter((option) => option.value !== "all")}
                  placeholder="Pilih status"
                  searchPlaceholder="Cari status"
                  emptyMessage="Status tidak ditemukan."
                />
              </AdminFormField>
            </div>
            <AdminFormField label="Judul FAQ" controlId="admin-faq-title">
              <AppInput
                id="admin-faq-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((currentValue) => ({ ...currentValue, title: event.target.value }))
                }
              />
            </AdminFormField>
            <AdminFormField label="Ringkasan" controlId="admin-faq-note">
              <AppTextarea
                id="admin-faq-note"
                rows={4}
                value={draft.note}
                onChange={(event) =>
                  setDraft((currentValue) => ({ ...currentValue, note: event.target.value }))
                }
              />
            </AdminFormField>
          </AdminEditorSection>

          <div className="flex flex-wrap justify-end gap-3">
            <AppButton variant="outline" onClick={() => handleEditorOpenChange(false)}>
              Batal
            </AppButton>
            <AppButton onClick={handleSave} loading={saveMutation.isPending}>
              Simpan FAQ
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deletingFaqId) {
            setDeleteTarget(null);
          }
        }}
        title="Hapus FAQ?"
        description={
          deleteTarget
            ? `${deleteTarget.code} akan dihapus dari daftar bantuan.`
            : "FAQ akan dihapus dari daftar bantuan."
        }
        confirmLabel="Hapus FAQ"
        confirmVariant="destructive"
        loading={deleteTarget != null && deletingFaqId === deleteTarget.backendId}
        onConfirm={handleDelete}
      />
    </div>
  );
}
