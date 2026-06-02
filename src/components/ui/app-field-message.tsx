import { cn } from "@/lib/utils";

export function AppFieldMessage({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  tone?: "default" | "error";
}) {
  return (
    <p
      className={cn(
        "text-xs leading-5",
        tone === "error" ? "font-medium text-destructive" : "text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
