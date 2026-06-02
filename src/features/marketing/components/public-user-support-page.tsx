import { AppPageIntro } from "@/components/composite/app-page-intro";
import { PublicShell } from "@/components/shell/public-shell";
import { getPageCopyByRoute } from "@/content/page-copy";
import { userFeaturePageMeta } from "@/content/user-content";
import {
  UserGuidePage,
  UserHelpPage,
} from "@/features/user/components/user-feature-page";

type PublicUserSupportPageKey = "panduan" | "bantuan";

export function PublicUserSupportPage({
  page,
}: {
  page: PublicUserSupportPageKey;
}) {
  const meta = userFeaturePageMeta[page];
  const copy = getPageCopyByRoute(meta.currentPath);

  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="space-y-8">
          <AppPageIntro
            eyebrow={copy?.heroEyebrow ?? meta.eyebrow}
            title={copy?.heroTitle ?? meta.heroTitle}
            description={copy?.heroDescription ?? meta.heroDescription}
          />

          {page === "panduan" ? <UserGuidePage /> : null}
          {page === "bantuan" ? <UserHelpPage profile={null} /> : null}
        </div>
      </section>
    </PublicShell>
  );
}
