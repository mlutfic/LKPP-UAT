import type { Metadata } from "next";

import { UserFeaturePage } from "@/features/user/components/user-feature-page";

export const metadata: Metadata = {
  title: "Jadwal Saya",
};

export default function UserSchedulesRoute() {
  return <UserFeaturePage page="jadwal-saya" />;
}
