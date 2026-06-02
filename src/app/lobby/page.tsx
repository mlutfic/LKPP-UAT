import type { Metadata } from "next";

import { LobbyCheckinPage } from "@/features/internal/components/lobby-checkin-page";

export const metadata: Metadata = {
  title: "Lobby Check-in",
};

export default function LobbyRoute() {
  return <LobbyCheckinPage />;
}
