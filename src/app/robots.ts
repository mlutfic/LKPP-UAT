import type { MetadataRoute } from "next";

import { getPublicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const { appUrl } = getPublicEnv();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/resepsionis/", "/unit/", "/supervisor/", "/humas-monitoring/", "/humas-admin/"],
    },
    sitemap: `${appUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
