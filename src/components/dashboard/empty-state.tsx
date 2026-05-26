import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-10 text-center space-y-3">
      {Icon && (
        <div className="mx-auto h-10 w-10 rounded-full bg-brand-500/10 grid place-items-center text-brand-500">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-xs text-muted-foreground max-w-md mx-auto">{description}</div>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
