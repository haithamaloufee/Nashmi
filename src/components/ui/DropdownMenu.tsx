"use client";

import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";

type DropdownMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  label: string;
};

export default function DropdownMenu({ trigger, children, align = "end", label }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (!ref.current?.contains(document.activeElement)) return;
      if ((document.activeElement as Element)?.closest('[role="dialog"]')) return;
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); button.current?.focus(); }
      if (event.key === "Tab") setOpen(false);
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') || [])];
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (index + 1) % items.length : (index <= 0 ? items.length : index) - 1;
      items[next]?.focus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-start" onClickCapture={event => { (event.target as Element).closest<HTMLElement>("button, a[href]")?.focus(); }} onClick={event => {
      if ((event.target as Element).closest('[role="menuitem"]')) { setOpen(false); button.current?.focus(); }
    }}>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        aria-controls={open ? id : undefined}
        onKeyDown={event => { if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true); } }}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-white px-2.5 py-2 text-ink/70 transition hover:border-civic hover:text-civic active:scale-95 focus-ring dark:bg-slate-900 dark:text-slate-200"
      >
        {trigger}
      </button>
      {open ? <div
        id={id}
        role="menu"
        aria-label={label}
        className={`absolute z-30 mt-2 min-w-44 rounded-xl border border-line bg-white p-1 shadow-soft dark:bg-slate-950 ${align === "end" ? "end-0" : "start-0"}`}
      >
        {Children.map(children, child => isValidElement<{ role?: string; tabIndex?: number }>(child) ? cloneElement(child, { role: "menuitem", tabIndex: -1 }) : child)}
      </div> : null}
    </div>
  );
}
