"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type DropdownMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  label: string;
};

export default function DropdownMenu({ trigger, children, align = "end", label }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-right">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center justify-center rounded border border-line bg-white px-2.5 py-2 text-ink/70 transition hover:border-civic hover:text-civic active:scale-95 focus-ring"
      >
        {trigger}
      </button>
      <div
        role="menu"
        className={`absolute z-30 mt-2 min-w-44 origin-top rounded border border-line bg-white p-1 shadow-soft transition ${
          align === "end" ? "left-0" : "right-0"
        } ${open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
      >
        {children}
      </div>
    </div>
  );
}
