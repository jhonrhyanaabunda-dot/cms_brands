import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// A3 badge — small caps, 4px radius, emerald dominant.
const badgeVariants = cva(
  "inline-flex items-center rounded-xs border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-label transition-colors",
  {
    variants: {
      variant: {
        // A3 "dealership badge" — solid emerald with white text
        default: "border-transparent bg-brand-500 text-white",
        // Outline emerald — used for status pills
        brand:   "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300",
        secondary: "border-transparent bg-muted text-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-brand-500/15 text-brand-700 dark:text-brand-300",
        warning: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
        danger:  "border-transparent bg-red-500/15 text-red-700 dark:text-red-300",
        info:    "border-transparent bg-charcoal-500/10 text-charcoal-500 dark:bg-white/10 dark:text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
