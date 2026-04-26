"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button onClick={logout} className="rounded border border-line px-3 py-2 text-sm hover:border-civic" type="button">
      <LogOut className="ml-1 inline h-4 w-4" />
      خروج
    </button>
  );
}
