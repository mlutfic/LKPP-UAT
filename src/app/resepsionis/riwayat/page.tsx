import type { Metadata } from "next";

import { FrontdeskHistoryPage } from "@/features/internal/components/frontdesk-history-page";

export const metadata: Metadata = {
  title: "Riwayat Resepsionis",
};

export default function ResepsionisHistoryRoute() {
  return <FrontdeskHistoryPage />;
}
