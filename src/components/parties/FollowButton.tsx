"use client";

import { useState } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";

export default function FollowButton({ partyId, initialFollowed = false }: { partyId: string; initialFollowed?: boolean }) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [loginOpen, setLoginOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    const response = await fetch(`/api/parties/${partyId}/follow`, { method: followed ? "DELETE" : "POST" });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    if (!json.ok) {
      setMessage(json.error?.message || "تعذر تحديث المتابعة");
      return;
    }
    const nextFollowed = Boolean(json.data?.followed);
    setFollowed(nextFollowed);
    setMessage(nextFollowed ? "تمت المتابعة" : "تم إلغاء المتابعة");
  }

  return (
    <>
      <button onClick={toggle} className="rounded bg-civic px-4 py-2 text-sm font-semibold text-white" type="button">
        {followed ? <UserMinus className="ml-2 inline h-4 w-4" /> : <UserPlus className="ml-2 inline h-4 w-4" />}
        {followed ? "إلغاء المتابعة" : "متابعة"}
      </button>
      {message ? <span className="text-sm text-ink/60">{message}</span> : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
