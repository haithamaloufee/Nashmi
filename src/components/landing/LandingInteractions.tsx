"use client";

import { useEffect } from "react";

function animateCounter(element: HTMLElement, target: number) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = prefersReducedMotion ? 0 : 1100;
  const start = performance.now();
  const decimals = Number(element.dataset.counterDecimals || "0");
  const suffix = element.dataset.counterSuffix || "";
  const formatter = new Intl.NumberFormat("ar-JO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  function format(value: number) {
    return `${formatter.format(value)}${suffix}`;
  }

  if (!duration) {
    element.textContent = format(target);
    return;
  }

  function frame(now: number) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = format(target * eased);
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export default function LandingInteractions() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const counterItems = Array.from(document.querySelectorAll<HTMLElement>("[data-counter]"));
    const donutItems = Array.from(document.querySelectorAll<HTMLElement>("[data-donut-value]"));
    const counterSet = new Set(counterItems);
    const donutSet = new Set(donutItems);

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      counterItems.forEach((item) => {
        const target = Number(item.dataset.counter || "0");
        const decimals = Number(item.dataset.counterDecimals || "0");
        const suffix = item.dataset.counterSuffix || "";
        item.textContent = `${new Intl.NumberFormat("ar-JO", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(target)}${suffix}`;
      });
      donutItems.forEach((item) => item.style.setProperty("--donut-progress", `${item.dataset.donutValue || "0"}%`));
      return;
    }

    const observed = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            if (counterSet.has(element)) {
              animateCounter(element, Number(element.dataset.counter || "0"));
            }
            if (donutSet.has(element)) {
              element.style.setProperty("--donut-progress", `${element.dataset.donutValue || "0"}%`);
            }
            observed.unobserve(element);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    new Set([...counterItems, ...donutItems]).forEach((item) => observed.observe(item));

    return () => {
      observed.disconnect();
    };
  }, []);

  return null;
}
