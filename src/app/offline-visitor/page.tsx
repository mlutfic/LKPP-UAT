import type { Metadata } from "next";

import { OfflineVisitorPage } from "@/features/internal/components/offline-visitor-page";

export const metadata: Metadata = {
  title: "Daftar Walk-in",
};

export default function OfflineVisitorRoute() {
  return <OfflineVisitorPage />;
}
