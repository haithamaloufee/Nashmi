"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const storageKey = "nashmi-theme";

function getPreferredTheme() {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(storageKey);
  if (saved === "dark" || saved === "light") return saved;
  return "dark";
}

function applyTheme(theme: string) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const preferred = getPreferredTheme();
    setTheme(preferred);
    applyTheme(preferred);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  }

  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-civic/20 bg-civic/5 text-civic shadow-sm hover:border-civic/45 hover:bg-civic/10 dark:border-white/15 dark:bg-white/8 dark:text-emerald-200 dark:hover:border-emerald-200/45 dark:hover:bg-white/14"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
