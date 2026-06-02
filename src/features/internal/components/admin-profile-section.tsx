"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  Mail,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { MobileProfileLogoutSection } from "@/components/composite/mobile-profile-logout-section";
import { AppActionBar } from "@/components/ui/app-action-bar";
import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppInput } from "@/components/ui/app-input";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { AppTextarea } from "@/components/ui/app-textarea";
import {
  AdminEditorSection,
  AdminFormField,
} from "@/features/internal/components/admin-editor-section";
import type { WorkspaceRow } from "@/features/internal/internal-workspace-config";

type AdminProfileChrome = {
  actionEyebrow?: string;
  actionDescription?: string;
  actionPills?: string[];
};

type ProfileState = {
  name: string;
  email: string;
  role: string;
  status: string;
  modules: string[];
  coordination: string;
  lastSyncLabel: string;
};

type AdminProfilePayload = {
  name: string;
  email: string;
  coordination: string;
  lastSyncLabel: string;
};

type AdminProfileResponse = {
  ok: boolean;
  profile: AdminProfilePayload;
  updatedAt: string;
};

function buildProfileState(rows: WorkspaceRow[]): ProfileState {
  const name = rows.find((row) => row.id === "PR-01")?.note ?? "Humas Admin LKPP";
  const modules =
    rows
      .find((row) => row.id === "PR-02")
      ?.note.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  const email = rows.find((row) => row.id === "PR-03")?.note ?? "admin.humas@lkpp.go.id";

  return {
    name,
    email,
    role: "Humas Admin",
    status: "Aktif",
    modules,
    coordination: "Koordinasi dengan humas monitoring, supervisor, dan unit organisasi.",
    lastSyncLabel: "14 Apr 2026, 19.05",
  };
}

async function fetchAdminProfile() {
  const response = await fetch("/api/admin/profile", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as
    Partial<AdminProfileResponse> & { error?: string };

  if (!response.ok || payload.ok === false || !payload.profile) {
    throw new Error(payload.error || "Profil admin belum dapat dimuat.");
  }

  return {
    profile: payload.profile,
    updatedAt:
      typeof payload.updatedAt === "string"
        ? payload.updatedAt
        : new Date().toISOString(),
  };
}

async function saveAdminProfile(profile: AdminProfilePayload) {
  const response = await fetch("/api/admin/profile", {
    method: "PUT",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile }),
  });

  const payload = (await response.json().catch(() => ({}))) as
    Partial<AdminProfileResponse> & { error?: string };

  if (!response.ok || payload.ok === false || !payload.profile) {
    throw new Error(payload.error || "Profil admin belum dapat disimpan.");
  }

  return {
    profile: payload.profile,
    updatedAt:
      typeof payload.updatedAt === "string"
        ? payload.updatedAt
        : new Date().toISOString(),
  };
}

