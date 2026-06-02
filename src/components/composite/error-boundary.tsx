"use client";

import * as React from "react";

import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";

type ErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("AppErrorBoundary", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <AppCard padding="lg" className="w-full max-w-lg space-y-4 text-center">
            <AppCardTitle>Terjadi kendala pada halaman</AppCardTitle>
            <AppCardDescription>
              Muat ulang halaman untuk mencoba lagi. Jika kendala berlanjut, hubungi admin
              layanan.
            </AppCardDescription>
            <AppButton size="lg" onClick={() => window.location.reload()}>
              Muat Ulang
            </AppButton>
          </AppCard>
        </div>
      );
    }

    return this.props.children;
  }
}
