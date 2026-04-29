"use client";

import { useEffect, useState } from "react";

const actionLabels = {
  hide: "إخفاء",
  delete: "حذف",
  restore: "استعادة",
  close: "إغلاق",
  dismiss_report: "رفض البلاغ"
} as const;

type TargetType = "post" | "poll" | "comment";
type ActionType = keyof typeof actionLabels;

const actionOptions: Record<TargetType, ActionType[]> = {
  post: ["hide", "delete"],
  poll: ["close", "hide", "delete"],
  comment: ["hide", "delete", "restore"]
};

let adminStatusPromise: Promise<boolean> | null = null;

async function fetchIsAdmin() {
  if (!adminStatusPromise) {
    adminStatusPromise = fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return false;
        const json = await response.json().catch(() => null);
        return Boolean(json?.data?.user?.role === "admin" || json?.data?.user?.role === "super_admin");
      })
      .catch(() => false);
  }
  return adminStatusPromise;
}

type Props = {
  targetType: TargetType;
  targetId: string;
};

export default function InlineModerationActions({ targetType, targetId }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchIsAdmin().then((value) => {
      if (active) setIsAdmin(value);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleAction(action: ActionType) {
    const confirmText: Record<ActionType, string> = {
      hide: "تأكيد إخفاء هذا المحتوى؟",
      delete: "تأكيد حذف هذا المحتوى؟ هذا الإجراء لا يمكن التراجع عنه.",
      restore: "تأكيد استعادة هذا المحتوى؟",
      close: "تأكيد إغلاق هذا التصويت؟",
      dismiss_report: "تأكيد رفض البلاغ؟"
    };
    if (!window.confirm(confirmText[action])) return;

    setLoading(true);
    setMessage(null);

    try {
      let response: Response;
      if (targetType === "comment") {
        response = await fetch(`/api/admin/comments/${targetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason: `${actionLabels[action]} إداري` })
        });
      } else if (targetType === "post") {
        if (action === "delete") {
          response = await fetch(`/api/posts/${targetId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "حذف إداري" })
          });
        } else {
          response = await fetch(`/api/posts/${targetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: action === "hide" ? "hidden" : undefined })
          });
        }
      } else {
        if (action === "delete") {
          response = await fetch(`/api/polls/${targetId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "حذف إداري" })
          });
        } else {
          response = await fetch(`/api/polls/${targetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: action === "close" ? "closed" : action === "hide" ? "hidden" : undefined })
          });
        }
      }

      const json = await response.json().catch(() => ({}));
      if (response.ok && json.ok) {
        setMessage("تم تنفيذ العملية بنجاح. سيُحدث العرض تلقائيًا بعد قليل.");
        window.setTimeout(() => window.location.reload(), 800);
      } else {
        setMessage(json.error?.message || "فشل تنفيذ العملية");
      }
    } catch {
      setMessage("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actionOptions[targetType].map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => handleAction(action)}
          disabled={loading}
          className="rounded border border-line bg-white px-3 py-1 text-xs text-ink hover:bg-ink/5 disabled:opacity-50"
        >
          {actionLabels[action]}
        </button>
      ))}
      {message ? <span className="text-xs text-ink/60">{message}</span> : null}
    </div>
  );
}
