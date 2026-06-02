"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { AppInput } from "@/components/ui/app-input";
import { cn } from "@/lib/utils";

export type AppSearchSelectOption = {
  value: string;
  label: string;
  keywords?: string[];
};

export function AppSearchSelect({
  value,
  onValueChange,
  options,
  placeholder = "Pilih opsi",
  searchPlaceholder = "Cari...",
  emptyMessage = "Data tidak ditemukan.",
  disabled = false,
  className,
  id,
  describedById,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  describedById?: string;
}) {
  const generatedId = React.useId();
  const triggerId = id ?? `${generatedId}-trigger`;
  const listboxId = `${generatedId}-listbox`;
  const searchInputId = `${generatedId}-search`;
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [option.label, ...(option.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [options, query]);
  const activeOption = filteredOptions[activeIndex];

  React.useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    const selectedIndex = filteredOptions.findIndex(
      (option) => option.value === value,
    );
    setActiveIndex(
      selectedIndex >= 0 ? selectedIndex : Math.min(activeIndex, Math.max(filteredOptions.length - 1, 0)),
    );
  }, [activeIndex, filteredOptions, open, value]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (filteredOptions.length === 0) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex > filteredOptions.length - 1) {
      setActiveIndex(filteredOptions.length - 1);
    }
  }, [activeIndex, filteredOptions.length, open]);

  const closeMenu = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const selectOption = React.useCallback(
    (option: AppSearchSelectOption) => {
      onValueChange(option.value);
      closeMenu();
      triggerRef.current?.focus();
    },
    [closeMenu, onValueChange],
  );

  const moveActiveIndex = React.useCallback(
    (delta: number) => {
      if (filteredOptions.length === 0) {
        return;
      }

      setActiveIndex((currentValue) => {
        const nextIndex = (currentValue + delta + filteredOptions.length) % filteredOptions.length;
        return nextIndex;
      });
    },
    [filteredOptions.length],
  );

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
    }

    if (event.key === "Escape") {
      closeMenu();
      return;
    }

    if (event.key === "ArrowDown") {
      setOpen(true);
      setActiveIndex((currentValue) => {
        if (filteredOptions.length === 0) {
          return 0;
        }
        return currentValue >= filteredOptions.length - 1 ? 0 : currentValue + 1;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      setOpen(true);
      setActiveIndex((currentValue) => {
        if (filteredOptions.length === 0) {
          return 0;
        }
        return currentValue <= 0 ? filteredOptions.length - 1 : currentValue - 1;
      });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      setOpen((currentValue) => !currentValue);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveIndex(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(filteredOptions.length - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeOption) {
        selectOption(activeOption);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0", className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((currentValue) => !currentValue);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex h-11 min-w-0 w-full items-center justify-between gap-3 rounded-[var(--radius-2xl)] border border-input bg-surface-container-lowest px-4 text-left text-sm font-medium text-foreground transition-[border-color,box-shadow,background-color] duration-200 outline-none focus:border-role-accent focus:ring-4 focus:ring-role-accent-soft disabled:pointer-events-none disabled:opacity-50",
          open && "border-role-accent ring-4 ring-role-accent-soft",
        )}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-describedby={describedById}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selectedOption && "text-muted-foreground",
          )}
        >
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-(--z-popover)">
          <div className="overflow-hidden rounded-[calc(var(--radius-2xl)+2px)] border border-border bg-surface-container-lowest p-3 shadow-(--shadow-float)">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <AppInput
                id={searchInputId}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="h-11 rounded-[var(--radius-xl)] pl-11"
                autoFocus
                aria-label={searchPlaceholder}
              />
            </div>

            <div
              id={listboxId}
              role="listbox"
              aria-labelledby={id ? `${id}-label` : undefined}
              className="mt-3 max-h-[min(18rem,calc(100dvh-12rem))] overflow-auto overscroll-contain pr-1"
            >
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">{emptyMessage}</p>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((option, index) => {
                    const active = option.value === value;
                    const highlighted = index === activeIndex;

                    return (
                      <button
                        key={option.value}
                        id={`${listboxId}-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn(
                          "flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-xl)] px-3 py-2 text-left text-sm font-medium transition-colors outline-none",
                          highlighted && !active && "bg-surface-container-low",
                          active
                            ? "bg-role-accent-soft text-role-accent"
                            : "hover:bg-surface-container-low",
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => {
                          selectOption(option);
                        }}
                      >
                        <span className="min-w-0 flex-1 break-words leading-5">
                          {option.label}
                        </span>
                        {active ? <Check className="size-4 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
