"use client";
import { useEffect, useState } from "react";

type ClientUser = { id: string; role: string } | null;
let cached: { expires: number; request: Promise<ClientUser> } | null = null;
export function invalidateClientUser() {
  cached = null;
  window.dispatchEvent(new Event("nashmi-auth-change"));
}
function fetchUser() {
  if (!cached || cached.expires < Date.now()) {
    cached = { expires: Date.now() + 30_000, request: fetch("/api/auth/me", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(json => json?.ok ? json.data?.user || null : null).catch(() => null) };
  }
  return cached.request;
}
export function useClientUser() {
  const [user, setUser] = useState<ClientUser>(null);
  useEffect(() => {
    let active = true, revision = 0;
    const update = () => { const current = ++revision; void fetchUser().then(value => { if (active && current === revision) setUser(value); }); };
    update();
    window.addEventListener("nashmi-auth-change", update);
    return () => { active = false; window.removeEventListener("nashmi-auth-change", update); };
  }, []);
  return user;
}
