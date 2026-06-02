import type { InternalPageKey, InternalRole, WorkspaceRow } from "@/features/internal/internal-workspace-config";
import {
  canStaffRolePerform,
  type StaffPermissionKey,
  type StaffPermissionSet,
} from "@/lib/internal-role-policy";

export type WorkspaceActionDescriptor = {
  label: string;
  tone?: "primary" | "secondary" | "passive";
};

export type WorkspaceActionLabel =
  | "Check-in"
  | "Scan QR"
  | "Siap ke Unit"
  | "Pantau Panggilan"
  | "Pantau Unit"
  | "Lihat Riwayat"
  | "Panggil"
  | "Panggil Ulang"
  | "Catatan"
  | "Menunggu Giliran"
  | "Melayani"
  | "Lewati Dulu"
  | "Selesaikan"
  | "Eskalasi"
  | "Ganti Layanan"
  | "Tunggu Check-in"
  | "Lihat Ringkasan";

const workspaceActionVocabulary: Record<
  WorkspaceActionLabel,
  WorkspaceActionDescriptor
> = {
  "Check-in": { label: "Check-in", tone: "primary" },
  "Scan QR": { label: "Scan QR", tone: "secondary" },
  "Siap ke Unit": { label: "Siap ke Unit", tone: "primary" },
  "Pantau Panggilan": { label: "Pantau Panggilan", tone: "secondary" },
  "Pantau Unit": { label: "Pantau Unit", tone: "secondary" },
  "Lihat Riwayat": { label: "Lihat Riwayat", tone: "passive" },
  "Panggil": { label: "Panggil", tone: "primary" },
  "Panggil Ulang": { label: "Panggil Ulang", tone: "primary" },
  "Catatan": { label: "Catatan", tone: "passive" },
  "Menunggu Giliran": { label: "Menunggu Giliran", tone: "secondary" },
  "Melayani": { label: "Melayani", tone: "primary" },
  "Lewati Dulu": { label: "Lewati Dulu", tone: "secondary" },
  "Selesaikan": { label: "Selesaikan", tone: "primary" },
  "Eskalasi": { label: "Eskalasi", tone: "secondary" },
  "Ganti Layanan": { label: "Ganti Layanan", tone: "passive" },
  "Tunggu Check-in": { label: "Tunggu Check-in", tone: "secondary" },
  "Lihat Ringkasan": { label: "Lihat Ringkasan", tone: "passive" },
};

function pickWorkspaceActions(
  ...labels: WorkspaceActionLabel[]
): WorkspaceActionDescriptor[] {
  return labels.map((label) => workspaceActionVocabulary[label]);
}

export function normalizeWorkspaceStatus(status: string) {
  return status.trim().toLowerCase();
}

function isLevel2OwnedWorkspaceRow(
  row: Pick<WorkspaceRow, "status"> & {
    isEscalated?: boolean;
    serviceLevel?: 1 | 2;
  },
) {
  const status = normalizeWorkspaceStatus(row.status);
  return (
    row.serviceLevel === 2 ||
    status.includes("level 2")
  );
}

function resolveStaffPermissionValue(
  role: InternalRole,
  permission: StaffPermissionKey,
  runtimePermissions?: Partial<StaffPermissionSet> | null,
) {
  if (typeof runtimePermissions?.[permission] === "boolean") {
    return runtimePermissions[permission];
  }

  return canStaffRolePerform(role, permission);
}

export function resolveWorkspaceStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("batal") || normalized.includes("dibatalkan")) {
    return "danger" as const;
  }
  if (normalized.includes("aktif") || normalized.includes("siap") || normalized.includes("hadir")) {
    return "aktif" as const;
  }
  if (
    normalized.includes("selesai") ||
    normalized.includes("stabil") ||
    normalized.includes("terkirim") ||
    normalized.includes("terverifikasi") ||
    normalized.includes("lengkap")
  ) {
    return "selesai" as const;
  }
  if (
    normalized.includes("review") ||
    normalized.includes("tinjau") ||
    normalized.includes("peringatan") ||
    normalized.includes("eskalasi") ||
    normalized.includes("dilewati") ||
    normalized.includes("tidak diproses") ||
    normalized.includes("tidak hadir") ||
    normalized.includes("tidak check-in") ||
    normalized.includes("menunggu")
  ) {
    return "warning" as const;
  }
  if (normalized.includes("dipanggil")) {
    return "dipanggil" as const;
  }
  if (normalized.includes("dilayani")) {
    return "aktif" as const;
  }
  if (normalized.includes("bahaya") || normalized.includes("kritis")) {
    return "danger" as const;
  }
  return "diproses" as const;
}

