"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Share2 } from "lucide-react";
import ReportButton from "@/components/reports/ReportButton";
import CommentBox from "@/components/comments/CommentBox";
import ReactionButtons from "@/components/ui/ReactionButtons";
import InlineModerationActions from "@/components/admin/InlineModerationActions";
import SafeImage from "@/components/ui/SafeImage";
import { useToast } from "@/components/ui/ToastProvider";

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
  mediaIds?: Array<Media | string>;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
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
  if (abs < 604800) return formatter.format(Math.round(diffSeconds / 86400), "day");
  return new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium" }).format(date);
}

function authorInfo(post: Post) {
  const user = typeof post.authorUserId === "object" ? post.authorUserId : null;
  const party = typeof post.partyId === "object" ? post.partyId : null;
  if (party?.name) {
    return {
      name: party.name,
      image: party.logoUrl || user?.avatarUrl || user?.image || null,
      badge: party.isVerified ? "حزب موثق" : "حزب",
      fallback: party.name.slice(0, 1)
    };
  }
  if (post.authorType === "iec") {
    return { name: user?.name || "الهيئة المستقلة للانتخاب", image: user?.avatarUrl || user?.image || null, badge: "جهة رسمية", fallback: "هـ" };
  }
  return { name: user?.name || "نشمي", image: user?.avatarUrl || user?.image || null, badge: post.authorType === "admin" ? "إدارة" : "ناشر", fallback: "ن" };
}

function mediaItems(post: Post) {
  return (post.mediaIds || []).filter((media): media is Media => typeof media === "object" && media.status !== "deleted" && Boolean(media.url));
}

export default function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  const [expandedText, setExpandedText] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const { showToast } = useToast();
  const author = useMemo(() => authorInfo(post), [post]);
  const media = useMemo(() => mediaItems(post), [post]);
  const isLong = post.content.length > 360;
  const text = isLong && !expandedText ? `${post.content.slice(0, 360)}...` : post.content;

  async function sharePost() {
    const url = `${window.location.origin}/updates?post=${post._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title || author.name, text: post.content.slice(0, 120), url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("تم نسخ رابط المنشور", "success");
      }
    } catch {
      showToast("تعذر مشاركة المنشور", "error");
    }
  }

  return (
    <article className="card card-hover overflow-visible p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <SafeImage
            src={author.image}
            alt={author.name}
            className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-1 ring-line"
            fallback={<div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-civic/10 text-lg font-bold text-civic">{author.fallback}</div>}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-bold text-ink">{author.name}</h3>
              <span className="rounded bg-civic/10 px-2 py-0.5 text-xs font-semibold text-civic">{author.badge}</span>
            </div>
            <p className="mt-1 text-xs text-ink/50">{relativeTime(post.publishedAt || post.createdAt)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InlineModerationActions targetType="post" targetId={post._id} />
          <ReportButton targetType="post" targetId={post._id} compact />
        </div>
      </div>

      {post.title ? <h4 className="mt-4 text-lg font-bold leading-8">{post.title}</h4> : null}
      <p className="mt-3 whitespace-pre-line leading-8 text-ink/82">{text}</p>
      {isLong ? (
        <button type="button" onClick={() => setExpandedText((value) => !value)} className="mt-1 text-sm font-semibold text-civic hover:underline">
          {expandedText ? "عرض أقل" : "عرض المزيد"}
        </button>
      ) : null}

      {post.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/65">
              #{tag.replace(/^#/, "")}
            </span>
          ))}
        </div>
      ) : null}

      {media.length ? (
        <div className={`mt-4 grid gap-2 overflow-hidden rounded border border-line bg-ink/5 ${media.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {media.slice(0, 4).map((item) =>
            item.type === "video" || item.mimeType?.startsWith("video/") ? (
              <video key={item._id || item.url} className="max-h-[520px] w-full bg-black object-contain" controls preload="metadata">
                <source src={item.url} type={item.mimeType || "video/mp4"} />
              </video>
            ) : (
              <SafeImage
                key={item._id || item.url}
                src={item.url}
                alt={post.title || "وسائط المنشور"}
                className="max-h-[520px] w-full object-cover"
                fallback={<div className="grid aspect-video place-items-center text-sm text-ink/50">تعذر عرض الصورة</div>}
              />
            )
          )}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-y border-line py-1 text-sm text-ink/55">
        <span>{commentsCount} تعليق</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ReactionButtons targetType="posts" targetId={post._id} likesCount={post.likesCount} dislikesCount={post.dislikesCount} />
        {!compact ? (
          <button
            type="button"
            onClick={() => setCommentsExpanded((value) => !value)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-civic/10 hover:text-civic active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            تعليق
          </button>
        ) : null}
        <button
          type="button"
          onClick={sharePost}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-civic/10 hover:text-civic active:scale-95"
        >
          <Share2 className="h-4 w-4" />
          مشاركة
        </button>
      </div>

      {!compact ? <CommentBox targetType="posts" targetId={post._id} expanded={commentsExpanded} onCountChange={(delta) => setCommentsCount((value) => Math.max(0, value + delta))} /> : null}
    </article>
  );
}
