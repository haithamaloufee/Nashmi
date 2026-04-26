export const roles = ["citizen", "party", "iec", "admin", "super_admin"] as const;
export type Role = (typeof roles)[number];

export const adminRoles: Role[] = ["admin", "super_admin"];
export const contentCreatorRoles: Role[] = ["party", "iec", "admin", "super_admin"];

export function isAdmin(role: string | null | undefined) {
  return role === "admin" || role === "super_admin";
}

export function canManageLaws(role: string | null | undefined) {
  return role === "iec" || role === "admin" || role === "super_admin";
}

export function authorTypeForRole(role: Role): "party" | "iec" | "admin" {
  if (role === "party") return "party";
  if (role === "iec") return "iec";
  return "admin";
}

export function canMutateStatus(status: string | null | undefined) {
  return status === "active";
}
