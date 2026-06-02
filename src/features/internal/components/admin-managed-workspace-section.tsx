"use client";

import * as React from "react";
import { Filter, PencilLine, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppActionBar } from "@/components/ui/app-action-bar";
import { AppButton } from "@/components/ui/app-button";
import {
  AppCard,
} from "@/components/ui/app-card";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppInput } from "@/components/ui/app-input";
import { AppSelect } from "@/components/ui/app-select";
import { AppTextarea } from "@/components/ui/app-textarea";
import {
  AdminEditorSection,
  AdminFormField,
} from "@/features/internal/components/admin-editor-section";
import type { AdminPage } from "@/features/internal/admin-panel-content";
import type { WorkspaceRow } from "@/features/internal/internal-workspace-config";
import { cn } from "@/lib/utils";

type DraftRow = WorkspaceRow;
type AdminManagedWorkspaceChrome = {
  variant?: "default" | "compact" | "list";
  actionEyebrow?: string;
  actionDescription?: string;
  actionPills?: string[];
};

const ACTION_EVENT_PREFIX = "lkpp:admin-managed";

function useManagedEvent(
  page: AdminPage,
  action: "primary" | "secondary",
  handler: () => void,
) {
  React.useEffect(() => {
    function onEvent() {
      handler();
    }

    const eventName = `${ACTION_EVENT_PREFIX}:${page}:${action}`;
    window.addEventListener(eventName, onEvent);
    return () => window.removeEventListener(eventName, onEvent);
  }, [action, handler, page]);
}

function createDefaultDraft(page: AdminPage, rows: DraftRow[]): DraftRow {
  const nextIndex = rows.length + 1;
  const prefixMap: Partial<Record<AdminPage, string>> = {
    "faq-bantuan": "FAQ",
    "ekspor-data": "ED",
    "data-referensi": "DR",
    aktivitas: "AK",
    profil: "PR",
    pengaturan: "PG",
  };

  const prefix = prefixMap[page] ?? "ROW";
  return {
    id: `${prefix}-${String(nextIndex).padStart(2, "0")}`,
    title: "",
    status: "Aktif",
    note: "",
  };
}

function getStatusOptions(rows: DraftRow[]) {
  const seen = new Set<string>();
  const options = ["Aktif", "Draft", "Siap", "Perlu Review", "Tinjau", "Arsip", "Tersimpan"];

  for (const row of rows) {
    if (row.status.trim()) {
      seen.add(row.status.trim());
    }
  }

  for (const option of options) {
    seen.add(option);
  }

  return Array.from(seen);
}

function getActionTone(label: string) {
  if (label.toLowerCase().includes("hapus") || label.toLowerCase().includes("reset")) {
    return "outline" as const;
  }

  if (
    label.toLowerCase().includes("tambah") ||
    label.toLowerCase().includes("simpan") ||
    label.toLowerCase().includes("perbarui")
  ) {
    return "default" as const;
  }

  return "outline" as const;
}

