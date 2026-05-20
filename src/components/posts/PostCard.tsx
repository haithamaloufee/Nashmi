"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import ReportButton from "@/components/reports/ReportButton";
import ReactionButtons from "@/components/ui/ReactionButtons";
import SafeImage from "@/components/ui/SafeImage";
import ShareMenu from "@/components/ui/ShareMenu";
import DelayedTooltipBadge from "@/components/ui/DelayedTooltipBadge";
import OwnerContentMenu from "@/components/content/OwnerContentMenu";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import HashtagText from "@/components/hashtags/HashtagText";
import { formatNumber, formatRelativeTime, normalizeHashtag } from "@/lib/localization";

const CommentBox = dynamic(() => import("@/components/comments/CommentBox"), { ssr: false });
const InlineModerationActions = dynamic(() => import("@/components/admin/InlineModerationActions"), { ssr: false });

type AuthorUser = {
  name?: string;
  avatarUrl?: string | null;
  image?: string | null;
  role?: string;
};

type PartyRef = {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  isVerified?: boolean;
};

type AuthorityAuthor = {
  name?: string;
  logoUrl?: string | null;
};

type Media = {
  _id?: string;
  url: string;
  mimeType?: string;
  type?: "image" | "video" | "document";
  status?: string;
};

type Post = {
  _id: string;
  title?: string | null;
  content: string;
  tags?: string[];
  authorType: string;
  authorUserId?: AuthorUser | string;
  partyId?: PartyRef | string | null;
  authorityAuthor?: AuthorityAuthor | null;
  publisherSnapshot?: { id?: string | null; name?: string | null; type?: string | null; imageUrl?: string | null; href?: string | null; badge?: string | null } | null;
  mediaIds?: Array<Media | string>;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  publishedAt?: string;
  createdAt?: string;
};

function authorInfo(post: Post, t: ReturnType<typeof useTranslation>["t"]) {
  if (post.publisherSnapshot?.name) {
    return {
      name: post.publisherSnapshot.name,
      image: post.publisherSnapshot.imageUrl || null,
      badge: post.publisherSnapshot.badge || (post.authorType === "iec" ? t("content.authority") : post.authorType === "party" ? t("content.officialAccount") : t("content.admin")),
      badgeTooltip: post.authorType === "iec" ? t("content.officialAccountTooltip") : "",
      href: post.publisherSnapshot.href || null,
      fallback: post.publisherSnapshot.name.slice(0, 1)
    };
  }
  const user = typeof post.authorUserId === "object" ? post.authorUserId : null;
  const party = typeof post.partyId === "object" ? post.partyId : null;
  if (party?.name) {
    return {
      name: party.name,
      image: party.logoUrl || user?.avatarUrl || user?.image || null,
      badge: party.isVerified ? t("party.verifiedParty") : t("content.officialAccount"),
      badgeTooltip: party.isVerified ? t("party.verifiedTooltip") : "",
      href: party.slug ? `/parties/${party.slug}` : null,
      fallback: party.name.slice(0, 1)
    };
  }
  if (post.authorType === "iec") {
    return {
      name: post.authorityAuthor?.name || user?.name || "الهيئة المستقلة للانتخاب",
      image: post.authorityAuthor?.logoUrl || user?.avatarUrl || user?.image || "/related/iec-logo.png",
      badge: t("content.authority"),
      badgeTooltip: t("content.officialAccountTooltip"),
      href: "/iec",
      fallback: "هـ"
    };
  }
  return {
    name: user?.name || t("content.user"),
    image: user?.avatarUrl || user?.image || null,
    badge: post.authorType === "admin" ? t("content.admin") : t("content.user"),
    badgeTooltip: "",
    href: null,
    fallback: (user?.name || "م").slice(0, 1)
  };
}

function mediaItems(post: Post) {
  return (post.mediaIds || []).filter((media): media is Media => typeof media === "object" && media.status !== "deleted" && Boolean(media.url));
}

