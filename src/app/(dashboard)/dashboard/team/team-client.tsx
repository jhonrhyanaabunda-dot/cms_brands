"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL } from "@/lib/rbac";
import type { Role } from "@/lib/types";
import { inviteMember, changeMemberRole, removeMember } from "@/server/team";

export type MemberRow = {
  id: string;
  userId: string;
  role: Role;
  name: string | null;
  email: string;
  createdAt: string;
};

const ROLES: Role[] = ["ADMIN", "SEO_MANAGER", "CONTENT_MANAGER", "DEALER_CLIENT", "VIEWER"];

export function TeamClient({ initial, currentUserId, currentRole }: {
  initial: MemberRow[];
  currentUserId: string;
  currentRole: Role;
}) {
  const router = useRouter();
  const canManage = currentRole === "SUPER_ADMIN" || currentRole === "ADMIN";
  const [inviting, setInviting] = useState(false);
  const [pending, start] = useTransition();

  function onRoleChange(m: MemberRow, role: Role) {
    if (m.role === role) return;
    start(async () => {
      try { await changeMemberRole(m.id, role); toast.success(`Updated role for ${m.email}`); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }
  function onRemove(m: MemberRow) {
    if (!confirm(`Remove ${m.name ?? m.email} from this workspace?`)) return;
    start(async () => {
      try { await removeMember(m.id); toast.success("Removed"); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button variant="gradient" onClick={() => setInviting(true)}>
            <Plus className="h-4 w-4" /> Invite member
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase text-muted-foreground border-b">
            <div className="col-span-6 sm:col-span-5">Member</div>
            <div className="col-span-3">Role</div>
            <div className="col-span-2 hidden sm:block text-right">Joined</div>
            <div className="col-span-3 sm:col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {initial.map((m) => {
              const initials = (m.name || m.email).split(/\s|@/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");
              const isSelf = m.userId === currentUserId;
              return (
                <div key={m.id} className="grid grid-cols-12 items-center px-4 py-3">
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.name || m.email}{isSelf && <span className="text-[10px] text-muted-foreground ml-2">(you)</span>}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    {canManage && !isSelf ? (
                      <select
                        value={m.role}
                        onChange={(e) => onRoleChange(m, e.target.value as Role)}
                        disabled={pending}
                        className="h-8 rounded-md border bg-transparent px-2 text-xs"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    ) : (
                      <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
                    )}
                  </div>
                  <div className="col-span-2 hidden sm:block text-right text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right">
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-accent text-muted-foreground" aria-label="Member actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-500 focus:text-red-500" onSelect={() => onRemove(m)}>
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {inviting && (
        <InviteDialog
          onClose={() => setInviting(false)}
          onInvited={() => { setInviting(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function InviteDialog({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("CONTENT_MANAGER");
  const [pending, start] = useTransition();

  function send() {
    start(async () => {
      const t = toast.loading("Sending invite…");
      try {
        await inviteMember({ email, name, role });
        toast.success(`Invited ${email}`, { id: t });
        onInvited();
      } catch (e: any) { toast.error(e?.message ?? "Failed", { id: t }); }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>They'll be added to this dealership with the chosen role. New users get a default password to start.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" onClick={send} disabled={pending || !email}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
