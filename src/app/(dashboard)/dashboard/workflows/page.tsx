import { requireTenant } from "@/lib/tenant";
import { Workflow as WorkflowIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { listWorkflows } from "@/server/workflows";
import { WorkflowsClient } from "./workflows-client";

export const metadata = { title: "Workflows" };

export default async function WorkflowsPage() {
  const tenant = await requireTenant();
  const items = await listWorkflows();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={WorkflowIcon}
        title="Workflows"
        description={`${items.length} workflow${items.length === 1 ? "" : "s"} · automate content, reviews, scheduling.`}
        actions={<WorkflowsClient.NewButton />}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflows yet"
          description="Pick a template to start: weekly GBP posts, monthly city pages, auto-reply to reviews, and more."
          action={<WorkflowsClient.NewButton />}
        />
      ) : (
        <WorkflowsClient.List initial={items.map((w) => ({
          id: w.id,
          name: w.name,
          template: w.template,
          triggerKind: w.triggerKind,
          enabled: w.enabled,
          lastRunAt: w.lastRunAt ? w.lastRunAt.toISOString() : null,
          nextRunAt: w.nextRunAt ? w.nextRunAt.toISOString() : null,
          lastStatus: w.lastStatus ?? null,
          trigger: w.trigger,
          config: w.config,
          totalRuns: w.totalRuns,
          totalTokens: w.totalTokens,
        }))} role={tenant.role} />
      )}
    </div>
  );
}
