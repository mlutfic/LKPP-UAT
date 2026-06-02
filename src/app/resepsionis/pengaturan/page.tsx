import type { Metadata } from "next";

import { FrontdeskSettingsPage } from "@/features/internal/components/frontdesk-settings-page";

export const metadata: Metadata = {
  title: "Pengaturan Resepsionis",
};

export default function ResepsionisSettingsRoute() {
  return <FrontdeskSettingsPage />;
}
