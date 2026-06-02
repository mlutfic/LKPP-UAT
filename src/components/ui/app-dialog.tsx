"use client";

import * as React from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-(--z-dialog) isolate flex items-center justify-center p-4">
      <button
        aria-label="Tutup dialog"
        className="absolute inset-0 z-0 bg-black/20 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-3xl)] bg-surface-container-lowest shadow-(--shadow-float)",
          className,
        )}
      >
        <div className="relative shrink-0 border-b border-border/60 px-6 pb-4 pt-6 md:px-8">
          <button
            aria-label="Tutup dialog"
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-surface-container-low"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
          <div className="space-y-2 pr-12">
            <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
              {title}
            </h2>
            {description ? (
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-6 md:px-8 md:pb-8">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
