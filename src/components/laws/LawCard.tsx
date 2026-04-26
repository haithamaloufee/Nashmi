import Link from "next/link";
import { BookOpen } from "lucide-react";

type Law = {
  title: string;
  slug: string;
  category: string;
  shortDescription: string;
  lastVerifiedAt?: string | null;
};

export default function LawCard({ law }: { law: Law }) {
  return (
    <article className="card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm text-civic">
        <BookOpen className="h-4 w-4" />
        {law.category}
      </div>
      <h3 className="text-lg font-bold">{law.title}</h3>
      <p className="mt-3 line-clamp-3 leading-7 text-ink/70">{law.shortDescription}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-ink/55">{law.lastVerifiedAt ? `آخر تحقق: ${new Date(law.lastVerifiedAt).toLocaleDateString("ar-JO")}` : "بانتظار التحقق الدوري"}</span>
        <Link href={`/laws/${law.slug}`} className="rounded bg-civic px-4 py-2 text-sm font-semibold text-white">
          قراءة
        </Link>
      </div>
    </article>
  );
}
