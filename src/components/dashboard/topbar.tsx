"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { Sun, Moon, Search, ChevronsUpDown, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="flex h-[68px] items-center gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2 min-w-[220px]">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full ring-2 ring-background shadow-sm"
            style={{ backgroundColor: accent ?? "#1DB954" }}
            aria-hidden
          />
          <Select value={currentId} onValueChange={switchTenant}>
            <SelectTrigger className="h-8 gap-2">
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
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
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search content, pages, media…" className="h-8 pl-8" />
          </div>
        </div>

        <div className="flex-1" />

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
