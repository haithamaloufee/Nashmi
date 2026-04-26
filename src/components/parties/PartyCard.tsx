import Link from "next/link";
import { Users } from "lucide-react";

type Party = {
  _id: string;
  name: string;
  slug: string;
  shortDescription: string;
  followersCount: number;
  isVerified: boolean;
};

export default function PartyCard({ party }: { party: Party }) {
  return (
    <article className="card flex h-full flex-col p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded bg-civic/10 text-lg font-bold text-civic">{party.name.slice(0, 1)}</div>
        <div>
          <h3 className="font-bold">{party.name}</h3>
          {party.isVerified ? <span className="text-xs text-olive">حساب موثق</span> : null}
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
