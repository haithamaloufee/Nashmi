"use client";

import { useState } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";

export default function FollowButton({ partyId, initialFollowed = false }: { partyId: string; initialFollowed?: boolean }) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [loginOpen, setLoginOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/parties/${partyId}/follow`, { method: followed ? "DELETE" : "POST" });
      const json = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setLoginOpen(true);
        return;
      }
      if (!json.ok) {
        setMessage(json.error?.message || "تعذر تحديث المتابعة. حاول مرة أخرى.");
        return;
      }
      const nextFollowed = Boolean(json.data?.followed);
      setFollowed(nextFollowed);
      setMessage(nextFollowed ? "تمت المتابعة" : "تم إلغاء المتابعة");
    } catch {
      setMessage("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={toggle} disabled={loading} className="focus-ring rounded bg-civic px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-civic/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-200 dark:text-[#101820] dark:hover:bg-emerald-100" type="button" aria-busy={loading}>
        {followed ? <UserMinus className="ml-2 inline h-4 w-4" /> : <UserPlus className="ml-2 inline h-4 w-4" />}
        {loading ? "جار التحديث..." : followed ? "إلغاء المتابعة" : "متابعة"}
      </button>
      {message ? <span className="text-sm font-medium text-ink/60 dark:text-white/68">{message}</span> : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
