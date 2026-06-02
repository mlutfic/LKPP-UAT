import * as React from "react";

import { AppHeader } from "@/components/shell/app-header";
import { PublicFooter } from "@/components/shell/public-footer";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-role-theme="user" className="min-h-screen bg-background">
      <AppHeader variant="public" ctaLabel="Masuk Pengguna" ctaHref="/login" />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
