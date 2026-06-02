"use client";

type ServiceCategoryFilterBarProps = {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
};

export function ServiceCategoryFilterBar({
  categories,
  activeCategory,
  onSelect,
}: ServiceCategoryFilterBarProps) {
  return (
    <div className="-mx-1 overflow-x-auto border-b border-border/70 px-1">
      <div className="inline-flex min-w-max items-center gap-5">
        {categories.map((label) => {
          const active = label === activeCategory;

          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(label)}
              className={`inline-flex min-h-11 items-center border-b-2 px-1 py-2 text-[0.92rem] font-medium whitespace-nowrap transition-colors ${
                active
                  ? "border-role-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
