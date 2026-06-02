import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InternalWorkspacePage } from "@/features/internal/components/internal-dashboard-page";
import { Level2ProfilePage } from "@/features/internal/components/level-2-profile-page";
import { Level2OperationsPage } from "@/features/internal/components/level-2-operations-page";
import { Level2SettingsPage } from "@/features/internal/components/level-2-settings-page";
import {
  getInternalFeatureKeys,
  getInternalPageConfig,
  isInternalFeatureKey,
} from "@/features/internal/internal-workspace-config";

type RouteParams = { feature: string };
type RouteProps = { params: Promise<RouteParams> };

export function generateStaticParams() {
  return getInternalFeatureKeys("petugas-level-2").map((feature) => ({ feature }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { feature } = await params;

  if (!isInternalFeatureKey("petugas-level-2", feature)) {
    return { title: "Halaman Tidak Ditemukan" };
  }

  const config = getInternalPageConfig("petugas-level-2", feature);
  return { title: config?.title ?? "Halaman Tidak Ditemukan" };
}

export default async function Level2FeatureRoute({ params }: RouteProps) {
  const { feature } = await params;

  if (!isInternalFeatureKey("petugas-level-2", feature)) {
    notFound();
  }

  if (feature === "inbox-eskalasi") {
    return <Level2OperationsPage />;
  }

  if (feature === "profil") {
    return <Level2ProfilePage />;
  }

  if (feature === "pengaturan") {
    return <Level2SettingsPage />;
  }

  return <InternalWorkspacePage role="petugas-level-2" page={feature} />;
}
