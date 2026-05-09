import AuthorityProfile from "@/models/AuthorityProfile";
import Party from "@/models/Party";

type LeanObject = Record<string, any>;

export type PublisherSnapshot = {
  id?: string | null;
  name: string;
  type: "party" | "authority" | "user" | "admin" | "unknown";
  imageUrl: string | null;
  href: string | null;
  badge: string;
};

export const DEFAULT_AUTHORITY_LOGO = "/related/iec-logo.png";
export const DEFAULT_AUTHORITY_NAME = "الهيئة المستقلة للانتخاب";

function mediaUrl(value: unknown) {
  return value && typeof value === "object" && "url" in value && typeof (value as { url?: unknown }).url === "string"
    ? (value as { url: string }).url
    : null;
}

export function authorityLogo(authority: LeanObject | null | undefined) {
  return mediaUrl(authority?.logoMediaId) || (typeof authority?.logoUrl === "string" && authority.logoUrl) || DEFAULT_AUTHORITY_LOGO;
}

export function snapshotFromPost(post: LeanObject, authorityAuthor?: { name: string; logoUrl: string }): PublisherSnapshot {
  const party = typeof post.partyId === "object" && post.partyId ? post.partyId : null;
  const user = typeof post.authorUserId === "object" && post.authorUserId ? post.authorUserId : null;
  const existing = post.publisherSnapshot && typeof post.publisherSnapshot === "object" ? post.publisherSnapshot : null;

  if (party?.name) {
    return {
      id: party._id ? String(party._id) : existing?.id || null,
      name: party.name || existing?.name,
      type: "party",
      imageUrl: party.logoUrl || user?.avatarUrl || user?.image || existing?.imageUrl || null,
      href: party.slug ? `/parties/${party.slug}` : existing?.href || null,
      badge: existing?.badge || (party.isVerified ? "حزب موثق" : "حزب")
    };
  }

  if (post.authorType === "iec") {
    return {
      id: existing?.id || null,
      name: authorityAuthor?.name || existing?.name || user?.name || DEFAULT_AUTHORITY_NAME,
      type: "authority",
      imageUrl: authorityAuthor?.logoUrl || user?.avatarUrl || user?.image || existing?.imageUrl || DEFAULT_AUTHORITY_LOGO,
      href: "/iec",
      badge: existing?.badge || "هيئة"
    };
  }

  return {
    id: user?._id ? String(user._id) : existing?.id || null,
    name: existing?.name || user?.name || "مستخدم",
    type: post.authorType === "admin" ? "admin" : user ? "user" : "unknown",
    imageUrl: existing?.imageUrl || user?.avatarUrl || user?.image || null,
    href: existing?.href || (user?._id ? `/users/${String(user._id)}` : null),
    badge: existing?.badge || (post.authorType === "admin" ? "إدارة" : "مستخدم")
  };
}

export async function getAuthorityAuthor() {
  const authority = await AuthorityProfile.findOne({ slug: "independent-election-commission", status: "active" })
    .populate({ path: "logoMediaId", select: "url status" })
    .select("name logoUrl logoMediaId")
    .lean();
  return {
    name: authority?.name || DEFAULT_AUTHORITY_NAME,
    logoUrl: authorityLogo(authority as LeanObject | null)
  };
}

export async function buildPublisherSnapshot(input: {
  authorType: "party" | "iec" | "admin";
  partyId?: string | null;
  authorUser?: { id?: string; name?: string; avatarUrl?: string | null; image?: string | null } | null;
}) {
  if (input.authorType === "party" && input.partyId) {
    const party = await Party.findById(input.partyId).select("name slug logoUrl isVerified").lean();
    if (party) {
      return {
        id: String(party._id),
        name: party.name,
        type: "party" as const,
        imageUrl: party.logoUrl || input.authorUser?.avatarUrl || input.authorUser?.image || null,
        href: party.slug ? `/parties/${party.slug}` : null,
        badge: party.isVerified ? "حزب موثق" : "حزب"
      };
    }
  }

  if (input.authorType === "iec") {
    const authorityAuthor = await getAuthorityAuthor();
    return {
      id: null,
      name: authorityAuthor.name,
      type: "authority" as const,
      imageUrl: authorityAuthor.logoUrl,
      href: "/iec",
      badge: "هيئة"
    };
  }

  return {
    id: input.authorUser?.id || null,
    name: input.authorUser?.name || "إدارة",
    type: input.authorType === "admin" ? ("admin" as const) : ("unknown" as const),
    imageUrl: input.authorUser?.avatarUrl || input.authorUser?.image || null,
    href: input.authorUser?.id ? `/users/${input.authorUser.id}` : null,
    badge: "إدارة"
  };
}

export function attachPublisherSnapshots<T extends LeanObject>(items: T[], authorityAuthor: { name: string; logoUrl: string }) {
  return items.map((item) => ({ ...item, publisherSnapshot: snapshotFromPost(item, authorityAuthor) }));
}
