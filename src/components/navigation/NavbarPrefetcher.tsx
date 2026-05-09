"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type NavbarPrefetcherProps = {
  routes: string[];
};

const maxIdlePrefetches = 5;

function onIdle(callback: () => void) {
  const win = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (win.requestIdleCallback && win.cancelIdleCallback) {
    const id = win.requestIdleCallback(callback, { timeout: 2500 });
    return () => win.cancelIdleCallback?.(id);
  }
  const id = globalThis.setTimeout(callback, 900);
  return () => globalThis.clearTimeout(id);
}

export default function NavbarPrefetcher({ routes }: NavbarPrefetcherProps) {
  const router = useRouter();
  const prefetched = useRef(new Set<string>());

  useEffect(() => {
    const publicRoutes = routes.filter((route) => route.startsWith("/") && !route.startsWith("/admin") && !route.includes("dashboard"));

    function prefetch(route: string) {
      if (prefetched.current.has(route)) return;
      prefetched.current.add(route);
      router.prefetch(route);
    }

    const cancelIdle = onIdle(() => {
      publicRoutes.slice(0, maxIdlePrefetches).forEach(prefetch);
    });

    const onIntent = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-navbar-prefetch]") : null;
      const route = target?.dataset.navbarPrefetch;
      if (route && publicRoutes.includes(route)) prefetch(route);
    };

    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    document.addEventListener("touchstart", onIntent, { passive: true });

    return () => {
      cancelIdle();
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
    };
  }, [router, routes]);

  return null;
}
