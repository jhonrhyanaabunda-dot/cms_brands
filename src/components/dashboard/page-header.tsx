import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
          <span className="truncate">{title}</span>
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 items-center">{actions}</div>}
    </div>
  );
}
