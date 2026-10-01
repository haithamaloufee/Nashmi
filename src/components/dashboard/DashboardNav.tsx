import DashboardLinks from "./DashboardLinks";
import type { ReactNode } from "react";
import { I18nText } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

export type DashboardNavLink = {
  href: string;
  label?: ReactNode;
  labelKey?: TranslationKey;
};

export function DashboardNav({
  title,
  titleKey,
  links,
  children,
  wide = false
}: {
  title?: ReactNode;
  titleKey?: TranslationKey;
  links: ReadonlyArray<DashboardNavLink>;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={`${wide ? "mx-auto w-[min(1480px,calc(100%_-_24px))]" : "container-page"} grid grid-cols-1 gap-5 py-5 lg:grid-cols-[220px_minmax(0,1fr)]`}>
      <aside className="h-fit min-w-0 rounded-2xl border border-line bg-white p-3 dark:bg-slate-950 lg:sticky lg:top-20">
        <h2 className="mb-3 text-lg font-bold">{titleKey ? <I18nText id={titleKey} /> : title}</h2>
        <DashboardLinks links={links} />
      </aside>
      <section className="dashboard-content">{children}</section>
    </main>
  );
}
