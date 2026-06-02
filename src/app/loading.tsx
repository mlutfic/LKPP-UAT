import { AppSkeleton } from "@/components/ui/app-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <AppSkeleton className="h-16 w-full rounded-[var(--radius-2xl)]" />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <AppSkeleton className="hidden h-[70vh] rounded-[var(--radius-3xl)] lg:block" />
        <div className="space-y-6">
          <AppSkeleton className="h-40 w-full rounded-[var(--radius-3xl)]" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AppSkeleton className="h-36 rounded-[var(--radius-3xl)]" />
            <AppSkeleton className="h-36 rounded-[var(--radius-3xl)]" />
            <AppSkeleton className="h-36 rounded-[var(--radius-3xl)]" />
          </div>
          <AppSkeleton className="h-72 w-full rounded-[var(--radius-3xl)]" />
        </div>
      </div>
    </div>
  );
}
