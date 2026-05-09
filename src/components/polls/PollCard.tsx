"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import PollVote from "@/components/polls/PollVote";
import ReportButton from "@/components/reports/ReportButton";
import ReactionButtons from "@/components/ui/ReactionButtons";
import ShareMenu from "@/components/ui/ShareMenu";
import SafeImage from "@/components/ui/SafeImage";
import OwnerContentMenu from "@/components/content/OwnerContentMenu";

const CommentBox = dynamic(() => import("@/components/comments/CommentBox"), { ssr: false });
const InlineModerationActions = dynamic(() => import("@/components/admin/InlineModerationActions"), { ssr: false });

type Poll = {
  _id: string;
  question: string;
  description?: string | null;
  authorType?: string;
  authorUserId?: { name?: string; avatarUrl?: string | null; image?: string | null } | string;
  partyId?: { name?: string; slug?: string; logoUrl?: string | null; isVerified?: boolean } | string | null;
  authorityAuthor?: { name?: string; logoUrl?: string | null } | null;
  publisherSnapshot?: { id?: string | null; name?: string | null; type?: string | null; imageUrl?: string | null; href?: string | null; badge?: string | null } | null;
  mediaIds?: Array<{ _id?: string; url: string; mimeType?: string; type?: "image" | "video" | "document"; status?: string } | string>;
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

function mediaItems(poll: Poll) {
  return (poll.mediaIds || []).filter((media): media is { _id?: string; url: string; mimeType?: string; type?: "image" | "video" | "document"; status?: string } => typeof media === "object" && media.status !== "deleted" && Boolean(media.url));
}

function authorInfo(poll: Poll) {
  if (poll.publisherSnapshot?.name) {
    return {
      name: poll.publisherSnapshot.name,
      image: poll.publisherSnapshot.imageUrl || null,
      href: poll.publisherSnapshot.href || null,
      type: poll.publisherSnapshot.badge || (poll.authorType === "iec" ? "هيئة" : "حزب"),
      fallback: poll.publisherSnapshot.name.slice(0, 1)
    };
  }
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

export default function PollCard({ poll, compact = false, showModerationActions = false }: { poll: Poll; compact?: boolean; showModerationActions?: boolean }) {
  const [currentPoll, setCurrentPoll] = useState(poll);
  const [deleted, setDeleted] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsCount, setCommentsCount] = useState(poll.commentsCount || 0);
  useEffect(() => {
    setCurrentPoll(poll);
    setDeleted(false);
    setCommentsCount(poll.commentsCount || 0);
  }, [poll]);
  const author = useMemo(() => authorInfo(currentPoll), [currentPoll]);
  const media = useMemo(() => mediaItems(currentPoll), [currentPoll]);
  const avatar = (
    <SafeImage
      src={author.image}
      alt={author.name}
      className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-1 ring-line dark:bg-slate-900"
      fallback={<div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-civic/10 text-lg font-bold text-civic ring-1 ring-line">{author.fallback}</div>}
      localPrefixes={["/uploads/", "/images/", "/related/"]}
    />
  );

  if (deleted) return null;

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
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{relativeTime(currentPoll.publishedAt || currentPoll.createdAt)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <OwnerContentMenu type="poll" item={currentPoll} onUpdated={(updated) => setCurrentPoll(updated)} onDeleted={() => setDeleted(true)} />
          {showModerationActions ? <InlineModerationActions targetType="poll" targetId={currentPoll._id} /> : null}
          <ReportButton targetType="poll" targetId={currentPoll._id} compact />
        </div>
      </div>

      <h3 className="text-lg font-bold leading-8 text-slate-950 dark:text-white">{currentPoll.question}</h3>
      {media.length ? (
        <div className={`mt-4 grid gap-2 overflow-hidden rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 ${media.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {media.slice(0, 4).map((item) =>
            item.type === "video" || item.mimeType?.startsWith("video/") ? (
              <video key={item._id || item.url} className="aspect-video max-h-[520px] w-full bg-black object-contain" controls preload="metadata">
                <source src={item.url} type={item.mimeType || "video/mp4"} />
              </video>
            ) : (
              <SafeImage
                key={item._id || item.url}
                src={item.url}
                alt={currentPoll.question || "وسائط التصويت"}
                className="aspect-video max-h-[520px] w-full bg-white object-contain p-3 dark:bg-slate-950"
                fallback={<div className="grid aspect-video place-items-center text-sm text-slate-500 dark:text-slate-400">تعذر عرض الصورة</div>}
                localPrefixes={["/uploads/", "/images/", "/related/"]}
              />
            )
          )}
        </div>
      ) : null}
      <PollVote poll={currentPoll} />
      <div className="mt-4 flex items-center justify-between border-y border-slate-200 py-1 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>{commentsCount} تعليق</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ReactionButtons targetType="polls" targetId={currentPoll._id} likesCount={currentPoll.likesCount} dislikesCount={currentPoll.dislikesCount} />
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
        <ShareMenu url={`/updates?poll=${currentPoll._id}`} title={currentPoll.question} text={currentPoll.description || currentPoll.question} />
      </div>
      {!compact ? <CommentBox targetType="polls" targetId={currentPoll._id} expanded={commentsExpanded} showModerationActions={showModerationActions} onCountChange={(delta) => setCommentsCount((value) => Math.max(0, value + delta))} /> : null}
    </article>
  );
}
