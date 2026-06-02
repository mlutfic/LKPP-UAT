import type { Metadata } from "next";

import { UserFeaturePage } from "@/features/user/components/user-feature-page";

export const metadata: Metadata = {
  title: "Profil Pengguna",
};

export default function UserProfileRoute() {
  return <UserFeaturePage page="profil" />;
}
