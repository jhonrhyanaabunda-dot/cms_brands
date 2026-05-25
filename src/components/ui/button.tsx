"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// A3 design system — pill CTAs in emerald, ghost nav links, dark on-card buttons.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary A3 CTA: emerald pill with charcoal text + green glow
        default: [
          "rounded-pill font-semibold tracking-[0.015em]",
          "bg-[#1DB954] text-[#2C3038]",
          "shadow-floating hover:shadow-floating-lg",
          "hover:opacity-90 active:opacity-75",
        ].join(" "),
        // Same as default — explicit alias for marketing surfaces
        cta: [
          "rounded-pill font-semibold tracking-[0.015em]",
          "bg-[#1DB954] text-[#2C3038]",
          "shadow-floating hover:shadow-floating-lg",
          "hover:opacity-90 active:opacity-75",
        ].join(" "),
        // Alias kept for compatibility w/ older call sites; visually same as default
        gradient: [
          "rounded-pill font-semibold tracking-[0.015em]",
          "bg-[#1DB954] text-[#2C3038]",
          "shadow-floating hover:shadow-floating-lg",
          "hover:opacity-90 active:opacity-75",
        ].join(" "),
        destructive: "rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Inline outline button — used for "Preview", "Filter", etc.
        outline: "rounded-md border border-border bg-transparent hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400",
        secondary: "rounded-md bg-secondary text-secondary-foreground hover:bg-muted",
        // Ghost — used heavily for icon buttons + dropdowns
        ghost: "rounded-md hover:bg-accent hover:text-accent-foreground",
        // Nav link — A3 secondary nav style (no background, emerald hover)
        nav: "h-auto rounded-none px-2 py-1 text-foreground hover:text-brand-600 dark:hover:text-brand-400",
        link: "text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        // Default — compact for inline UI (40px). Use `lg` for true A3 CTAs.
        default: "h-10 px-5 text-sm",
        sm: "h-8 px-3 text-xs",
        // A3 marketing CTA: 48px tall, 24px+ horizontal padding
        lg: "h-12 px-7 text-sm",
        xl: "h-14 px-9 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
