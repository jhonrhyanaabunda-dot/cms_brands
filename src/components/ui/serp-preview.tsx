"use client";

import { cn } from "@/lib/utils";

// A Google-SERP-style card preview so authors can see how their
// metaTitle / metaDescription will appear on the results page.

export function SerpPreview({
  url,
  title,
  description,
  className,
}: {
  url?: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  const displayUrl = url || "yourdealership.com";
  const t = (title || "Untitled page").slice(0, 70);
  const d = (description || "No meta description yet — add one to control how this page appears on Google.").slice(0, 175);
  return (
    <div className={cn("rounded-lg border bg-background p-4", className)}>
      <div className="text-xs text-muted-foreground truncate">{displayUrl}</div>
      <div className="text-[#1a0dab] dark:text-blue-400 text-base font-medium mt-1 leading-tight">
        {t || <span className="text-muted-foreground italic">Title preview</span>}
      </div>
      <div className="text-sm text-muted-foreground mt-1 leading-snug">{d}</div>
    </div>
  );
}

export function CharCounter({
  value,
  max,
  label,
}: {
  value: string;
  max: number;
  label?: string;
}) {
  const len = (value ?? "").length;
  const over = len > max;
  const near = len > max * 0.9 && !over;
  return (
    <span className={cn(
      "text-[11px] tabular-nums",
      over ? "text-red-500" : near ? "text-amber-500" : "text-muted-foreground",
    )}>
      {label ? `${label} ` : ""}{len}/{max}
    </span>
  );
}
