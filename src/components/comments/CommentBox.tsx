"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import ReportButton from "@/components/reports/ReportButton";

type Comment = {
  _id: string;
  content: string;
  createdAt?: string;
};

export default function CommentBox({ targetType, targetId }: { targetType: "posts" | "polls"; targetId: string }) {
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    async function loadComments() {
      const response = await fetch(`/api/${targetType}/${targetId}/comments`, { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (json.ok) setComments(json.data.comments || []);
    }

    void loadComments();
  }, [targetType, targetId]);

  async function submit(formData: FormData) {
    const content = String(formData.get("content") || "");
    const response = await fetch(`/api/${targetType}/${targetId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    setMessage(json.ok ? "تمت إضافة التعليق" : json.error?.message || "تعذر إضافة التعليق");
    if (json.ok) {
      setComments((current) => [json.data.comment, ...current]);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <form action={submit} className="space-y-2">
        <textarea name="content" className="w-full rounded border-line text-sm" rows={3} maxLength={1000} placeholder="اكتب تعليقا محترما ومباشرا" />
        <button className="rounded border border-civic px-3 py-2 text-sm text-civic">
          <MessageSquare className="ml-1 inline h-4 w-4" />
          تعليق
        </button>
        {message ? <p className="text-sm text-ink/60">{message}</p> : null}
      </form>
      {comments.length ? (
        <div className="space-y-2 border-t border-line pt-3">
          {comments.map((comment) => (
            <div key={comment._id} className="rounded border border-line bg-white/70 p-3">
              <p className="whitespace-pre-line text-sm leading-7 text-ink/75">{comment.content}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-ink/45">{comment.createdAt ? new Date(comment.createdAt).toLocaleDateString("ar-JO") : ""}</span>
                <ReportButton targetType="comment" targetId={comment._id} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
