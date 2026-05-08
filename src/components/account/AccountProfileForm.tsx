"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MediaUploadField from "@/components/ui/MediaUploadField";
import type { SafeUser } from "@/lib/auth";

export default function AccountProfileForm({ user }: { user: SafeUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || user.image || "");
  const [message, setMessage] = useState("");

  async function saveProfile() {
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const json = await response.json().catch(() => ({}));
    setMessage(json.ok ? "تم حفظ الحساب" : json.error?.message || "تعذر حفظ الحساب");
    if (json.ok) router.refresh();
  }

  async function clearAvatar() {
    const response = await fetch("/api/account/avatar", { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (json.ok) {
      setAvatarUrl("");
      setMessage("تم حذف الصورة الشخصية");
      router.refresh();
    } else {
      setMessage(json.error?.message || "تعذر حذف الصورة");
    }
  }

  return (
    <div className="card max-w-3xl space-y-5 p-6">
      <MediaUploadField
        label="الصورة الشخصية"
        value={avatarUrl}
        endpoint="/api/account/avatar"
        fileField="avatar"
        purpose="avatar"
        rounded="full"
        fallbackText={name.slice(0, 1) || "م"}
        onUploaded={(asset) => {
          setAvatarUrl(asset.url);
          setMessage("تم تحديث الصورة الشخصية");
          router.refresh();
        }}
        onClear={clearAvatar}
      />

      <label className="block">
        <span>الاسم</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border-line" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span>البريد الإلكتروني</span>
          <input value={user.email} readOnly className="mt-1 w-full rounded border-line bg-slate-50 text-ink/70 dark:bg-slate-900 dark:text-slate-300" />
        </label>
        <label className="block">
          <span>الدور</span>
          <input value={user.role} readOnly className="mt-1 w-full rounded border-line bg-slate-50 text-ink/70 dark:bg-slate-900 dark:text-slate-300" />
        </label>
      </div>
      <button type="button" onClick={saveProfile} className="rounded bg-civic px-4 py-2 font-semibold text-white">حفظ</button>
      {message ? <p className="text-sm text-ink/60">{message}</p> : null}
    </div>
  );
}