function createSyncLabel() {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function AdminProfileSection({
  chrome,
  initialRows,
}: {
  chrome: AdminProfileChrome;
  initialRows: WorkspaceRow[];
}) {
  const queryClient = useQueryClient();
  const baseProfile = React.useMemo(() => buildProfileState(initialRows), [initialRows]);
  const [profile, setProfile] = React.useState<ProfileState>(baseProfile);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ProfileState>(baseProfile);
  const [pendingAction, setPendingAction] = React.useState<"save" | "sync" | null>(null);
  const profileQuery = useQuery({
    queryKey: ["admin-profile"],
    queryFn: fetchAdminProfile,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    const storedProfile = profileQuery.data?.profile;
    const nextProfile: ProfileState = {
      ...baseProfile,
      name: storedProfile?.name?.trim() || baseProfile.name,
      email: storedProfile?.email?.trim() || baseProfile.email,
      coordination:
        storedProfile?.coordination?.trim() || baseProfile.coordination,
      lastSyncLabel:
        storedProfile?.lastSyncLabel?.trim() || baseProfile.lastSyncLabel,
    };

    setProfile(nextProfile);
    setDraft(nextProfile);
  }, [baseProfile, profileQuery.data?.updatedAt]);

  const statusBadge = { tone: "aktif" as const, label: profile.status };

  const persistProfile = React.useCallback(
    async (nextProfile: ProfileState, action: "save" | "sync") => {
      setPendingAction(action);

      try {
        const result = await saveAdminProfile({
          name: nextProfile.name.trim(),
          email: nextProfile.email.trim(),
          coordination: nextProfile.coordination.trim(),
          lastSyncLabel: nextProfile.lastSyncLabel.trim(),
        });

        const effectiveProfile: ProfileState = {
          ...baseProfile,
          name: result.profile.name,
          email: result.profile.email,
          coordination: result.profile.coordination,
          lastSyncLabel: result.profile.lastSyncLabel,
        };

        queryClient.setQueryData(["admin-profile"], result);
        setProfile(effectiveProfile);
        setDraft(effectiveProfile);
        return effectiveProfile;
      } finally {
        setPendingAction(null);
      }
    },
    [baseProfile, queryClient],
  );

  const actionButtons = (chrome.actionPills ?? []).map((label) => {
    const lowerLabel = label.toLowerCase();
    const isUpdateAction = lowerLabel.includes("perbarui");
    const isSyncAction = lowerLabel.includes("sinkron");

    return (
      <AppButton
        key={label}
        size="sm"
        variant={isUpdateAction ? "default" : "outline"}
        loading={isSyncAction && pendingAction === "sync"}
        onClick={async () => {
          if (isUpdateAction) {
            setDraft(profile);
            setEditorOpen(true);
            return;
          }

          try {
            const effectiveProfile = await persistProfile(
              { ...profile, lastSyncLabel: createSyncLabel() },
              "sync",
            );
            setProfile(effectiveProfile);
            toast.success("Profil admin disinkronkan.");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Profil admin belum dapat disinkronkan.",
            );
          }
        }}
      >
        {isUpdateAction ? <PencilLine className="size-4" /> : null}
        {isSyncAction ? <RefreshCw className="size-4" /> : null}
        {label}
      </AppButton>
    );
  });

  async function handleSave() {
    if (!draft.name.trim() || !draft.email.trim()) {
      toast.error("Nama admin dan email wajib diisi.");
      return;
    }

    try {
      await persistProfile(
        {
          ...draft,
          name: draft.name.trim(),
          email: draft.email.trim(),
          coordination: draft.coordination.trim(),
          lastSyncLabel: createSyncLabel(),
        },
        "save",
      );
      setEditorOpen(false);
      toast.success("Profil Humas Admin diperbarui.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Profil Humas Admin belum dapat diperbarui.",
      );
    }
  }

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <AppCard padding="lg" className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
                Identitas akun
              </p>
              <AppCardTitle className="text-2xl">{profile.name}</AppCardTitle>
              <AppCardDescription className="max-w-none">
                Akun pengelola utama untuk katalog layanan, akun petugas, audit, dan operasional.
              </AppCardDescription>
            </div>
            <AppStatusBadge status={statusBadge.tone} label={statusBadge.label} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--radius-xl)] border border-border bg-surface-container-low p-4">
              <div className="flex items-center gap-3">
                <UserRound className="size-5 text-role-accent" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Nama admin
                  </p>
                  <p className="text-sm font-semibold text-foreground">{profile.name}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-border bg-surface-container-low p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-role-accent" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Peran
                  </p>
                  <p className="text-sm font-semibold text-foreground">{profile.role}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-border bg-surface-container-low p-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-role-accent" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Email internal
                  </p>
                  <p className="text-sm font-semibold text-foreground">{profile.email}</p>
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        <AppCard padding="lg" className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Audit akun
            </p>
            <AppCardTitle className="text-2xl">Status pengelolaan</AppCardTitle>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-3">
              <span className="text-muted-foreground">Status akun</span>
              <span className="font-semibold text-foreground">{profile.status}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-3">
              <span className="text-muted-foreground">Panel aktif</span>
              <span className="font-semibold text-foreground">{profile.modules.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-3">
              <span className="text-muted-foreground">Sinkron terakhir</span>
              <span className="font-semibold text-foreground">{profile.lastSyncLabel}</span>
            </div>
          </div>
        </AppCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <AppCard id="admin-profile-modules" padding="lg" className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Modul aktif
            </p>
            <AppCardTitle className="text-2xl">Cakupan pengelolaan</AppCardTitle>
            <AppCardDescription className="max-w-none">
              Modul berikut menjadi tanggung jawab utama Humas Admin pada portal layanan.
            </AppCardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.modules.map((moduleName) => (
              <span
                key={moduleName}
                className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-container-low px-3 text-xs font-semibold text-foreground"
              >
                {moduleName}
              </span>
            ))}
          </div>
        </AppCard>

        <AppCard padding="lg" className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
              Koordinasi
            </p>
            <AppCardTitle className="text-2xl">Catatan kerja</AppCardTitle>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface-container-low p-4">
            <div className="flex items-start gap-3">
              <BriefcaseBusiness className="mt-0.5 size-5 text-role-accent" />
              <p className="text-sm leading-6 text-muted-foreground">{profile.coordination}</p>
            </div>
          </div>
        </AppCard>
      </div>

      <MobileProfileLogoutSection description="Keluar dari sesi Humas Admin pada perangkat ini tanpa menambah tombol logout kedua di desktop." />

      <AppDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title="Perbarui Profil Humas Admin"
        description="Ubah identitas admin, email internal, dan catatan koordinasi dari popup agar tampilan profil tetap ringkas."
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <AdminEditorSection
            eyebrow="Profil admin"
            title="Data utama"
            description="Pastikan identitas akun dan email internal selalu sesuai."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField label="Nama admin" controlId="admin-profile-name">
                <AppInput
                  id="admin-profile-name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((currentValue) => ({ ...currentValue, name: event.target.value }))
                  }
                />
              </AdminFormField>
              <AdminFormField label="Email internal" controlId="admin-profile-email">
                <AppInput
                  id="admin-profile-email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((currentValue) => ({ ...currentValue, email: event.target.value }))
                  }
                />
              </AdminFormField>
            </div>
            <AdminFormField label="Catatan koordinasi" controlId="admin-profile-coordination">
              <AppTextarea
                id="admin-profile-coordination"
                rows={4}
                value={draft.coordination}
                onChange={(event) =>
                  setDraft((currentValue) => ({
                    ...currentValue,
                    coordination: event.target.value,
                  }))
                }
              />
            </AdminFormField>
          </AdminEditorSection>

          <div className="flex flex-wrap justify-end gap-3">
            <AppButton variant="outline" onClick={() => setEditorOpen(false)} disabled={pendingAction === "save"}>
              Batal
            </AppButton>
            <AppButton onClick={handleSave} loading={pendingAction === "save"}>
              Simpan Profil
            </AppButton>
          </div>
        </div>
      </AppDialog>
    </div>
  );
}
