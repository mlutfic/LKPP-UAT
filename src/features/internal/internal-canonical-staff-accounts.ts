import type {
  InternalStaffRole,
  LegacyStaffRoleValue,
} from "@/lib/internal-role-policy";

export type CanonicalInternalStaffAccount = {
  internalRole: InternalStaffRole;
  legacyRole: LegacyStaffRoleValue;
  loginName: string;
  displayName: string;
  unitId?: string;
  unitLabel?: string;
  pendingNote?: string;
};

export const CANONICAL_INTERNAL_STAFF_ACCOUNTS: readonly CanonicalInternalStaffAccount[] = [
  {
    internalRole: "resepsionis",
    legacyRole: "resepsionis",
    loginName: "resepsionis@lkpp.go.id",
    displayName: "Resepsionis LKPP",
  },
  {
    internalRole: "unit-organisasi",
    legacyRole: "akun_unit",
    loginName: "unit.d11@lkpp.go.id",
    displayName: "Unit Organisasi D11",
    unitId: "D11",
    unitLabel: "Direktorat Pengembangan Strategi dan Kebijakan Pengadaan Umum",
  },
  {
    internalRole: "petugas-level-2",
    legacyRole: "petugas_level2",
    loginName: "level2.d11@lkpp.go.id",
    displayName: "Petugas Level 2 D11",
    unitId: "D11",
    unitLabel: "Inbox eskalasi layanan lanjutan D11",
    pendingNote:
      "Menunggu migrasi schema role petugas level 2 di database legacy agar akun bisa diprovision live.",
  },
  {
    internalRole: "supervisor-monitoring",
    legacyRole: "supervisor_unit",
    loginName: "supervisor.d11@lkpp.go.id",
    displayName: "Supervisor D11",
    unitId: "D11",
    unitLabel: "Supervisor unit D11",
  },
  {
    internalRole: "humas-monitoring",
    legacyRole: "humas_monitoring",
    loginName: "monitoring.humas@lkpp.go.id",
    displayName: "Humas Monitoring LKPP",
  },
  {
    internalRole: "humas-admin",
    legacyRole: "humas_admin",
    loginName: "admin.humas@lkpp.go.id",
    displayName: "Humas Admin LKPP",
  },
] as const;

export const CANONICAL_INTERNAL_LOGIN_NAMES = new Set(
  CANONICAL_INTERNAL_STAFF_ACCOUNTS.map((item) => item.loginName),
);

export function getCanonicalInternalAccountByRole(role: InternalStaffRole) {
  return CANONICAL_INTERNAL_STAFF_ACCOUNTS.find((item) => item.internalRole === role) ?? null;
}

export function getCanonicalInternalAccountByLogin(loginName: string) {
  return CANONICAL_INTERNAL_STAFF_ACCOUNTS.find((item) => item.loginName === loginName) ?? null;
}
