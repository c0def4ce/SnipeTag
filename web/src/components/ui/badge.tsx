import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "cyan" | "lime" | "magenta" | "amber";
const variants: Record<Variant, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
  cyan: "border-[hsl(var(--cyan))]/40 bg-[hsl(var(--cyan))]/10 text-[hsl(var(--cyan))]",
  lime: "border-[hsl(var(--cyan))]/40 bg-[hsl(var(--cyan))]/10 text-[hsl(var(--cyan))]",
  magenta: "border-[hsl(var(--magenta))]/40 bg-[hsl(var(--magenta))]/10 text-[hsl(var(--magenta))]",
  amber: "border-[hsl(var(--amber-low))]/40 bg-[hsl(var(--amber-low))]/10 text-[hsl(var(--amber-low))]",
};

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", variants[variant], className)} {...props} />;
}
