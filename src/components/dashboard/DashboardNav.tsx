import Link from "next/link";
import type { ReactNode } from "react";

export function DashboardNav({ title, links, children }: { title: string; links: Array<{ href: string; label: string }>; children: ReactNode }) {
  return (
    <main className="container-page grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="card h-fit p-4">
        <h1 className="mb-4 text-xl font-bold">{title}</h1>
        <nav className="grid gap-2 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded px-3 py-2 hover:bg-civic/10">
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section>{children}</section>
    </main>
  );
}
