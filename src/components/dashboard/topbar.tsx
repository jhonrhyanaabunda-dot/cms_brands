"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { Sun, Moon, Search, ChevronsUpDown, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openCommandPalette } from "@/components/dashboard/command-palette";
import { MobileSidebarTrigger } from "@/components/dashboard/sidebar";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROLE_LABEL } from "@/lib/rbac";
import type { Role } from "@/lib/types";

type DealerOption = { id: string; name: string; slug: string; brand: string | null };

export function Topbar({
  role,
  dealerships,
  currentId,
  accent,
}: {
  role: Role;
  dealerships: DealerOption[];
  currentId: string;
  accent?: string;
}) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();

  // next-themes only knows the real theme on the client (it's read from
  // localStorage), so SSR always renders the default — which would mismatch
  // the user's actual theme and tear the hydration tree. Defer any
  // theme-dependent UI until after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function switchTenant(id: string) {
    await fetch("/api/tenant/switch", { method: "POST", body: JSON.stringify({ id }) });
    router.refresh();
  }

  const initials = (session?.user?.name || session?.user?.email || "U")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
      <div className="flex h-[68px] items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6">
        <MobileSidebarTrigger />
        <div className="flex items-center gap-2 min-w-0 md:min-w-[220px]">
          <span
            className="hidden sm:inline-block h-3.5 w-3.5 rounded-full ring-2 ring-background shadow-sm"
            style={{ backgroundColor: accent ?? "#1DB954" }}
            aria-hidden
          />
          <Select value={currentId} onValueChange={switchTenant}>
            <SelectTrigger className="h-8 gap-2 min-w-0">
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
              <SelectValue placeholder="Select dealership" />
            </SelectTrigger>
            <SelectContent>
              {dealerships.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-brand-500/10 text-[10px] font-semibold text-brand-600">
                      {d.name.charAt(0)}
                    </span>
                    {d.name}
                    {d.brand && <span className="text-[10px] text-muted-foreground">· {d.brand}</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 max-w-md hidden lg:block">
          <button
            type="button"
            onClick={openCommandPalette}
            className="group flex w-full items-center gap-2 h-8 rounded-md border bg-background/60 px-2.5 text-left text-xs text-muted-foreground hover:border-brand-500 hover:text-foreground transition-colors"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1">Search or jump to…</span>
            <kbd className="hidden md:inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">⌘K</kbd>
          </button>
        </div>

        <div className="flex-1" />

        {/* Mobile-only icon button for the command palette; full search box lives below at lg+ */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={openCommandPalette} aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          suppressHydrationWarning
        >
          {/* Stable Moon-shaped placeholder during SSR; the real icon
              swap happens after mount so SSR HTML and client HTML match. */}
          {!mounted ? (
            <Moon className="h-4 w-4 opacity-0" />
          ) : theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{session?.user?.name || "Account"}</div>
              <div className="text-xs text-muted-foreground">{session?.user?.email}</div>
              <div className="text-[10px] mt-1 text-muted-foreground">{ROLE_LABEL[role]}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <UserIcon className="h-4 w-4" /> Profile & settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
