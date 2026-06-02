"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

import { AppInput } from "./app-input";

type AppPasswordInputProps = Omit<React.ComponentProps<typeof AppInput>, "type"> & {
  toggleLabelShow?: string;
  toggleLabelHide?: string;
};

export function AppPasswordInput({
  className,
  toggleLabelShow = "Lihat password",
  toggleLabelHide = "Sembunyikan password",
  ...props
}: AppPasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <AppInput
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pl-11 pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-role-accent"
        aria-label={visible ? toggleLabelHide : toggleLabelShow}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
