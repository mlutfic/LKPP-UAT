import { cn } from "@/lib/utils";

export function AppProgress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high",
        className,
      )}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-role-accent transition-[width] duration-300"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