export default function PostCard({ post, compact = false, showModerationActions = false }: { post: Post; compact?: boolean; showModerationActions?: boolean }) {
  const { language, t } = useTranslation();
  const [currentPost, setCurrentPost] = useState(post);
  const [deleted, setDeleted] = useState(false);
  const [expandedText, setExpandedText] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [timeReady, setTimeReady] = useState(false);
  useEffect(() => {
    setTimeReady(true);
  }, []);
  useEffect(() => {
    setCurrentPost(post);
    setDeleted(false);
    setCommentsCount(post.commentsCount || 0);
  }, [post]);
  const author = useMemo(() => authorInfo(currentPost, t), [currentPost, t]);
  const media = useMemo(() => mediaItems(currentPost), [currentPost]);
  const isLong = currentPost.content.length > 360;
  const text = isLong && !expandedText ? `${currentPost.content.slice(0, 360)}...` : currentPost.content;
  const shareUrl = `/updates?post=${currentPost._id}`;
  const avatar = (
    <SafeImage
      src={author.image}
      alt={author.name}
      className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-1 ring-line transition group-hover:scale-[1.03] group-hover:ring-civic/45 dark:bg-slate-900 dark:group-hover:ring-emerald-200/50"
      fallback={<div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-civic/10 text-lg font-bold text-civic ring-1 ring-line transition group-hover:scale-[1.03] group-hover:ring-civic/45 dark:group-hover:ring-emerald-200/50">{author.fallback}</div>}
      localPrefixes={["/uploads/", "/images/", "/related/"]}
    />
  );

  if (deleted) return null;

  return (
    <article className="card card-hover overflow-visible bg-white p-5 text-slate-900 dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {author.href ? (
            <Link href={author.href} className="focus-ring group shrink-0 cursor-pointer rounded-full" aria-label={`فتح صفحة ${author.name}`}>
              {avatar}
            </Link>
          ) : (
            <span className="shrink-0">{avatar}</span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {author.href ? (
                <Link href={author.href} className="focus-ring min-w-0 cursor-pointer rounded text-ink hover:text-civic hover:underline dark:text-white dark:hover:text-emerald-200">
                  <h3 className="truncate font-bold">{author.name}</h3>
                </Link>
              ) : (
                <h3 className="truncate font-bold text-slate-900 dark:text-white">{author.name}</h3>
              )}
              {author.badgeTooltip ? (
                <DelayedTooltipBadge tooltip={author.badgeTooltip} className="rounded border border-civic/15 bg-civic/10 px-2 py-0.5 text-xs font-bold text-civic outline-none ring-civic/20 focus-visible:ring-2 dark:border-emerald-200/30 dark:bg-emerald-200/12 dark:text-emerald-100">
                  {author.badge}
                </DelayedTooltipBadge>
              ) : (
                <span className="rounded border border-civic/15 bg-civic/10 px-2 py-0.5 text-xs font-bold text-civic dark:border-emerald-200/30 dark:bg-emerald-200/12 dark:text-emerald-100">{author.badge}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{timeReady ? formatRelativeTime(currentPost.publishedAt || currentPost.createdAt, language) : ""}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <OwnerContentMenu type="post" item={currentPost} onUpdated={(updated) => setCurrentPost(updated)} onDeleted={() => setDeleted(true)} />
          {showModerationActions ? <InlineModerationActions targetType="post" targetId={currentPost._id} /> : null}
          <ReportButton targetType="post" targetId={currentPost._id} compact />
        </div>
      </div>

      {currentPost.title ? <h4 className="mt-4 text-lg font-bold leading-8 text-slate-950 dark:text-white">{currentPost.title}</h4> : null}
      <p className="mt-3 whitespace-pre-line break-words leading-8 text-slate-800 dark:text-slate-200"><HashtagText text={text} /></p>
      {isLong ? (
        <button type="button" onClick={() => setExpandedText((value) => !value)} className="mt-1 text-sm font-semibold text-civic hover:underline">
          {expandedText ? t("common.showLess") : t("common.showMore")}
        </button>
      ) : null}

      {currentPost.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {currentPost.tags.map((tag) => (
            <Link key={tag} href={`/hashtags/${encodeURIComponent(normalizeHashtag(tag))}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-civic hover:underline dark:bg-slate-900 dark:text-slate-300 dark:hover:text-emerald-200">
              #{tag.replace(/^#/, "")}
            </Link>
          ))}
        </div>
      ) : null}

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
                alt={currentPost.title || t("content.post")}
                className="aspect-video max-h-[520px] w-full bg-white object-contain p-3 dark:bg-slate-950"
                fallback={<div className="grid aspect-video place-items-center text-sm text-slate-500 dark:text-slate-400">{t("common.error")}</div>}
                localPrefixes={["/uploads/", "/images/", "/related/"]}
              />
            )
          )}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-y border-slate-200 py-1 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>{formatNumber(commentsCount, language)} {t("comments.label")}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ReactionButtons targetType="posts" targetId={currentPost._id} likesCount={currentPost.likesCount} dislikesCount={currentPost.dislikesCount} />
        {!compact ? (
          <button
            type="button"
            onClick={() => setCommentsExpanded((value) => !value)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-civic/10 hover:text-civic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic active:scale-95 dark:text-slate-300 dark:hover:bg-emerald-200/10 dark:hover:text-emerald-200"
            aria-expanded={commentsExpanded}
          >
            <MessageCircle className="h-4 w-4" />
            {t("comments.label")}
          </button>
        ) : null}
        <ShareMenu url={shareUrl} title={currentPost.title || author.name} text={currentPost.content.slice(0, 140)} />
      </div>

      {!compact ? <CommentBox targetType="posts" targetId={currentPost._id} expanded={commentsExpanded} showModerationActions={showModerationActions} onCountChange={(delta) => setCommentsCount((value) => Math.max(0, value + delta))} /> : null}
    </article>
  );
}
