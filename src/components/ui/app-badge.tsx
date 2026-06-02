import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full whitespace-nowrap px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
  {
    variants: {
      tone: {
        default: "bg-surface-container-low text-muted-foreground",
        role: "bg-role-badge text-role-accent-strong",
        success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
        info: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
        danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

type AppBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function AppBadge({ className, tone, ...props }: AppBadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
