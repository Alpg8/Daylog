import type { UserRole } from "@/lib/db/prisma-client";

export type Permission =
  | "read:all"
  | "write:all"
  | "read:own"
  | "write:own"
  | "manage:users";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: ["read:all", "write:all", "manage:users"],
  DISPATCHER: ["read:all", "write:own"],
  DRIVER: ["read:own", "write:own"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessAllData(role: UserRole): boolean {
  return hasPermission(role, "read:all");
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, "manage:users");
}
