"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MediaUploadField from "@/components/ui/MediaUploadField";
import type { SafeUser } from "@/lib/auth";

export default function AccountProfileForm({ user }: { user: SafeUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || user.image || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
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
      <label className="block">
        <span>نبذة عني</span>
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={500}
          rows={4}
          placeholder="اكتب نبذة قصيرة عنك"
          className="mt-1 w-full resize-y rounded border-line bg-white text-slate-900 placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100"
        />
        <span className="mt-1 block text-xs text-ink/55">{bio.length}/500</span>
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
      <button type="button" onClick={saveProfile} disabled={saving || !name.trim() || bio.length > 500} className="rounded bg-civic px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? "جار الحفظ..." : "حفظ"}
      </button>
      {message ? <p className="text-sm text-ink/60">{message}</p> : null}
    </div>
  );
}
