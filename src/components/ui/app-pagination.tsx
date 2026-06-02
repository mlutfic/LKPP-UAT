import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppButton } from "@/components/ui/app-button";
import { cn } from "@/lib/utils";

export type AppPaginationPageSize = 5 | 10 | 20 | "all";

export function AppPagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions = [5, 10, 20, "all"],
  onPageSizeChange,
  totalItems,
  startItem,
  endItem,
  itemLabel = "data",
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: AppPaginationPageSize;
  pageSizeOptions?: ReadonlyArray<AppPaginationPageSize>;
  onPageSizeChange?: (pageSize: AppPaginationPageSize) => void;
  totalItems?: number;
  startItem?: number;
  endItem?: number;
  itemLabel?: string;
}) {
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {typeof totalItems === "number"
            ? `Menampilkan ${startItem ?? 0}-${endItem ?? 0} dari ${totalItems} ${itemLabel}`
            : `Halaman ${page} dari ${totalPages}`}
        </p>
        {onPageSizeChange ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Tampilkan</span>
            {pageSizeOptions.map((option) => {
              const active = option === pageSize;
              return (
                <AppButton
                  key={String(option)}
                  type="button"
                  size="xs"
                  variant={active ? "default" : "outline"}
                  className={cn(!active && "bg-surface-container-lowest")}
                  onClick={() => onPageSizeChange(option)}
                >
                  {option === "all" ? "All" : option}
                </AppButton>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <AppButton
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoBack}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </AppButton>
        <AppButton
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoForward}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="size-4" />
        </AppButton>
      </div>
    </div>
  );
}
