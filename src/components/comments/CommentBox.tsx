"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useToast } from "@/components/ui/ToastProvider";
import ReportButton from "@/components/reports/ReportButton";
import InlineModerationActions from "@/components/admin/InlineModerationActions";

type Author = {
  name?: string;
  avatarUrl?: string | null;
  image?: string | null;
  role?: string;
};

type Comment = {
  _id: string;
  content: string;
  createdAt?: string;
  authorUserId?: Author | string;
  pending?: boolean;
  failed?: boolean;
};

type Props = {
  targetType: "posts" | "polls";
  targetId: string;
  expanded: boolean;
  onCountChange?: (delta: number) => void;
};

function authorName(comment: Comment) {
  if (typeof comment.authorUserId === "object" && comment.authorUserId?.name) return comment.authorUserId.name;
  return "مستخدم نشمي";
}

function avatarText(comment: Comment) {
  return authorName(comment).trim().slice(0, 1) || "ن";
}

function formatDate(value?: string) {
  if (!value) return "الآن";
  return new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CommentBox({ targetType, targetId, expanded, onCountChange }: Props) {
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
      const response = await fetch(`/api/${targetType}/${targetId}/comments?${params.toString()}`, { cache: "no-store" });
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
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-11 flex-1 resize-y rounded border-line text-sm focus:border-civic focus:ring-civic"
          rows={2}
          maxLength={1000}
          placeholder="اكتب تعليقًا محترمًا ومباشرًا"
        />
        <button
          onClick={submit}
          disabled={!content.trim() || submitting}
          className="inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded bg-civic px-3 text-sm font-semibold text-white transition hover:bg-civic/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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
        {loaded && comments.length === 0 ? <p className="rounded bg-paper/70 p-3 text-sm text-ink/60">لا توجد تعليقات بعد. كن أول من يعلق.</p> : null}
        {comments.map((comment) => (
          <div key={comment._id} className={`rounded border border-line bg-white/80 p-3 ${comment.pending ? "opacity-70" : ""}`}>
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-civic/10 text-sm font-bold text-civic">{avatarText(comment)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{authorName(comment)}</span>
                  <span className="text-xs text-ink/45">{comment.pending ? "قيد الإرسال" : formatDate(comment.createdAt)}</span>
                  {comment.failed ? <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">فشل الإرسال</span> : null}
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-7 text-ink/78">{comment.content}</p>
              </div>
              {!comment.pending ? (
                <div className="flex shrink-0 items-center gap-1">
                  <InlineModerationActions targetType="comment" targetId={comment._id} />
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
          className="mt-3 rounded border border-line px-3 py-2 text-sm font-semibold text-civic transition hover:border-civic hover:bg-civic/10 disabled:opacity-60"
        >
          {loading ? "جار التحميل..." : "عرض المزيد من التعليقات"}
        </button>
      ) : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
