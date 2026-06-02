import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const appCardVariants = cva(
  "rounded-[var(--radius-2xl)] bg-surface-container-lowest text-foreground transition-[transform,background-color,border-color,box-shadow] duration-300",
  {
    variants: {
      tone: {
        elevated: "border border-border",
        soft: "border border-transparent bg-surface-container-low",
        glass: "bg-white/85 shadow-(--shadow-card) backdrop-blur-xl",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
      },
    },
    defaultVariants: {
      tone: "elevated",
      padding: "md",
    },
  },
);

export type AppCardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof appCardVariants>;

export function AppCard({
  className,
  tone,
  padding,
  ...props
}: AppCardProps) {
  return (
    <section
      className={cn(appCardVariants({ tone, padding }), className)}
      {...props}
    />
  );
}

export function AppCardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function AppCardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-heading text-xl font-bold tracking-tight text-balance", className)}
      {...props}
    />
  );
}

export function AppCardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("max-w-prose text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}

export function AppCardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-4", className)} {...props} />;
}
