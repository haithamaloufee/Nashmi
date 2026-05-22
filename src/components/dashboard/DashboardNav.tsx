import Link from "next/link";
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
    <main className={`${wide ? "mx-auto w-[min(1480px,calc(100%_-_24px))]" : "container-page"} grid gap-6 py-8 lg:grid-cols-[220px_1fr]`}>
      <aside className="card h-fit p-4">
        <h1 className="mb-4 text-xl font-bold">{titleKey ? <I18nText id={titleKey} /> : title}</h1>
        <nav className="grid gap-2 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded px-3 py-2 hover:bg-civic/10">
              {link.labelKey ? <I18nText id={link.labelKey} /> : link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section>{children}</section>
    </main>
  );
}
