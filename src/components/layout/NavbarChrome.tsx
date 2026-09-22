"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function NavbarChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const overlaysHero = pathname === "/";

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`${overlaysHero ? "fixed inset-x-0 top-0" : "sticky top-0"} z-50 border-b text-white transition-[background-color,box-shadow,border-color] duration-200 ${
        scrolled
          ? "border-white/[0.12] bg-[#10252b]/[0.96] shadow-[0_12px_34px_rgba(5,18,22,.22)]"
          : overlaysHero
            ? "border-white/15 bg-[#10252b]/[0.58] shadow-[0_8px_24px_rgba(5,18,22,.1)]"
            : "border-white/[0.08] bg-[#10252b] shadow-[0_8px_24px_rgba(5,18,22,.12)]"
      } supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150`}
      data-scrolled={scrolled ? "true" : "false"}
    >
      {children}
    </header>
  );
}