export function getWorkspaceRowActions(
  role: InternalRole,
  page: InternalPageKey,
  row: Pick<WorkspaceRow, "id" | "status"> & {
    callCount?: number;
    isEscalated?: boolean;
    isDeferred?: boolean;
    isRecalledDeferred?: boolean;
    serviceLevel?: 1 | 2;
  },
  nextReadyRowId?: string | null,
  runtimePermissions?: Partial<StaffPermissionSet> | null,
): WorkspaceActionDescriptor[] {
  const status = normalizeWorkspaceStatus(row.status);

  if (role === "resepsionis") {
    if (status.includes("belum check-in")) {
      return resolveStaffPermissionValue(role, "canCheckIn", runtimePermissions)
        ? pickWorkspaceActions("Check-in", "Scan QR")
        : [];
    }

    if (status.includes("sudah hadir")) {
      return resolveStaffPermissionValue(role, "canCallQueue", runtimePermissions)
        ? pickWorkspaceActions("Panggil", "Pantau Panggilan")
        : pickWorkspaceActions("Siap ke Unit", "Pantau Panggilan");
    }

    if (status.includes("dipanggil")) {
      return pickWorkspaceActions("Pantau Unit");
    }

    if (page === "riwayat") {
      return pickWorkspaceActions("Lihat Riwayat");
    }
  }

  if (role === "unit-organisasi") {
    if (page === "dashboard" || page === "data-antrean") {
      if (isLevel2OwnedWorkspaceRow(row)) {
        return [];
      }

      if (status.includes("siap dipanggil")) {
        if (!resolveStaffPermissionValue(role, "canCallQueue", runtimePermissions)) {
          return [];
        }

        if (row.isDeferred) {
          return pickWorkspaceActions("Panggil Ulang");
        }

        if (row.id === nextReadyRowId) {
          return pickWorkspaceActions("Panggil");
        }

        return [];
      }

      if (status.includes("dipanggil")) {
        const actions: WorkspaceActionDescriptor[] = [];
        const currentCallCount = Math.max(row.callCount ?? 0, 0);
        const canRecallQueue =
          resolveStaffPermissionValue(role, "canCallQueue", runtimePermissions) &&
          (currentCallCount < 3 || Boolean(row.isRecalledDeferred));
        if (canRecallQueue) {
          actions.push(
            row.isRecalledDeferred
              ? workspaceActionVocabulary.Panggil
              : workspaceActionVocabulary["Panggil Ulang"],
          );
        }
        if (resolveStaffPermissionValue(role, "canStartService", runtimePermissions)) {
          actions.push(workspaceActionVocabulary.Melayani);
        }
        if (
          resolveStaffPermissionValue(role, "canMarkNoShow", runtimePermissions) &&
          currentCallCount >= 3
        ) {
          actions.push(workspaceActionVocabulary["Lewati Dulu"]);
        }
        if (resolveStaffPermissionValue(role, "canAddStaffNote", runtimePermissions)) {
          actions.push(workspaceActionVocabulary.Catatan);
        }
        return actions;
      }

      if (status.includes("sedang dilayani")) {
        const actions: WorkspaceActionDescriptor[] = [];
        if (resolveStaffPermissionValue(role, "canStartService", runtimePermissions)) {
          actions.push(workspaceActionVocabulary.Selesaikan);
          actions.push(workspaceActionVocabulary.Eskalasi);
        }
        if (resolveStaffPermissionValue(role, "canAddStaffNote", runtimePermissions)) {
          actions.push(workspaceActionVocabulary.Catatan);
        }
        return actions;
      }

      if (status.includes("menunggu") || status.includes("belum check-in")) {
        return [];
      }

      if (status.includes("selesai")) {
        return [];
      }
    }
  }

  if (role === "petugas-level-2") {
    if (page === "dashboard" || page === "inbox-eskalasi") {
      if (status.includes("siap dipanggil") || status.includes("dipanggil")) {
        const actions: WorkspaceActionDescriptor[] = [];
        if (resolveStaffPermissionValue(role, "canStartService", runtimePermissions)) {
          actions.push(workspaceActionVocabulary.Melayani);
        }
        if (resolveStaffPermissionValue(role, "canAddStaffNote", runtimePermissions)) {
          actions.push(workspaceActionVocabulary.Catatan);
        }
        return actions;
      }

      if (status.includes("sedang dilayani")) {
        const actions: WorkspaceActionDescriptor[] = [];
        if (resolveStaffPermissionValue(role, "canStartService", runtimePermissions)) {
          actions.push(workspaceActionVocabulary.Selesaikan);
        }
        if (resolveStaffPermissionValue(role, "canAddStaffNote", runtimePermissions)) {
          actions.push(workspaceActionVocabulary.Catatan);
        }
        return actions;
      }
    }
  }

  return [];
}

