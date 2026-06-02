"use client";

import * as React from "react";

import { AppButton } from "@/components/ui/app-button";
import { AppDialog } from "@/components/ui/app-dialog";

type AppButtonVariant = React.ComponentProps<typeof AppButton>["variant"];

export function AppConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  confirmVariant = "default",
  loading = false,
  onConfirm,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: AppButtonVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className={className}
    >
      <div className="space-y-6">
        {children ? <div className="space-y-3">{children}</div> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <AppButton variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </AppButton>
          <AppButton
            variant={confirmVariant}
            onClick={() => void onConfirm()}
            loading={loading}
            loadingLabel={confirmLabel}
          >
            {confirmLabel}
          </AppButton>
        </div>
      </div>
    </AppDialog>
  );
}
