import type { MetadataRoute } from "next";

import { getPublicEnv } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const { appUrl } = getPublicEnv();
  const baseUrl = appUrl.replace(/\/$/, "");
  const now = new Date();

  const routes = [
    "/",
    "/login",
    "/login/petugas",
    "/register",
    "/layanan",
    "/panduan",
    "/bantuan",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
  }));
}
