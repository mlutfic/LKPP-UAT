import type { LegacyRoleFlow } from "@/content/legacy-flow/types";
import { publicAuthFlow } from "@/content/legacy-flow/public-auth-flow";

export const userFlow: LegacyRoleFlow = {
  role: "user",
  label: "Pengguna",
  loginEntry: "/login",
  dashboardEntry: "/dashboard",
  legacySources: publicAuthFlow.legacySources,
  summary:
    "Role pengguna membaca landing publik lalu bergerak ke login/register, booking layanan, daftar antrean, detail, bantuan, dan profil.",
  parityStatus: publicAuthFlow.parityStatus,
  featureFlows: publicAuthFlow.featureFlows.filter((feature) =>
    [
      "login-user",
      "register-user",
      "booking-user",
      "appointment-list",
      "appointment-detail",
      "profile-user",
      "help-user",
    ].includes(feature.key),
  ),
};
