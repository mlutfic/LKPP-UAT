import { AppBadge } from "@/components/ui/app-badge";

type AppStatus =
  | "aktif"
  | "menunggu"
  | "selesai"
  | "dipanggil"
  | "diproses"
  | "dijadwalkan"
  | "dibatalkan"
  | "tidak-hadir"
  | "warning"
  | "danger";

const toneMap: Record<AppStatus, Parameters<typeof AppBadge>[0]["tone"]> = {
  aktif: "role",
  menunggu: "warning",
  selesai: "success",
  dipanggil: "info",
  diproses: "default",
  dijadwalkan: "default",
  dibatalkan: "danger",
  "tidak-hadir": "warning",
  warning: "warning",
  danger: "danger",
};

export function AppStatusBadge({
  status,
  label,
  className,
}: {
  status: AppStatus;
  label?: string;
  className?: string;
}) {
  return (
    <AppBadge tone={toneMap[status]} className={className}>
      {label ?? status}
    </AppBadge>
  );
}
