"use client";

import * as React from "react";

export type ClientPageSize = 5 | 10 | 20 | "all";

export const CLIENT_PAGE_SIZE_OPTIONS: readonly ClientPageSize[] = [5, 10, 20, "all"];

export function useClientPagination<T>(
  items: T[],
  initialPageSize: ClientPageSize = 10,
) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSizeState] =
    React.useState<ClientPageSize>(initialPageSize);

  const totalItems = items.length;
  const totalPages =
    pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));

  React.useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageItems = React.useMemo(() => {
    if (pageSize === "all") {
      return items;
    }

    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, page, pageSize]);

  const startItem = totalItems === 0 ? 0 : pageSize === "all" ? 1 : (page - 1) * pageSize + 1;
  const endItem =
    totalItems === 0
      ? 0
      : pageSize === "all"
        ? totalItems
        : Math.min(page * pageSize, totalItems);

  function setPageSize(nextPageSize: ClientPageSize) {
    setPageSizeState(nextPageSize);
    setPage(1);
  }

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    startItem,
    endItem,
    pageItems,
  };
}