export function AdminManagedWorkspaceSection({
  page,
  chrome,
  initialRows,
}: {
  page: AdminPage;
  chrome: AdminManagedWorkspaceChrome;
  initialRows: WorkspaceRow[];
}) {
  const [rows, setRows] = React.useState<DraftRow[]>(initialRows);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<DraftRow | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<DraftRow>(() => createDefaultDraft(page, initialRows));
  const [filterOpen, setFilterOpen] = React.useState(false);

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const statusOptions = React.useMemo(() => getStatusOptions(rows), [rows]);

  const closeEditor = React.useCallback(() => {
    setEditorOpen(false);
    setEditingId(null);
    setDraft(createDefaultDraft(page, rows));
  }, [page, rows]);

  const openCreate = React.useCallback(() => {
    setEditingId(null);
    setDraft(createDefaultDraft(page, rows));
    setEditorOpen(true);
  }, [page, rows]);

  const openEdit = React.useCallback(
    (row: DraftRow) => {
      setEditingId(row.id);
      setDraft({ ...row });
      setEditorOpen(true);
    },
    [],
  );

  const resetRows = React.useCallback(() => {
    setRows(initialRows);
    toast.success("Daftar dipulihkan ke kondisi awal.");
  }, [initialRows]);

  const saveRow = React.useCallback(() => {
    const nextRow: DraftRow = {
      id: draft.id.trim().toUpperCase(),
      title: draft.title.trim(),
      status: draft.status.trim() || "Aktif",
      note: draft.note.trim(),
    };

    if (!nextRow.id || !nextRow.title) {
      toast.error("ID dan judul wajib diisi.");
      return;
    }

    setRows((currentRows) => {
      if (editingId) {
        return currentRows.map((row) => (row.id === editingId ? nextRow : row));
      }

      if (currentRows.some((row) => row.id === nextRow.id)) {
        toast.error("ID sudah digunakan.");
        return currentRows;
      }

      return [nextRow, ...currentRows];
    });

    toast.success(editingId ? "Item berhasil diperbarui." : "Item baru berhasil ditambahkan.");
    closeEditor();
  }, [closeEditor, draft.id, draft.note, draft.status, draft.title, editingId]);

  const confirmDelete = React.useCallback(() => {
    if (!deleteTarget) {
      return;
    }

    setRows((currentRows) => currentRows.filter((row) => row.id !== deleteTarget.id));
    toast.success("Item dihapus dari daftar.");
    setDeleteTarget(null);
  }, [deleteTarget]);

  const handlePrimary = React.useCallback(() => {
    if (page === "faq-bantuan" || page === "data-referensi") {
      openCreate();
      return;
    }

    if (page === "ekspor-data") {
      toast.success("Paket ekspor disiapkan.");
      return;
    }

    if (page === "pengaturan") {
      toast.success("Pengaturan disimpan.");
      return;
    }

    if (page === "profil") {
      if (rows[0]) {
        openEdit(rows[0]);
      } else {
        openCreate();
      }
      return;
    }

    if (page === "aktivitas") {
      setFilterOpen(true);
      toast.success("Filter aktivitas ditampilkan.");
      return;
    }

    openCreate();
  }, [openCreate, openEdit, page, rows]);

  const handleSecondary = React.useCallback(() => {
    if (page === "faq-bantuan" || page === "data-referensi" || page === "pengaturan") {
      resetRows();
      return;
    }

    if (page === "ekspor-data") {
      openCreate();
      return;
    }

    if (page === "aktivitas") {
      toast.success("Ringkasan audit dibuka.");
      return;
    }

    if (page === "profil") {
      toast.success("Daftar modul profil dibuka.");
      return;
    }

    toast.success("Pratinjau halaman dibuka.");
  }, [openCreate, page, resetRows]);

  useManagedEvent(page, "primary", handlePrimary);
  useManagedEvent(page, "secondary", handleSecondary);

  const actionButtons = (chrome.actionPills ?? []).map((label) => {
    const lower = label.toLowerCase();

    const onClick = () => {
      if (lower.includes("tambah")) {
        openCreate();
        return;
      }

      if (lower.includes("pratinjau")) {
        toast.success("Pratinjau bantuan dibuka.");
        return;
      }

      if (lower.includes("segarkan")) {
        resetRows();
        return;
      }

      if (lower.includes("hapus")) {
        if (rows[0]) {
          setDeleteTarget(rows[0]);
        }
        return;
      }

      if (lower.includes("ubah")) {
        if (rows[0]) {
          openEdit(rows[0]);
        }
        return;
      }

      if (lower.includes("simpan")) {
        toast.success("Perubahan tersimpan.");
        return;
      }

      if (lower.includes("perbarui")) {
        if (rows[0]) {
          openEdit(rows[0]);
        }
        return;
      }

      if (lower.includes("reset")) {
        resetRows();
        return;
      }

      if (lower.includes("filter")) {
        setFilterOpen((currentValue) => !currentValue);
        toast.success("Filter diperbarui.");
        return;
      }

      if (lower.includes("review") || lower.includes("tandai")) {
        setRows((currentRows) =>
          currentRows.length
            ? currentRows.map((row, index) =>
                index === 0 ? { ...row, status: "Perlu Review" } : row,
              )
            : currentRows,
        );
        toast.success("Item pertama ditandai untuk review.");
        return;
      }

      if (lower.includes("ekspor") || lower.includes("unduh") || lower.includes("csv") || lower.includes("pdf")) {
        toast.success("Paket data sedang disiapkan.");
        return;
      }

      if (lower.includes("jadal") || lower.includes("jadwal")) {
        if (page === "ekspor-data") {
          openCreate();
        } else {
          toast.success("Penjadwalan dibuka.");
        }
        return;
      }

      if (lower.includes("sinkron")) {
        resetRows();
        return;
      }

      if (lower.includes("lihat")) {
        toast.success("Ringkasan ditampilkan.");
        return;
      }

      if (lower.includes("riwayat")) {
        toast.success("Riwayat perubahan dibuka.");
      }
    };

    return (
      <AppButton
        key={label}
        variant={getActionTone(label)}
        size="sm"
        onClick={onClick}
        className="min-w-fit"
      >
        {label}
      </AppButton>
    );
  });

  const rowActionLabel = page === "aktivitas" ? "Tinjau" : "Ubah";

  return (
    <div className="space-y-6">
      {chrome.actionEyebrow && chrome.actionDescription ? (
        <AppActionBar>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {chrome.actionEyebrow}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {chrome.actionDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
            {actionButtons}
          </div>
        </AppActionBar>
      ) : null}

      {filterOpen ? (
        <AppCard tone="soft" padding="md" className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="size-4" />
            Filter cepat aktif
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.slice(0, 5).map((status) => (
              <span
                key={status}
                className="inline-flex items-center rounded-full border border-border bg-surface-container-low px-3 py-1 text-xs font-semibold text-foreground"
              >
                {status}
              </span>
            ))}
          </div>
        </AppCard>
      ) : null}

      <div
        className={cn(
          "grid gap-4",
          chrome.variant === "list" ? "space-y-3" : "md:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {rows.map((row) => (
          <AppCard key={row.id} padding="md" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {row.id}
                </p>
                <h3 className="text-lg font-semibold tracking-tight">{row.title}</h3>
              </div>
              <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-foreground">
                {row.status}
              </span>
            </div>

            <p className="text-sm leading-6 text-muted-foreground">{row.note}</p>

            <div className="flex flex-wrap gap-2 pt-2">
              <AppButton
                size="sm"
                variant="outline"
                onClick={() => openEdit(row)}
              >
                <PencilLine className="size-4" />
                {rowActionLabel}
              </AppButton>
              <AppButton
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(row)}
              >
                <Trash2 className="size-4" />
                Hapus
              </AppButton>
            </div>
          </AppCard>
        ))}
      </div>

      <AppDialog
        open={editorOpen}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) {
            closeEditor();
          }
        }}
        title={editingId ? "Ubah item" : "Tambah item"}
        description="Kelola judul, status, dan catatan agar daftar tetap rapi."
        className="max-w-3xl"
      >
        <div className="space-y-6">
          <AdminEditorSection
            eyebrow={editingId ? "Edit data" : "Item baru"}
            title="Detail item"
            description="Gunakan struktur singkat agar daftar tetap mudah dibaca."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField label="ID" controlId={`managed-row-id-${page}`}>
                <AppInput
                  id={`managed-row-id-${page}`}
                  value={draft.id}
                  disabled={Boolean(editingId)}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      id: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField label="Status" controlId={`managed-row-status-${page}`}>
                <AppSelect
                  id={`managed-row-status-${page}`}
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      status: event.target.value,
                    }))
                  }
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </AppSelect>
              </AdminFormField>

              <AdminFormField
                label="Judul"
                controlId={`managed-row-title-${page}`}
                className="md:col-span-2"
              >
                <AppInput
                  id={`managed-row-title-${page}`}
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      title: event.target.value,
                    }))
                  }
                />
              </AdminFormField>

              <AdminFormField
                label="Catatan"
                controlId={`managed-row-note-${page}`}
                className="md:col-span-2"
              >
                <AppTextarea
                  id={`managed-row-note-${page}`}
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((currentValue) => ({
                      ...currentValue,
                      note: event.target.value,
                    }))
                  }
                />
              </AdminFormField>
            </div>
          </AdminEditorSection>

          <div className="flex flex-wrap justify-end gap-3">
            <AppButton variant="outline" onClick={closeEditor}>
              Batal
            </AppButton>
            <AppButton onClick={saveRow}>
              <Save className="size-4" />
              Simpan
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
          }
        }}
        title="Hapus item?"
        description={
          deleteTarget
            ? `Item ${deleteTarget.id} akan dihapus dari daftar ${chrome.actionEyebrow?.toLowerCase() ?? "ini"}.`
            : undefined
        }
        confirmLabel="Hapus"
        confirmVariant="destructive"
        onConfirm={confirmDelete}
      >
        {deleteTarget ? (
          <div className="rounded-[22px] border border-border bg-surface-container-low p-4">
            <p className="text-sm font-semibold">{deleteTarget.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{deleteTarget.note}</p>
          </div>
        ) : null}
      </AppConfirmDialog>
    </div>
  );
}
