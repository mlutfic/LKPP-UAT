import Image from "next/image";
import Link from "next/link";

import { lkppBrand } from "@/design-system/site";
import { cn } from "@/lib/utils";

export function LogoLockup({
  compact = false,
  iconOnly = false,
  className,
}: {
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  if (iconOnly) {
    return (
      <Link
        href="/"
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-2xl border border-border bg-surface-container-lowest p-1.5 shadow-(--shadow-soft)",
          className,
        )}
      >
        <Image
          src={lkppBrand.logoUrl}
          alt="Logo LKPP"
          width={44}
          height={44}
          className="h-8 w-8 object-contain"
        />
      </Link>
    );
  }

  return (
    <Link href="/" className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src={lkppBrand.logoUrl}
        alt="Logo LKPP"
        width={164}
        height={48}
        className={cn("h-9 w-auto object-contain md:h-10", compact && "h-8 md:h-9")}
      />
      {!compact ? (
        <div className="hidden md:flex flex-col">
          <span className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-role-accent">
            {lkppBrand.shortName}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Portal layanan digital
          </span>
        </div>
      ) : null}
    </Link>
  );
}
