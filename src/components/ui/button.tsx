import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-xl)] border border-transparent text-sm font-semibold whitespace-nowrap transition-[transform,background-color,color,box-shadow,border-color,opacity] duration-200 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-(--shadow-soft) hover:brightness-105",
        outline:
          "border-border bg-surface-container-lowest text-foreground hover:bg-surface-container-low",
        secondary:
          "bg-surface-container-low text-foreground hover:bg-surface-container-high",
        ghost:
          "bg-transparent text-foreground hover:bg-surface-container-low",
        destructive:
          "bg-destructive text-white shadow-(--shadow-soft) hover:brightness-95 focus-visible:border-destructive/40 focus-visible:ring-destructive/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-5 text-sm",
        xs: "h-8 gap-1.5 px-3 text-xs",
        sm: "h-10 gap-2 px-4 text-sm",
        lg: "h-12 gap-2.5 px-6 text-base",
        icon: "size-11",
        "icon-xs": "size-8 rounded-xl [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-10 rounded-xl",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
