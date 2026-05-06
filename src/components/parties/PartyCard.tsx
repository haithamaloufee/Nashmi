import Link from "next/link";
import { Globe, Users } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import DelayedTooltipBadge from "@/components/ui/DelayedTooltipBadge";
import { normalizeSafeImageUrl } from "@/lib/imageUrls";

type Party = {
  _id: string;
  name: string;
  slug: string;
  shortDescription: string;
  followersCount: number;
  isVerified: boolean;
  logoUrl?: string | null;
  logoMediaId?: { url?: string | null; status?: string | null } | string | null;
  foundedYear?: number | null;
  statistics?: { branchesCount?: number | null };
  socialLinks?: { website?: string | null };
};

function getPartyLogoSrc(party: Party) {
  const mediaUrl = typeof party.logoMediaId === "object" && party.logoMediaId ? party.logoMediaId.url : null;
  return normalizeSafeImageUrl(mediaUrl, { localPrefixes: ["/images/", "/uploads/"] }) || normalizeSafeImageUrl(party.logoUrl, { localPrefixes: ["/images/"] });
}

export default function PartyCard({ party }: { party: Party }) {
  const fallback = <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-civic/10 text-lg font-bold text-civic">{party.name.slice(0, 1)}</div>;

  return (
    <article className="card flex h-full flex-col p-5">
      <div className="mb-4 flex items-center gap-3">
        <SafeImage src={getPartyLogoSrc(party)} alt={party.name} className="h-12 w-12 shrink-0 rounded object-contain ring-1 ring-line" fallback={fallback} />
        <div>
          <h3 className="font-bold">{party.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink/60">
            {party.isVerified ? (
              <DelayedTooltipBadge tooltip="حزب موثق على منصة نشمي اعتمادًا على البيانات الرسمية المتاحة." className="rounded-full border border-olive/20 bg-olive/10 px-2.5 py-1 font-bold text-olive shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-civic/25 dark:border-emerald-200/35 dark:bg-emerald-200/12 dark:text-emerald-100 dark:shadow-none">
                موثق
              </DelayedTooltipBadge>
            ) : null}
            {party.foundedYear ? <span className="rounded-full border border-line bg-slate-100 px-2.5 py-1 font-bold text-ink/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{party.foundedYear}</span> : null}
            {party.statistics?.branchesCount ? <span className="rounded-full border border-line bg-slate-100 px-2.5 py-1 font-bold text-ink/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{party.statistics.branchesCount} فرع</span> : null}
            {party.socialLinks?.website ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-civic/15 bg-civic/10 px-2.5 py-1 font-bold text-civic dark:border-emerald-200/30 dark:bg-emerald-200/12 dark:text-emerald-100">
                <Globe className="h-3.5 w-3.5" /> موقع
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <p className="line-clamp-3 flex-1 text-sm leading-7 text-ink/70">{party.shortDescription}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-ink/60">
          <Users className="ml-1 inline h-4 w-4" />
          {party.followersCount} متابع
        </span>
        <Link href={`/parties/${party.slug}`} className="rounded bg-civic px-4 py-2 text-sm font-semibold text-white">
          عرض
        </Link>
      </div>
    </article>
  );
}
