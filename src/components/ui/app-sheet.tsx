"use client";

import * as React from "react";
import { X } from "lucide-react";

export function AppSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-(--z-sheet) flex justify-end">
      <button
        aria-label="Tutup panel"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative h-full w-full max-w-md bg-surface-container-lowest p-6 shadow-(--shadow-float)">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading text-2xl font-bold tracking-tight">{title}</h2>
          <button
            aria-label="Tutup panel"
            className="inline-flex size-10 items-center justify-center rounded-full bg-surface-container-low"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
