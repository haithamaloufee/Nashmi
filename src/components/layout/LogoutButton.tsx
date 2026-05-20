"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/i18n/LanguageProvider";

export default function LogoutButton() {
  const router = useRouter();
  const { t } = useTranslation();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button onClick={logout} className="rounded border border-line px-3 py-2 text-sm hover:border-civic" type="button">
      <LogOut className="me-1 inline h-4 w-4" />
      {t("nav.logout")}
    </button>
  );
}
