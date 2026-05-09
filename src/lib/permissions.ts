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

export function normalizeOwnershipId(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    return String((value as { _id?: unknown; id?: unknown })._id ?? (value as { _id?: unknown; id?: unknown }).id ?? "");
  }
  return null;
}

export function isContentOwner(user: { role: string; id: string }, item: { authorUserId?: unknown; authorType?: string }) {
  if (user.role === "party" && item.authorType !== "party") return false;
  if (user.role === "iec" && item.authorType !== "iec") return false;
  if (user.role !== "party" && user.role !== "iec") return false;
  const ownerId = normalizeOwnershipId(item.authorUserId);
  return Boolean(ownerId && ownerId === user.id);
}

export function canEditOwnPost(user: { role: string; id: string }, post: { authorUserId?: unknown; authorType?: string }) {
  return isContentOwner(user, post);
}

export function canDeleteOwnPost(user: { role: string; id: string }, post: { authorUserId?: unknown; authorType?: string }) {
  return isContentOwner(user, post);
}

export function canEditOwnPoll(user: { role: string; id: string }, poll: { authorUserId?: unknown; authorType?: string }) {
  return isContentOwner(user, poll);
}

export function canDeleteOwnPoll(user: { role: string; id: string }, poll: { authorUserId?: unknown; authorType?: string }) {
  return isContentOwner(user, poll);
}

export function assertOwnParty() {
  // To be implemented with DB check
}
