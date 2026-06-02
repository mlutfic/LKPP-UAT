import * as React from "react";

import { AppHeader } from "@/components/shell/app-header";
import { cn } from "@/lib/utils";

export function AuthShell({
  children,
  title,
  description,
  contentClassName,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  contentClassName?: string;
}) {
  return (
    <div
      data-role-theme="user"
      className="flex min-h-screen flex-col overflow-x-clip bg-[radial-gradient(circle_at_top_right,rgba(175,16,26,0.04),transparent_38%),linear-gradient(180deg,#ffffff_0%,#f3f4f6_100%)]"
    >
      <AppHeader variant="auth" />
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-8">
        <div className={cn("w-full max-w-xl space-y-6 sm:space-y-8", contentClassName)}>
          <div className="space-y-3 text-center">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground md:text-base">
              {description}
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
