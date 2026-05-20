"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber } from "@/lib/localization";

type CountUpNumberProps = {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

export default function CountUpNumber({ value, duration = 1200, decimals = 0, prefix = "", suffix = "", className }: CountUpNumberProps) {
  const { language } = useTranslation();
  const [displayValue, setDisplayValue] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasRun) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const startAnimation = () => {
      setHasRun(true);
      if (prefersReducedMotion) {
        setDisplayValue(value);
        return;
      }

      const start = performance.now();
      const frame = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(value * eased);
        if (progress < 1) requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    };

    if (!("IntersectionObserver" in window)) {
      startAnimation();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [decimals, duration, hasRun, value]);

  return (
    <span ref={ref} className={`inline-block min-w-[3ch] tabular-nums ${className || ""}`}>
      {`${prefix}${formatNumber(displayValue, language, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`}
    </span>
  );
}
