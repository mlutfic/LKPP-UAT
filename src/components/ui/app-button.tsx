import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppButtonProps = React.ComponentProps<typeof Button> &
  VariantProps<typeof buttonVariants> & {
    fullWidth?: boolean;
    loading?: boolean;
    loadingLabel?: string;
  };

export function AppButton({
  className,
  fullWidth = false,
  loading = false,
  loadingLabel,
  size = "default",
  variant = "default",
  children,
  disabled,
  ...props
}: AppButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      disabled={disabled || loading}
      aria-busy={loading}
      data-loading={loading ? "true" : "false"}
      className={cn(fullWidth && "w-full", className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>{loadingLabel || children}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
