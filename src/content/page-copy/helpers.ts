import { adminPageCopy } from "@/content/page-copy/admin";
import { monitoringPageCopy } from "@/content/page-copy/monitoring";
import type { PageCopyEntry } from "@/content/page-copy/types";
import { userPageCopy } from "@/content/page-copy/user";

const pageCopyEntries: PageCopyEntry[] = [
  ...userPageCopy,
  ...monitoringPageCopy,
  ...adminPageCopy,
];

export function getPageCopyByRoute(route: string) {
  return pageCopyEntries.find((entry) => entry.route === route);
}

