"use client";
import type { ReactNode } from "react";
export default function NavbarChrome({ children }: { children: ReactNode }) {
  return <header className="social-navbar sticky top-0 z-50 border-b">{children}</header>;
}