export function getWorkspaceRowAssistText(
  role: InternalRole,
  page: InternalPageKey,
  row: Pick<WorkspaceRow, "id" | "status"> & {
    callCount?: number;
    isEscalated?: boolean;
    isDeferred?: boolean;
    serviceLevel?: 1 | 2;
  },
  nextReadyRowId?: string | null,
) {
  const status = normalizeWorkspaceStatus(row.status);

  if (role === "resepsionis") {
    if (status.includes("belum check-in")) {
      return "Frontdesk masih perlu konfirmasi kehadiran sebelum antrean masuk urutan unit.";
    }
    if (status.includes("sudah hadir")) {
      return "Tamu sudah selesai check-in dan tinggal menunggu panggilan dari unit.";
    }
    if (status.includes("dipanggil")) {
      return "Unit sudah mengambil alih antrean ini. Resepsionis tinggal memantau bila ada kendala.";
    }
  }

  if (role === "unit-organisasi" && (page === "dashboard" || page === "data-antrean")) {
    if (isLevel2OwnedWorkspaceRow(row)) {
      return "Antrean ini sudah menjadi tanggung jawab petugas level 2. Akun unit hanya menampilkan handoff dan riwayatnya.";
    }
    if (status.includes("siap dipanggil")) {
      if (row.isDeferred) {
        return row.id === nextReadyRowId
          ? "Antrean ini sempat dilewati sementara dan sekarang bisa dipanggil ulang setelah antrean aktif lain selesai."
          : "Antrean ini dilewati sementara setelah panggilan unit dan menunggu giliran panggil ulang di urutan akhir.";
      }
      return row.id === nextReadyRowId
        ? "Antrean ini menjadi kandidat panggilan berikutnya sesuai urutan siap panggil unit."
        : "Antrean sudah check-in dan berada di antrean siap panggil unit.";
    }
    if (status.includes("dipanggil")) {
      if (Math.max(row.callCount ?? 0, 0) >= 3) {
        return "Antrean sudah dipanggil 3 kali. Jika tamu belum hadir, lewati dulu agar unit melayani antrean berikutnya dan panggil ulang antrean ini nanti.";
      }
      return "Setelah panggilan pertama, unit bisa langsung mulai melayani jika tamu sudah hadir. Jika belum, gunakan panggil ulang atau lewati dulu.";
    }
    if (status.includes("sedang dilayani")) {
      return "Layanan sedang berjalan. Tutup dengan catatan minimum saat selesai.";
    }
    if (status.includes("menunggu") || status.includes("belum check-in")) {
      return "Unit belum bisa memproses sebelum frontdesk menyelesaikan check-in.";
    }
    if (status.includes("selesai")) {
      return "Layanan sudah ditutup dan tetap tersimpan di histori antrean unit.";
    }
  }

  if (role === "petugas-level-2" && (page === "dashboard" || page === "inbox-eskalasi")) {
    if (row.isEscalated) {
      return "Antrean ini diteruskan dari layanan level 1 dan siap dibaca oleh petugas level 2.";
    }
    if (status.includes("siap dipanggil") || status.includes("dipanggil")) {
      return "Petugas level 2 bisa langsung mulai menangani antrean ini begitu konteks eskalasinya sudah terbaca.";
    }
    if (status.includes("sedang dilayani")) {
      return "Layanan level 2 sedang berjalan. Pastikan penutupan meninggalkan catatan yang jelas.";
    }
    if (status.includes("selesai")) {
      return "Layanan level 2 sudah ditutup dan tetap tersimpan sebagai histori tindak lanjut eskalasi.";
    }
  }

  return null;
}
