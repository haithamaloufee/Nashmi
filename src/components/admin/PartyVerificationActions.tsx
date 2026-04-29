"use client";

import { useEffect, useState } from "react";

export default function PartyVerificationActions({ partyId, initialVerified }: { partyId: string; initialVerified: boolean }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return false;
        const json = await response.json().catch(() => null);
        return Boolean(json?.data?.user?.role === "admin" || json?.data?.user?.role === "super_admin");
      })
      .then((value) => {
        if (active) setIsAdmin(value);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggleVerification() {
    if (!window.confirm(`هل تريد ${isVerified ? "إلغاء توثيق" : "توثيق"} هذا الحزب؟`)) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/parties/${partyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !isVerified })
      });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json.ok) {
        setIsVerified(!isVerified);
        setMessage(isVerified ? "تم إلغاء التوثيق." : "تم توثيق الحزب.");
      } else {
        setMessage(json.error?.message || "فشل تحديث حالة التوثيق.");
      }
    } catch {
      setMessage("تعذّر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        onClick={toggleVerification}
        disabled={loading}
        className="inline-flex items-center justify-center rounded border border-civic bg-civic px-4 py-2 text-sm font-semibold text-white hover:bg-civic/90 disabled:opacity-50"
      >
        {isVerified ? "إلغاء توثيق الحزب" : "توثيق الحزب"}
      </button>
      {message ? <p className="text-sm text-ink/70">{message}</p> : null}
    </div>
  );
}
