import * as React from "react";

import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function AppAvatar({
  src,
  alt,
  name,
  size = "default",
  className,
}: {
  src?: string | null;
  alt?: string;
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "size-9 text-xs"
      : size === "lg"
        ? "size-14 text-base"
        : "size-11 text-sm";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-role-accent-soft font-semibold text-role-accent",
        sizeClass,
        className,
      )}
      aria-label={alt || name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt || name} className="size-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
