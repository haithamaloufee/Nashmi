"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, LogOut, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";
import type { SafeUser } from "@/lib/auth";
import { useTranslation } from "@/components/i18n/LanguageProvider";

function dashboardHref(role: SafeUser["role"]) {
  if (role === "party") return "/party-dashboard";
  if (role === "iec") return "/iec-dashboard";
  if (role === "admin" || role === "super_admin") return "/admin";
  return "/account";
}

export default function UserMenu({ user }: { user: SafeUser }) {
  const router = useRouter();
  const { language, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const avatarSrc = user.avatarUrl || user.image;
  const fallback = <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-200/[0.16] text-sm font-black text-emerald-100">{user.name.slice(0, 1)}</span>;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button ref={triggerRef} type="button" onClick={() => setOpen((value) => !value)} className="focus-ring flex min-h-11 items-center gap-2 rounded-full border border-white/[0.16] bg-white/[0.08] px-1.5 text-white hover:border-emerald-200/[0.45] hover:bg-white/[0.14]" aria-expanded={open} aria-controls="account-menu">
        <SafeImage src={avatarSrc} alt={user.name} className="h-9 w-9 rounded-full object-cover" fallback={fallback} localPrefixes={["/uploads/avatars/", "/uploads/", "/images/"]} />
        <span className="hidden max-w-28 truncate pe-2 text-sm font-bold text-white/[0.82] xl:inline">{user.name.split(" ")[0]}</span>
      </button>
      {open ? (
        <div id="account-menu" className="absolute end-0 mt-3 w-56 rounded-2xl border border-white/[0.12] bg-[#10252b]/[0.99] p-2 text-sm text-white shadow-2xl backdrop-blur-xl">
          <p className="truncate px-3 py-2 font-black text-white">{user.name}</p>
          <Link href="/account" className="focus-ring flex min-h-11 items-center gap-2 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)}>
            <UserRound className="h-4 w-4" />
            {t("nav.account")}
          </Link>
          <Link href={dashboardHref(user.role)} className="focus-ring flex min-h-11 items-center gap-2 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)}>
            <LayoutDashboard className="h-4 w-4" />
            {t("nav.dashboard")}
          </Link>
          <Link href="/account" className="focus-ring flex min-h-11 items-center gap-2 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4" />
            {language === "ar" ? "الإعدادات" : "Settings"}
          </Link>
          <div className="my-1 h-px bg-white/10" />
          <button type="button" onClick={logout} className="focus-ring flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-right text-red-200 hover:bg-red-400/10 hover:text-red-100">
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
