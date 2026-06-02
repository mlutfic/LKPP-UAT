import type { Metadata } from "next";

import { ServiceSelectionPage } from "@/features/services/components/service-selection-page";

export const metadata: Metadata = {
  title: "Ambil Antrean",
};

export default function ServicesRoute() {
  return <ServiceSelectionPage />;
}
