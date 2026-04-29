"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";
import type { SafeUser } from "@/lib/auth";

function dashboardHref(role: SafeUser["role"]) {
  if (role === "party") return "/party-dashboard";
  if (role === "iec") return "/iec-dashboard";
  if (role === "admin" || role === "super_admin") return "/admin";
  return "/account";
}

export default function UserMenu({ user }: { user: SafeUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const avatarSrc = user.avatarUrl || user.image;
  const fallback = <span className="grid h-9 w-9 place-items-center rounded-full bg-civic/10 text-sm font-bold text-civic">{user.name.slice(0, 1)}</span>;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full border border-line bg-white px-2 py-1.5 hover:border-civic" aria-expanded={open}>
        <SafeImage src={avatarSrc} alt={user.name} className="h-9 w-9 rounded-full object-cover" fallback={fallback} localPrefixes={["/uploads/avatars/", "/uploads/", "/images/"]} />
        <span className="hidden max-w-32 truncate text-sm text-ink/70 md:inline">{user.name}</span>
      </button>
      {open ? (
        <div className="absolute left-0 mt-2 w-48 rounded border border-line bg-white p-2 text-sm shadow-lg">
          <Link href="/account" className="flex items-center gap-2 rounded px-3 py-2 hover:bg-civic/10" onClick={() => setOpen(false)}>
            <UserRound className="h-4 w-4" />
            حسابي
          </Link>
          <Link href={dashboardHref(user.role)} className="flex items-center gap-2 rounded px-3 py-2 hover:bg-civic/10" onClick={() => setOpen(false)}>
            <LayoutDashboard className="h-4 w-4" />
            لوحتي
          </Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded px-3 py-2 text-right hover:bg-civic/10">
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      ) : null}
    </div>
  );
}
