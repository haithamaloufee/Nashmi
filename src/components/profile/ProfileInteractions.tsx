"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";

export function ProfileTopScrollReset() {
  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    if (!window.location.hash) {
      window.history.scrollRestoration = "manual";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  return null;
}

export function JumpToPostsButton({ label = "عرض المنشورات / View posts" }: { label?: string }) {
  function handleClick() {
    document.getElementById("profile-posts")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="focus-ring inline-flex items-center justify-center rounded bg-civic px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-civic/90 dark:bg-emerald-200 dark:text-[#101820] dark:hover:bg-emerald-100"
    >
      {label}
    </button>
  );
}

export function ProfileAccordionCard({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="overflow-hidden rounded border border-line bg-white shadow-sm">
      <button
        type="button"
        className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-start font-bold text-ink hover:bg-civic/5"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-xl">{title}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-civic transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div id={panelId} className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-line px-5 py-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
