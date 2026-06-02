"use client";

import * as React from "react";
import { Expand } from "lucide-react";
import QRCode from "react-qr-code";

import { AppDialog } from "@/components/ui/app-dialog";
import { formatQueueNumberForDisplay } from "@/lib/queue-number";

export function AppQrTicket({
  value,
  size = 88,
  label = "QR Check-in",
  subtle = false,
  dialogTitle = "QR Antrean",
  ticketNumber,
  hideLabel = false,
}: {
  value: string;
  size?: number;
  label?: string;
  subtle?: boolean;
  dialogTitle?: string;
  ticketNumber?: string;
  hideLabel?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const displayTicketNumber = formatQueueNumberForDisplay(ticketNumber);

  function openPreview(event: React.MouseEvent | React.KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Buka ${label}`}
        onClick={openPreview}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            openPreview(event);
          }
        }}
        className={`group inline-flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-xl)] border px-3 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-role-accent ${
          subtle
            ? "border-border bg-surface-container-lowest hover:bg-surface-container-low"
            : "border-border bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.18)] hover:bg-surface-container-lowest"
        }`}
      >
        <div className="relative rounded-[14px] bg-white p-2">
          <QRCode size={size} value={value} bgColor="#ffffff" fgColor="#161616" />
          <span className="absolute right-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-white/92 text-muted-foreground shadow-sm">
            <Expand className="size-3" />
          </span>
        </div>
        {!hideLabel ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
        ) : null}
      </div>

      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title={dialogTitle}
        description="Tunjukkan QR ini saat check-in di frontdesk."
      >
        <div className="flex flex-col items-center gap-5">
          <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.3)]">
            <QRCode size={280} value={value} bgColor="#ffffff" fgColor="#111111" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
            {displayTicketNumber ? (
              <p className="font-heading text-4xl font-bold tracking-[-0.04em] text-foreground">
                {displayTicketNumber}
              </p>
            ) : null}
          </div>
        </div>
      </AppDialog>
    </>
  );
}
