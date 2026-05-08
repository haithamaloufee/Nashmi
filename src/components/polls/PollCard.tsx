"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import PollVote from "@/components/polls/PollVote";
import ReportButton from "@/components/reports/ReportButton";
import CommentBox from "@/components/comments/CommentBox";
import ReactionButtons from "@/components/ui/ReactionButtons";
import InlineModerationActions from "@/components/admin/InlineModerationActions";
import ShareMenu from "@/components/ui/ShareMenu";
import SafeImage from "@/components/ui/SafeImage";

type Poll = {
  _id: string;
  question: string;
  description?: string | null;
  authorType?: string;
  authorUserId?: { name?: string; avatarUrl?: string | null; image?: string | null } | string;
  partyId?: { name?: string; slug?: string; logoUrl?: string | null; isVerified?: boolean } | string | null;
  authorityAuthor?: { name?: string; logoUrl?: string | null } | null;
  options: Array<{ _id: string; text: string; votesCount: number }>;
  totalVotes: number;
  likesCount: number;
  dislikesCount: number;
  commentsCount?: number;
  publishedAt?: string;
  createdAt?: string;
};

function relativeTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat("ar-JO", { numeric: "auto" });
  if (abs < 60) return formatter.format(diffSeconds, "second");
  if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), "hour");
  return new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium" }).format(date);
}

function authorInfo(poll: Poll) {
  const user = typeof poll.authorUserId === "object" ? poll.authorUserId : null;
  const party = typeof poll.partyId === "object" ? poll.partyId : null;
  if (party?.name) {
    return {
      name: party.name,
      image: party.logoUrl || user?.avatarUrl || user?.image || null,
      href: party.slug ? `/parties/${party.slug}` : null,
      type: party.isVerified ? "حزب موثق" : "حزب",
      fallback: party.name.slice(0, 1)
    };
  }
  if (poll.authorType === "iec") {
    return {
      name: poll.authorityAuthor?.name || user?.name || "الهيئة المستقلة للانتخاب",
      image: poll.authorityAuthor?.logoUrl || user?.avatarUrl || user?.image || "/related/iec-logo.png",
      href: "/iec",
      type: "هيئة",
      fallback: "هـ"
    };
  }
  return { name: user?.name || "مستخدم", image: user?.avatarUrl || user?.image || null, href: null, type: "مستخدم", fallback: "م" };
}

export default function PollCard({ poll, compact = false }: { poll: Poll; compact?: boolean }) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsCount, setCommentsCount] = useState(poll.commentsCount || 0);
  const author = useMemo(() => authorInfo(poll), [poll]);
  const avatar = (
    <SafeImage
      src={author.image}
      alt={author.name}
      className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-1 ring-line dark:bg-slate-900"
      fallback={<div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-civic/10 text-lg font-bold text-civic ring-1 ring-line">{author.fallback}</div>}
      localPrefixes={["/uploads/", "/images/", "/related/"]}
    />
  );

  return (
    <article className="card card-hover bg-white p-5 text-slate-900 dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {author.href ? (
            <Link href={author.href} className="focus-ring shrink-0 rounded-full">
              {avatar}
            </Link>
          ) : (
            avatar
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {author.href ? (
                <Link href={author.href} className="font-bold hover:text-civic hover:underline dark:hover:text-emerald-200">{author.name}</Link>
              ) : (
                <h3 className="font-bold">{author.name}</h3>
              )}
              <span className="rounded border border-civic/15 bg-civic/10 px-2 py-0.5 text-xs font-bold text-civic dark:border-emerald-200/30 dark:bg-emerald-200/12 dark:text-emerald-100">{author.type}</span>
              <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-bold text-clay dark:bg-amber-200/10 dark:text-amber-200">تصويت</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{relativeTime(poll.publishedAt || poll.createdAt)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InlineModerationActions targetType="poll" targetId={poll._id} />
          <ReportButton targetType="poll" targetId={poll._id} compact />
        </div>
      </div>

      <h3 className="text-lg font-bold leading-8 text-slate-950 dark:text-white">{poll.question}</h3>
      <PollVote poll={poll} />
      <div className="mt-4 flex items-center justify-between border-y border-slate-200 py-1 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>{commentsCount} تعليق</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ReactionButtons targetType="polls" targetId={poll._id} likesCount={poll.likesCount} dislikesCount={poll.dislikesCount} />
        {!compact ? (
          <button
            type="button"
            onClick={() => setCommentsExpanded((value) => !value)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-civic/10 hover:text-civic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic active:scale-95 dark:text-slate-300 dark:hover:bg-emerald-200/10 dark:hover:text-emerald-200"
            aria-expanded={commentsExpanded}
          >
            <MessageCircle className="h-4 w-4" />
            تعليق
          </button>
        ) : null}
        <ShareMenu url={`/updates?poll=${poll._id}`} title={poll.question} text={poll.description || poll.question} />
      </div>
      {!compact ? <CommentBox targetType="polls" targetId={poll._id} expanded={commentsExpanded} onCountChange={(delta) => setCommentsCount((value) => Math.max(0, value + delta))} /> : null}
    </article>
  );
}
