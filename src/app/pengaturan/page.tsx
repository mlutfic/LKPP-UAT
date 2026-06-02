import type { Metadata } from "next";

import { UserFeaturePage } from "@/features/user/components/user-feature-page";

export const metadata: Metadata = {
  title: "Pengaturan",
};

export default function UserSettingsRoute() {
  return <UserFeaturePage page="pengaturan" />;
}
