"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  AuthPageSkeleton,
  ChatbotSkeleton,
  DashboardSkeleton,
  HomePageSkeleton,
  LawsPageSkeleton,
  PartiesPageSkeleton,
  UpdatesPageSkeleton
} from "@/components/ui/Skeletons";

function skeletonForPath(pathname: string) {
  if (pathname === "/") return <HomePageSkeleton />;
  if (pathname.startsWith("/updates")) return <UpdatesPageSkeleton />;
  if (pathname.startsWith("/parties")) return <PartiesPageSkeleton />;
  if (pathname.startsWith("/laws")) return <LawsPageSkeleton />;
  if (pathname.startsWith("/chat")) return <ChatbotSkeleton />;
  if (pathname.startsWith("/admin") || pathname.startsWith("/party-dashboard") || pathname.startsWith("/iec-dashboard")) return <DashboardSkeleton />;
  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/account")) return <AuthPageSkeleton />;
  return <UpdatesPageSkeleton />;
}

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingPath) return;
    const timeout = window.setTimeout(() => setPendingPath(null), 12000);
    return () => window.clearTimeout(timeout);
  }, [pendingPath]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || !isPlainLeftClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setPendingPath(url.pathname);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const skeleton = useMemo(() => (pendingPath ? skeletonForPath(pendingPath) : null), [pendingPath]);

  return (
    <>
      {children}
      {skeleton ? (
        <div className="fixed inset-x-0 bottom-0 top-0 z-30 overflow-auto bg-paper pt-20 lg:pt-16" dir="rtl" aria-live="polite" aria-busy="true">
          {skeleton}
        </div>
      ) : null}
    </>
  );
}
