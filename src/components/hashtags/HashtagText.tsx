import Link from "next/link";
import type { ReactNode } from "react";
import { normalizeHashtag } from "@/lib/localization";

const hashtagMatcher = /(^|[\s([{"'،؛؟!])#([\p{L}\p{N}_]+)/gu;

export default function HashtagText({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(hashtagMatcher)) {
    const fullMatch = match[0] || "";
    const prefix = match[1] || "";
    const tag = match[2] || "";
    const matchIndex = match.index || 0;
    const hashIndex = matchIndex + prefix.length;

    if (hashIndex > lastIndex) parts.push(text.slice(lastIndex, hashIndex));

    const normalized = normalizeHashtag(tag);
    parts.push(
      <Link
        key={`${hashIndex}-${tag}`}
        href={`/hashtags/${encodeURIComponent(normalized)}`}
        className="font-bold text-civic hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic dark:text-emerald-200"
      >
        #{tag}
      </Link>
    );
    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return <span className={className}>{parts}</span>;
}
