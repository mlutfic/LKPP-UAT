import type { Metadata } from "next";

import { FrontdeskProfilePage } from "@/features/internal/components/frontdesk-profile-page";

export const metadata: Metadata = {
  title: "Profil Resepsionis",
};

export default function ResepsionisProfileRoute() {
  return <FrontdeskProfilePage />;
}
