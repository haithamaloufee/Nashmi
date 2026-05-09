"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, MessageSquare } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useToast } from "@/components/ui/ToastProvider";
import ReportButton from "@/components/reports/ReportButton";
import SafeImage from "@/components/ui/SafeImage";

const InlineModerationActions = dynamic(() => import("@/components/admin/InlineModerationActions"), { ssr: false });

type Author = {
  id?: string;
  name?: string;
  href?: string;
  avatarUrl?: string | null;
  image?: string | null;
  role?: string;
};

type Comment = {
  _id: string;
  content: string;
  createdAt?: string;
  author?: Author | null;
  authorUserId?: Author | string;
  pending?: boolean;
  failed?: boolean;
};

type Props = {
  targetType: "posts" | "polls";
  targetId: string;
  expanded: boolean;
  showModerationActions?: boolean;
  onCountChange?: (delta: number) => void;
};

function authorName(comment: Comment) {
  if (comment.author?.name) return comment.author.name;
  if (typeof comment.authorUserId === "object" && comment.authorUserId?.name) return comment.authorUserId.name;
  return "مستخدم نشمي";
}

function avatarText(comment: Comment) {
  return authorName(comment).trim().slice(0, 1) || "ن";
}

function authorProfile(comment: Comment) {
  if (comment.author?.href) return comment.author.href;
  if (comment.author?.id) return `/users/${comment.author.id}`;
  return null;
}

function avatarUrl(comment: Comment) {
  if (comment.author?.avatarUrl) return comment.author.avatarUrl;
  if (typeof comment.authorUserId === "object") return comment.authorUserId?.avatarUrl || comment.authorUserId?.image || null;
  return null;
}

function formatDate(value?: string) {
  if (!value) return "الآن";
  return new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CommentBox({ targetType, targetId, expanded, showModerationActions = false, onCountChange }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { showToast } = useToast();

  const loadComments = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "3" });
    if (cursor) params.set("cursor", cursor);
    try {
      const response = await fetch(`/api/${targetType}/${targetId}/comments?${params.toString()}`);
      const json = await response.json().catch(() => ({}));
      setLoading(false);
      setLoaded(true);
      if (!json.ok) {
        showToast(json.error?.message || "تعذر تحميل التعليقات", "error");
        return;
      }
      setComments((current) => (cursor ? [...current, ...(json.data.comments || [])] : json.data.comments || []));
      setNextCursor(json.nextCursor || null);
    } catch {
      setLoading(false);
      setLoaded(true);
      showToast("تعذر تحميل التعليقات", "error");
    }
  }, [showToast, targetId, targetType]);

  useEffect(() => {
    if (expanded && !loaded && !loading) void loadComments();
  }, [expanded, loaded, loading, loadComments]);

  async function submit() {
    const clean = content.trim();
    if (!clean || submitting) return;

    const optimistic: Comment = {
      _id: `pending-${Date.now()}`,
      content: clean,
      createdAt: new Date().toISOString(),
      authorUserId: { name: "أنت" },
      pending: true
    };
    setContent("");
    setSubmitting(true);
    setComments((current) => [optimistic, ...current]);
    onCountChange?.(1);

    try {
      const response = await fetch(`/api/${targetType}/${targetId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: clean })
      });
      const json = await response.json().catch(() => ({}));
      setSubmitting(false);

      if (response.status === 401) {
        setComments((current) => current.filter((item) => item._id !== optimistic._id));
        onCountChange?.(-1);
        setLoginOpen(true);
        return;
      }
      if (!json.ok) {
        setComments((current) => current.map((item) => (item._id === optimistic._id ? { ...item, pending: false, failed: true } : item)));
        onCountChange?.(-1);
        showToast(json.error?.message || "تعذر إضافة التعليق", "error");
        return;
      }

      setComments((current) => current.map((item) => (item._id === optimistic._id ? json.data.comment : item)));
      showToast("تمت إضافة التعليق", "success");
    } catch {
      setSubmitting(false);
      setComments((current) => current.map((item) => (item._id === optimistic._id ? { ...item, pending: false, failed: true } : item)));
      onCountChange?.(-1);
      showToast("تعذر الاتصال بالخادم", "error");
    }
  }

  if (!expanded) return null;

  return (
    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-11 flex-1 resize-y rounded border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          rows={2}
          maxLength={1000}
          placeholder="اكتب تعليقًا "
          aria-label="كتابة تعليق"
        />
        <button
          onClick={submit}
          disabled={!content.trim() || submitting}
          className="inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded bg-civic px-3 text-sm font-semibold text-white transition hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]"
          type="button"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          تعليق
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {loading && !comments.length ? (
          <div className="space-y-2">
            <div className="skeleton h-16 rounded" />
            <div className="skeleton h-16 rounded" />
          </div>
        ) : null}
        {loaded && comments.length === 0 ? <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">لا توجد تعليقات بعد. كن أول من يعلق.</p> : null}
        {comments.map((comment) => (
          <div key={comment._id} className={`rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100 ${comment.pending ? "opacity-75" : ""}`}>
            <div className="flex items-start gap-3">
              {authorProfile(comment) ? (
                <Link href={authorProfile(comment) || "#"} className="focus-ring shrink-0 rounded-full" aria-label={`فتح ملف ${authorName(comment)}`}>
                  <SafeImage
                    src={avatarUrl(comment)}
                    alt={authorName(comment)}
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-civic/15 dark:ring-emerald-200/25"
                    fallback={<div className="grid h-8 w-8 place-items-center rounded-full bg-civic/10 text-sm font-bold text-civic dark:bg-emerald-200/12 dark:text-emerald-100">{avatarText(comment)}</div>}
                    localPrefixes={["/uploads/avatars/", "/uploads/", "/images/"]}
                    sizes="32px"
                  />
                </Link>
              ) : (
                <SafeImage
                  src={avatarUrl(comment)}
                  alt={authorName(comment)}
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-civic/15 dark:ring-emerald-200/25"
                  fallback={<div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-civic/10 text-sm font-bold text-civic dark:bg-emerald-200/12 dark:text-emerald-100">{avatarText(comment)}</div>}
                  localPrefixes={["/uploads/avatars/", "/uploads/", "/images/"]}
                  sizes="32px"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {authorProfile(comment) ? (
                    <Link href={authorProfile(comment) || "#"} className="focus-ring rounded font-semibold text-slate-900 hover:text-civic hover:underline dark:text-white dark:hover:text-emerald-200">
                      {authorName(comment)}
                    </Link>
                  ) : (
                    <span className="font-semibold text-slate-900 dark:text-white">{authorName(comment)}</span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">{comment.pending ? "قيد الإرسال" : formatDate(comment.createdAt)}</span>
                  {comment.failed ? <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950/45 dark:text-red-200">فشل الإرسال</span> : null}
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm leading-7 text-slate-800 dark:text-slate-200">{comment.content}</p>
              </div>
              {!comment.pending ? (
                <div className="flex shrink-0 items-center gap-1">
                  {showModerationActions ? <InlineModerationActions targetType="comment" targetId={comment._id} /> : null}
                  <ReportButton targetType="comment" targetId={comment._id} compact />
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {nextCursor ? (
        <button
          type="button"
          onClick={() => loadComments(nextCursor)}
          disabled={loading}
          className="mt-3 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-civic transition hover:border-civic hover:bg-civic/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-200 dark:hover:border-emerald-300 dark:hover:bg-slate-800"
        >
          {loading ? "جار التحميل..." : "عرض المزيد من التعليقات"}
        </button>
      ) : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
