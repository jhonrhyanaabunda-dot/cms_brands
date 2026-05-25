import type { Role } from "@/lib/types";

export type Permission =
  | "content.read"
  | "content.create"
  | "content.update"
  | "content.delete"
  | "content.publish"
  | "content.approve"
  | "media.read"
  | "media.upload"
  | "media.delete"
  | "seo.manage"
  | "reviews.manage"
  | "reviews.reply"
  | "team.manage"
  | "dealership.manage"
  | "analytics.read"
  | "ai.use";

const ROLE_PERMS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "content.read", "content.create", "content.update", "content.delete", "content.publish", "content.approve",
    "media.read", "media.upload", "media.delete",
    "seo.manage", "reviews.manage", "reviews.reply",
    "team.manage", "dealership.manage", "analytics.read", "ai.use",
  ],
  ADMIN: [
    "content.read", "content.create", "content.update", "content.delete", "content.publish", "content.approve",
    "media.read", "media.upload", "media.delete",
    "seo.manage", "reviews.manage", "reviews.reply",
    "team.manage", "dealership.manage", "analytics.read", "ai.use",
  ],
  SEO_MANAGER: [
    "content.read", "content.create", "content.update", "content.publish",
    "media.read", "media.upload",
    "seo.manage", "analytics.read", "ai.use",
  ],
  CONTENT_MANAGER: [
    "content.read", "content.create", "content.update",
    "media.read", "media.upload",
    "analytics.read", "ai.use",
  ],
  DEALER_CLIENT: [
    "content.read", "content.approve",
    "media.read",
    "reviews.manage",
    "analytics.read",
  ],
  VIEWER: ["content.read", "media.read", "analytics.read"],
};

export function can(role: Role | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMS[role]?.includes(perm) ?? false;
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SEO_MANAGER: "SEO Manager",
  CONTENT_MANAGER: "Content Manager",
  DEALER_CLIENT: "Dealer Client",
  VIEWER: "Viewer",
};
