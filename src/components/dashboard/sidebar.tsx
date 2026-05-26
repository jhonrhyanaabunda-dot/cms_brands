"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, FileText, Sparkles, Image as ImageIcon, Search, Calendar,
  Star, Globe2, Settings, Users, Car, Receipt, Layers, BarChart3, Tag, Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { can } from "@/lib/rbac";

export type SidebarCounts = Partial<Record<
  "content" | "scheduler" | "reviews" | "gbp" | "inventory" | "offers" | "media" | "workflows",
  number
>>;

type Item = { href: string; label: string; icon: any; perm?: Parameters<typeof can>[1]; countKey?: keyof SidebarCounts };

const SECTIONS: { title?: string; items: Item[] }[] = [
  {
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }],
  },
  {
    title: "Content",
    items: [
      { href: "/dashboard/content", label: "All content", icon: FileText, perm: "content.read", countKey: "content" },
      { href: "/dashboard/ai", label: "AI Studio", icon: Sparkles, perm: "ai.use" },
      { href: "/dashboard/pages", label: "Page builder", icon: Layers, perm: "content.create" },
      { href: "/dashboard/scheduler", label: "Scheduler", icon: Calendar, perm: "content.read", countKey: "scheduler" },
      { href: "/dashboard/workflows", label: "Workflows", icon: Workflow, perm: "content.update", countKey: "workflows" },
      { href: "/dashboard/media", label: "Media library", icon: ImageIcon, perm: "media.read", countKey: "media" },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/dashboard/seo", label: "SEO", icon: Search, perm: "seo.manage" },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, perm: "analytics.read" },
      { href: "/dashboard/reviews", label: "Reviews", icon: Star, perm: "reviews.manage", countKey: "reviews" },
      { href: "/dashboard/gbp", label: "GBP posts", icon: Globe2, perm: "content.read", countKey: "gbp" },
    ],
  },
  {
    title: "Automotive",
    items: [
      { href: "/dashboard/inventory", label: "Inventory", icon: Car, perm: "content.read", countKey: "inventory" },
      { href: "/dashboard/offers", label: "Lease offers", icon: Tag, perm: "content.read", countKey: "offers" },
      { href: "/dashboard/vin", label: "VIN tools", icon: Receipt, perm: "ai.use" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/dashboard/team", label: "Team", icon: Users, perm: "team.manage" },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, perm: "dealership.manage" },
    ],
  },
];

export function Sidebar({ role, counts }: { role: Role; accent?: string; counts?: SidebarCounts }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex h-full w-60 shrink-0 flex-col border-r bg-background">
      <Link href="/dashboard" className="flex items-center h-[68px] border-b px-5">
        <img src="/logo.png" alt="A3 Brands" className="h-9 w-auto" />
      </Link>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {SECTIONS.map((section, i) => {
          const items = section.items.filter((it) => !it.perm || can(role, it.perm));
          if (items.length === 0) return null;
          return (
            <div key={i} className="mb-4">
              {section.title && (
                <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = pathname === it.href || (it.href !== "/dashboard" && pathname.startsWith(it.href));
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300",
                          active && "text-brand-700 dark:text-brand-300 bg-brand-500/10"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand-500"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                          />
                        )}
                        <it.icon className="h-4 w-4" />
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.countKey && counts?.[it.countKey] != null && counts[it.countKey]! > 0 && (
                          <span
                            className={cn(
                              "inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                              active
                                ? "bg-brand-500/20 text-brand-700 dark:text-brand-300"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {counts[it.countKey]! > 99 ? "99+" : counts[it.countKey]}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t p-3 text-[10px] uppercase tracking-label text-muted-foreground">
        A3 CMS · v0.1 · {role.toLowerCase().replace("_", " ")}
      </div>
    </aside>
  );
}
