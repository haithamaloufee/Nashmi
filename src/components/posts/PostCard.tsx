"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MessageCircle, BadgeCheck, Globe, ThumbsUp, EllipsisVertical } from "lucide-react";
import PostMedia from "./PostMedia";
import ReportButton from "@/components/reports/ReportButton";
import ReactionButtons from "@/components/ui/ReactionButtons";
import SafeImage from "@/components/ui/SafeImage";
import ShareMenu from "@/components/ui/ShareMenu";
import DropdownMenu from "@/components/ui/DropdownMenu";
import DelayedTooltipBadge from "@/components/ui/DelayedTooltipBadge";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import HashtagText from "@/components/hashtags/HashtagText";
import { formatNumber, formatRelativeTime, normalizeHashtag } from "@/lib/localization";
import { useClientUser } from "@/lib/useClientUser";
import { canEditOwnPost } from "@/lib/permissions";

const CommentBox = dynamic(() => import("@/components/comments/CommentBox"), { ssr: false });
const InlineModerationActions = dynamic(() => import("@/components/admin/InlineModerationActions"), { ssr: false });
const OwnerContentMenu = dynamic(() => import("@/components/content/OwnerContentMenu"), { ssr: false });

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

export default function PostCard({ post, compact = false, showModerationActions = false, priorityMedia = false }: { post: Post; compact?: boolean; showModerationActions?: boolean; priorityMedia?: boolean }) {
  const { language, t } = useTranslation();
  const user = useClientUser();
  const [currentPost, setCurrentPost] = useState(post);
  const [deleted, setDeleted] = useState(false);
  const [expandedText, setExpandedText] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsStarted, setCommentsStarted] = useState(false);
  useEffect(() => { if (commentsExpanded) setCommentsStarted(true); }, [commentsExpanded]);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [reactionCounts, setReactionCounts] = useState({ like: post.likesCount || 0, dislike: post.dislikesCount || 0 });
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
      sizes="44px"
      className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-1 ring-line transition group-hover:scale-[1.03] group-hover:ring-civic/45 dark:bg-slate-900 dark:group-hover:ring-emerald-200/50"
      fallback={<div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-civic/10 text-lg font-bold text-civic ring-1 ring-line transition group-hover:scale-[1.03] group-hover:ring-civic/45 dark:group-hover:ring-emerald-200/50">{author.fallback}</div>}
      localPrefixes={["/uploads/", "/images/", "/related/"]}
    />
  );

  if (deleted) return null;

  return (
    <article className="card feed-card overflow-visible bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {author.href ? (
            <Link href={author.href} prefetch={false} className="focus-ring group shrink-0 cursor-pointer rounded-full" aria-label={`فتح صفحة ${author.name}`}>
              {avatar}
            </Link>
          ) : (
            <span className="shrink-0">{avatar}</span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {author.href ? (
                <Link href={author.href} prefetch={false} className="focus-ring min-w-0 cursor-pointer rounded text-ink hover:text-civic hover:underline dark:text-white dark:hover:text-emerald-200">
                  <h3 className="truncate font-bold">{author.name}</h3>
                </Link>
              ) : (
                <h3 className="truncate font-bold text-slate-900 dark:text-white">{author.name}</h3>
              )}
              {author.badgeTooltip ? <DelayedTooltipBadge tooltip={author.badgeTooltip} className="inline-flex rounded-full text-civic"><BadgeCheck aria-label={author.badge} className="h-4 w-4" /></DelayedTooltipBadge> : null}
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/60" data-visual-dynamic>{timeReady ? formatRelativeTime(currentPost.publishedAt || currentPost.createdAt, language) : ""}<span aria-hidden="true"> · </span><Globe aria-hidden="true" className="h-3 w-3" /></p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {user && canEditOwnPost(user, currentPost) ? <OwnerContentMenu type="post" item={currentPost} onUpdated={(updated) => setCurrentPost(updated)} onDeleted={() => setDeleted(true)} /> : null}
          {showModerationActions ? <InlineModerationActions targetType="post" targetId={currentPost._id} /> : null}
          <DropdownMenu keepMounted label={language === "ar" ? "خيارات المنشور" : "Post options"} trigger={<EllipsisVertical className="h-4 w-4" aria-hidden="true" />} triggerClassName="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm text-slate-600 hover:bg-civic/10 hover:text-civic dark:text-slate-300">
            <ReportButton targetType="post" targetId={currentPost._id} menuItem />
          </DropdownMenu>
        </div>
      </div>

      {currentPost.title ? <h4 className="mt-3 text-base font-semibold leading-7 text-slate-950 dark:text-white">{currentPost.title}</h4> : null}
      <p className={`mt-2 whitespace-pre-line break-words text-[15px] leading-7 text-slate-800 dark:text-slate-200 ${isLong && !expandedText ? "line-clamp-4" : ""}`}><HashtagText text={text} /></p>
      {isLong ? (
        <button type="button" onClick={() => setExpandedText((value) => !value)} aria-expanded={expandedText} className="focus-ring mt-1 min-h-11 rounded px-1 text-sm font-semibold text-civic hover:underline">
          {expandedText ? t("common.showLess") : t("common.showMore")}
        </button>
      ) : null}

      {currentPost.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {currentPost.tags.map((tag) => (
            <Link key={tag} href={`/hashtags/${encodeURIComponent(normalizeHashtag(tag))}`} prefetch={false} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-civic hover:underline dark:bg-slate-900 dark:text-slate-300 dark:hover:text-emerald-200">
              #{tag.replace(/^#/, "")}
            </Link>
          ))}
        </div>
      ) : null}

      {media.length ? <PostMedia media={media} title={currentPost.title || t("content.post")} priority={priorityMedia} /> : null}

      <div data-visual-counts className="mt-3 flex items-center justify-between gap-3 border-b border-line text-sm text-ink/60">
        <span className="inline-flex items-center gap-1.5 text-xs"><ThumbsUp aria-hidden="true" className="h-4 w-4 text-civic" />{formatNumber(reactionCounts.like + reactionCounts.dislike, language)} {t("social.reactions")}</span>
        <button type="button" onClick={() => setCommentsExpanded(value => !value)} aria-expanded={commentsExpanded} className="focus-ring min-h-11 rounded px-1 hover:underline">{formatNumber(commentsCount, language)} {t("comments.label")}</button>
      </div>

      <div className="mt-2 feed-actions">
        <ReactionButtons targetType="posts" targetId={currentPost._id} likesCount={currentPost.likesCount} dislikesCount={currentPost.dislikesCount} social onCountsChange={setReactionCounts} />
        {!compact ? (
          <button
            type="button"
            aria-controls={"comments-" + currentPost._id}
            onClick={() => setCommentsExpanded((value) => !value)}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-civic/10 hover:text-civic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic active:scale-95 dark:text-slate-300 dark:hover:bg-emerald-200/10 dark:hover:text-emerald-200"
            aria-expanded={commentsExpanded}
          >
            <MessageCircle className="h-4 w-4" />
            {t("comments.label")}
          </button>
        ) : null}
        <ShareMenu url={shareUrl} title={currentPost.title || author.name} text={currentPost.content.slice(0, 140)} />
      </div>

      {!compact && (commentsExpanded || commentsStarted) ? <CommentBox targetType="posts" targetId={currentPost._id} expanded={commentsExpanded} showModerationActions={showModerationActions} onCountChange={(delta) => setCommentsCount((value) => Math.max(0, value + delta))} /> : null}
    </article>
  );
}
