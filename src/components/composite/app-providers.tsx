"use client";

import * as React from "react";
import { Toaster } from "sonner";

import { AppErrorBoundary } from "@/components/composite/error-boundary";
import { QueryProvider } from "@/components/composite/query-provider";
import { AuthEmailCallbackBridge } from "@/features/auth/components/auth-email-callback-bridge";
import { ThemeProvider } from "@/components/composite/theme-provider";

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem
    >
      <QueryProvider>
        <AppErrorBoundary>
          {children}
          <AuthEmailCallbackBridge />
          <Toaster richColors position="top-right" />
        </AppErrorBoundary>
      </QueryProvider>
    </ThemeProvider>
  );
}
