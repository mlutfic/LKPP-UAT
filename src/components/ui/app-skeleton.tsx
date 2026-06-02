import { cn } from "@/lib/utils";

export function AppSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-surface-container-high before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)] before:animate-[shimmer_1.8s_infinite]",
        className,
      )}
      {...props}
    />
  );
}
