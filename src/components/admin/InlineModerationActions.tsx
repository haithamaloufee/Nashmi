"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import DropdownMenu from "@/components/ui/DropdownMenu";
import { useToast } from "@/components/ui/ToastProvider";

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
  const [done, setDone] = useState(false);
  const { showToast } = useToast();

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
        setDone(true);
        showToast("تم تنفيذ العملية بنجاح", "success");
      } else {
        showToast(json.error?.message || "فشل تنفيذ العملية", "error");
      }
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin || done) return null;

  return (
    <DropdownMenu label="إجراءات الإدارة" trigger={<MoreHorizontal className="h-4 w-4" />}>
      {actionOptions[targetType].map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => handleAction(action)}
          disabled={loading}
          className={`block w-full rounded px-3 py-2 text-right text-sm transition hover:bg-ink/5 disabled:opacity-50 ${
            action === "delete" ? "text-red-700 hover:bg-red-50" : "text-ink"
          }`}
        >
          {actionLabels[action]}
        </button>
      ))}
    </DropdownMenu>
  );
}
