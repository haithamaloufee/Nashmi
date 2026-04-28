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

export function requireAuth() {
  // This will be used in middleware or guards
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function requireRole(_allowedRoles?: Role[]) {
  // Guard function
}

export function requireAdmin() {
  return requireRole();
}

export function requireParty() {
  return requireRole(["party"]);
}

export function requireIEC() {
  return requireRole(["iec"]);
}

export function canEditParty(user: { role: Role; id: string }, party: { accountUserId?: string }) {
  if (isAdmin(user.role)) return true;
  if (user.role === "party" && party.accountUserId === user.id) return true;
  return false;
}

export function canModerateContent(user: { role: Role }) {
  return isAdmin(user.role);
}

export function canManageUser(user: { role: Role }, targetUser: { role: Role }) {
  if (user.role === "super_admin") return true;
  if (user.role === "admin" && targetUser.role !== "super_admin") return true;
  return false;
}

export function assertOwnParty() {
  // To be implemented with DB check
}
