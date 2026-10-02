"use client";

import { useEffect, useState } from "react";

type VisibleViewport = { height: number; top: number; bottomInset: number };

export function useVisibleViewport(active: boolean) {
  const [viewport, setViewport] = useState<VisibleViewport | null>(null);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const measure = () => {
      const visible = window.visualViewport;
      const height = visible?.height ?? window.innerHeight;
      const top = visible?.offsetTop ?? 0;
      const next = { height, top, bottomInset: Math.max(0, window.innerHeight - top - height) };
      setViewport(previous => previous?.height === next.height && previous.top === next.top && previous.bottomInset === next.bottomInset ? previous : next);
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [active]);
  return viewport;
}

export function useMobileAssistantScrollLock(active: boolean, maxWidth = 639) {
  useEffect(() => {
    if (!active) return;
    const media = window.matchMedia(`(max-width: ${maxWidth}px)`);
    let release: (() => void) | undefined;
    const sync = () => {
      release?.();
      release = undefined;
      if (!media.matches) return;
      const body = document.body;
      const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
      const x = window.scrollX;
      const y = window.scrollY;
      body.style.position = "fixed";
      body.style.top = `${-y}px`;
      body.style.width = "100%";
      body.style.overflow = "hidden";
      release = () => {
        Object.assign(body.style, previous);
        window.scrollTo({ left: x, top: y, behavior: "instant" });
      };
    };
    sync();
    media.addEventListener("change", sync);
    return () => { media.removeEventListener("change", sync); release?.(); };
  }, [active, maxWidth]);
}
