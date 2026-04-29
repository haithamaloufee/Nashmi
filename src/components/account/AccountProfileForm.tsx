"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";
import type { SafeUser } from "@/lib/auth";

export default function AccountProfileForm({ user }: { user: SafeUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || user.image || "");
  const [message, setMessage] = useState("");
  const fallback = <div className="grid h-24 w-24 place-items-center rounded-full bg-civic/10 text-3xl font-bold text-civic">{name.slice(0, 1) || "م"}</div>;

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

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    const response = await fetch("/api/account/avatar", { method: "POST", body: form });
    const json = await response.json().catch(() => ({}));
    if (json.ok) {
      setAvatarUrl(json.data.user.avatarUrl || "");
      setMessage("تم تحديث الصورة الشخصية");
      router.refresh();
    } else {
      setMessage(json.error?.message || "تعذر رفع الصورة");
    }
  }

  return (
    <div className="card max-w-3xl space-y-5 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SafeImage src={avatarUrl} alt={name} className="h-24 w-24 rounded-full object-cover ring-1 ring-line" fallback={fallback} localPrefixes={["/uploads/avatars/", "/uploads/", "/images/"]} />
        <label className="block">
          <span className="mb-2 block font-semibold">الصورة الشخصية</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadAvatar(event.target.files?.[0] || null)} className="block text-sm" />
          <p className="mt-2 text-sm text-ink/60">الأنواع المسموحة: jpg, jpeg, png, webp. الرفع المحلي تجريبي فقط.</p>
        </label>
      </div>

      <label className="block">
        <span>الاسم</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border-line" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span>البريد الإلكتروني</span>
          <input value={user.email} readOnly className="mt-1 w-full rounded border-line bg-slate-50 text-ink/70" />
        </label>
        <label className="block">
          <span>الدور</span>
          <input value={user.role} readOnly className="mt-1 w-full rounded border-line bg-slate-50 text-ink/70" />
        </label>
      </div>
      <button type="button" onClick={saveProfile} className="rounded bg-civic px-4 py-2 font-semibold text-white">حفظ</button>
      {message ? <p className="text-sm text-ink/60">{message}</p> : null}
    </div>
  );
}
