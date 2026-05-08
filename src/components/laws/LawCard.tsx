import Link from "next/link";
import { BookOpen, PlayCircle } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";

type Law = {
  title: string;
  slug: string;
  category: string;
  shortDescription: string;
  thumbnailUrl?: string | null;
  youtubeVideoId?: string | null;
  lastVerifiedAt?: string | null;
};

export default function LawCard({ law }: { law: Law }) {
  return (
    <article className="card overflow-hidden">
      {law.thumbnailUrl ? (
        <div className="relative border-b border-line bg-slate-100">
          <SafeImage src={law.thumbnailUrl} alt={law.title} className="aspect-video w-full object-cover" fallback={<div className="grid aspect-video place-items-center text-sm text-ink/60">تعذر عرض الصورة</div>} localPrefixes={["/uploads/", "/images/", "/related/"]} />
          {law.youtubeVideoId ? <PlayCircle className="absolute left-3 top-3 h-8 w-8 rounded-full bg-white/90 p-1 text-red-600 shadow" /> : null}
        </div>
      ) : null}
      <div className="p-5">
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
      </div>
    </article>
  );
}
