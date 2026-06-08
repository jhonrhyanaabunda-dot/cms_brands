"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard, FileText, Sparkles, Layers, Calendar, Image as ImageIcon,
  Search as SearchIcon, BarChart3, Star, Globe2, Car, Tag, Receipt, Users, Settings,
  Plus, Workflow, Activity as ActivityIcon, Coins, Inbox,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  label: string;
  hint?: string;
  group: "Jump to" | "Create" | "Recent";
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  keywords?: string;
};

const NAV: Omit<Item, "group">[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { id: "content", label: "All content", icon: FileText, href: "/dashboard/content" },
  { id: "ai-studio", label: "AI Studio", icon: Sparkles, href: "/dashboard/ai" },
  { id: "page-builder", label: "Page builder", icon: Layers, href: "/dashboard/pages" },
  { id: "scheduler", label: "Scheduler", icon: Calendar, href: "/dashboard/scheduler" },
  { id: "workflows", label: "Workflows", icon: Workflow, href: "/dashboard/workflows" },
  { id: "media", label: "Media library", icon: ImageIcon, href: "/dashboard/media" },
  { id: "seo", label: "SEO", icon: SearchIcon, href: "/dashboard/seo" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { id: "ai-usage", label: "AI usage", icon: Coins, href: "/dashboard/ai/usage" },
  { id: "activity", label: "Activity log", icon: ActivityIcon, href: "/dashboard/activity" },
  { id: "reviews", label: "Reviews", icon: Star, href: "/dashboard/reviews" },
  { id: "leads", label: "Leads", icon: Inbox, href: "/dashboard/leads" },
  { id: "gbp", label: "GBP posts", icon: Globe2, href: "/dashboard/gbp" },
  { id: "inventory", label: "Inventory", icon: Car, href: "/dashboard/inventory" },
  { id: "offers", label: "Lease offers", icon: Tag, href: "/dashboard/offers" },
  { id: "vin", label: "VIN tools", icon: Receipt, href: "/dashboard/vin" },
  { id: "team", label: "Team", icon: Users, href: "/dashboard/team" },
  { id: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const CREATE: Omit<Item, "group">[] = [
  { id: "create-blog",     label: "Generate blog post",     icon: Sparkles, href: "/dashboard/ai?tab=blog",      hint: "AI Studio" },
  { id: "create-landing",  label: "Generate landing page",  icon: Sparkles, href: "/dashboard/ai?tab=landing",   hint: "AI Studio" },
  { id: "create-gbp",      label: "Draft GBP post",         icon: Globe2,   href: "/dashboard/ai?tab=gbp",       hint: "AI Studio" },
  { id: "create-page",     label: "New page (builder)",     icon: Layers,   href: "/dashboard/pages",            hint: "Builder" },
  { id: "create-workflow", label: "New automation workflow",icon: Workflow, href: "/dashboard/workflows",        hint: "Workflows" },
];

export function CommandPalette({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();

  function run(it: Omit<Item, "group">) {
    onOpenChange(false);
    if (it.href) router.push(it.href);
    else it.action?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="p-0 max-w-xl overflow-hidden">
        <Command className="[&_[cmdk-input]]:h-12 [&_[cmdk-input]]:w-full [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:px-4 [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:outline-none">
          <div className="flex items-center border-b px-3 gap-2">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
            <Command.Input placeholder="Type to search or jump to a section…" />
            <kbd className="hidden sm:inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
          </div>
          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nothing matches — try another keyword.
            </Command.Empty>

            <Command.Group heading="Jump to" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
              {NAV.map((it) => (
                <CmdItem key={it.id} item={it} onRun={run} />
              ))}
            </Command.Group>

            <Command.Group heading="Create" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
              {CREATE.map((it) => (
                <CmdItem key={it.id} item={it} onRun={run} />
              ))}
            </Command.Group>
          </Command.List>
          <div className="border-t px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span><kbd className="rounded border bg-muted px-1">↑↓</kbd> navigate</span>
            <span><kbd className="rounded border bg-muted px-1">↵</kbd> open</span>
            <span className="ml-auto">Powered by <kbd className="rounded border bg-muted px-1">⌘K</kbd></span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CmdItem({ item, onRun }: { item: Omit<Item, "group">; onRun: (it: Omit<Item, "group">) => void }) {
  const Icon = item.icon;
  return (
    <Command.Item
      value={`${item.label} ${item.hint ?? ""} ${item.keywords ?? ""}`}
      onSelect={() => onRun(item)}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm cursor-pointer",
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{item.label}</span>
      {item.hint && <span className="ml-auto text-[10px] text-muted-foreground">{item.hint}</span>}
    </Command.Item>
  );
}

/**
 * Globally listens for Cmd/Ctrl+K and toggles a single palette.
 */
export const COMMAND_PALETTE_EVENT = "a3:open-command-palette";

export function openCommandPalette() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(COMMAND_PALETTE_EVENT));
}

export function CommandPaletteRoot() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() { setOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener(COMMAND_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(COMMAND_PALETTE_EVENT, onOpen);
    };
  }, []);
  return <CommandPalette open={open} onOpenChange={setOpen} />;
}
