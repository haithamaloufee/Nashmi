"use client";

import { UserRound } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import SafeImage from "@/components/ui/SafeImage";
import type { PublisherComposerProfile } from "@/components/dashboard/composers/types";

export default function PublisherIdentity({ publisher }: { publisher: PublisherComposerProfile }) {
  const { t } = useTranslation();
  const displayName = publisher.name || t("composer.publisher.fallbackName");
  const accountLabel = publisher.accountType === "authority" ? t("composer.publisher.authorityAccount") : t("composer.publisher.partyAccount");
  const fallback = (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-civic/10 text-base font-black text-civic ring-1 ring-line dark:bg-emerald-200/10 dark:text-emerald-100">
      {displayName ? displayName.slice(0, 1) : <UserRound className="h-5 w-5" />}
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      <SafeImage
        src={publisher.imageUrl || null}
        alt={displayName}
        className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-1 ring-line dark:bg-slate-900"
        fallback={fallback}
        localPrefixes={["/uploads/", "/images/", "/related/"]}
      />
      <div className="min-w-0">
        <p className="truncate text-base font-black">{displayName}</p>
        <p className="text-xs font-bold text-civic/80 dark:text-emerald-200">{accountLabel}</p>
      </div>
    </div>
  );
}
