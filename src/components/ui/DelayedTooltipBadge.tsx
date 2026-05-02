"use client";

import { ReactNode, useRef, useState } from "react";

type DelayedTooltipBadgeProps = {
  children: ReactNode;
  tooltip: string;
  className?: string;
  ariaLabel?: string;
};

export default function DelayedTooltipBadge({ children, tooltip, className = "", ariaLabel }: DelayedTooltipBadgeProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  function showWithDelay() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), 1500);
  }

  function hide() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOpen(false);
  }

  return (
    <span className="relative inline-flex" onMouseEnter={showWithDelay} onMouseLeave={hide} onFocus={showWithDelay} onBlur={hide}>
      <span tabIndex={0} className={className} aria-label={ariaLabel || tooltip}>
        {children}
      </span>
      {open ? (
        <span
          role="tooltip"
          className="absolute bottom-full right-0 z-40 mb-2 w-72 rounded-lg border border-line bg-white p-3 text-right text-xs font-medium leading-6 text-ink shadow-soft dark:border-white/12 dark:bg-[#16242d] dark:text-white"
        >
          {tooltip}
        </span>
      ) : null}
    </span>
  );
}
