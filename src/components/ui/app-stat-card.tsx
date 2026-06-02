import type { LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { AppCard } from "@/components/ui/app-card";
import { cn } from "@/lib/utils";

const toneVariants = cva("", {
  variants: {
    tone: {
      role: "before:bg-role-accent",
      neutral: "before:bg-role-accent/28",
      info: "before:bg-role-accent/42",
      warning: "before:bg-role-accent/58",
      success: "before:bg-role-accent/72",
      danger: "before:bg-role-accent-strong",
    },
  },
  defaultVariants: {
    tone: "role",
  },
});

type AppStatCardProps = VariantProps<typeof toneVariants> & {
  label: string;
  value: string | number;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  className?: string;
};

export function AppStatCard({
  label,
  value,
  description,
  eyebrow,
  icon: Icon,
  tone,
  className,
}: AppStatCardProps) {
  return (
    <AppCard
      padding="md"
      className={cn(
        "relative overflow-hidden before:absolute before:left-6 before:top-5 before:h-1.5 before:w-10 before:rounded-full",
        toneVariants({ tone }),
        className,
      )}
    >
      <div className="space-y-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
          </div>
          {Icon ? (
            <div className="flex size-11 items-center justify-center rounded-2xl bg-surface-container-low text-role-accent">
              <Icon className="size-4" />
            </div>
          ) : null}
        </div>
        <p className="font-heading text-3xl font-bold tracking-tight md:text-4xl">{value}</p>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
    </AppCard>
  );
}
