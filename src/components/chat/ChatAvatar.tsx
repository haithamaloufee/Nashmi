"use client";

import { Bot, UserRound } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";

type ChatAvatarProps = {
  role: "user" | "assistant";
  name?: string | null;
  imageUrl?: string | null;
  compact?: boolean;
  loading?: boolean;
};

export default function ChatAvatar({ role, name, imageUrl, compact = false, loading = false }: ChatAvatarProps) {
  const sizeClass = compact ? "h-8 w-8" : "h-9 w-9";
  const label = role === "assistant" ? "Nashmi AI" : name || "User";

  if (role === "assistant") {
    return (
      <SafeImage
        src="/images/nashmi logo.png"
        alt={label}
        className={`${sizeClass} shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-civic/25 dark:bg-slate-900 dark:ring-emerald-200/35`}
        fallback={<div className={`grid ${sizeClass} shrink-0 place-items-center rounded-full bg-civic text-white ring-1 ring-civic/25 dark:bg-emerald-200 dark:text-slate-950`}><Bot className="h-4 w-4" /></div>}
        localPrefixes={["/images/"]}
      />
    );
  }

  if (loading && !imageUrl && !name) {
    return <div className={`${sizeClass} shrink-0 rounded-full bg-slate-200 ring-1 ring-line dark:bg-slate-800`} aria-hidden="true" />;
  }

  return (
    <SafeImage
      src={imageUrl || null}
      alt={label}
      className={`${sizeClass} shrink-0 rounded-full bg-white object-cover ring-1 ring-line dark:bg-slate-900`}
      fallback={<div className={`grid ${sizeClass} shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-black text-civic ring-1 ring-line dark:bg-slate-800 dark:text-emerald-100`}>{name?.trim()?.slice(0, 1) || <UserRound className="h-4 w-4" />}</div>}
      localPrefixes={["/uploads/", "/images/"]}
    />
  );
}
