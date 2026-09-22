import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { I18nText } from "@/components/i18n/LanguageProvider";

const explore = [
  { href: "/updates", label: "nav.updates" },
  { href: "/laws", label: "nav.laws" },
  { href: "/parties", label: "nav.parties" },
  { href: "/surveys", label: "nav.surveys" }
] as const;

export default function SiteFooter() {
  return (
    <footer className="footer-pattern bg-[#102a31] py-12 text-white" id="footer" aria-labelledby="footer-title">
      <div className="container-page grid gap-8 md:grid-cols-3">
        <section className="max-w-sm">
          <div className="flex items-center gap-3">
            <Image src="/images/nashmi logo_transparent.png" alt="شعار منصة نشمي" width={72} height={72} className="h-14 w-14 object-contain drop-shadow-[0_0_7px_rgba(255,255,255,.28)]" />
            <h2 id="footer-title" className="text-xl font-black">Nashmi</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/[0.72]"><I18nText id="home.footer.summary" /></p>
        </section>

        <nav aria-label="استكشف نشمي">
          <h3 className="mb-3 font-black"><I18nText id="home.footer.explore" /></h3>
          <ul className="grid gap-2 text-sm text-white/[0.72]">
            {explore.map((item) => <li key={item.href}><Link href={item.href} className="focus-ring inline-flex min-h-9 items-center rounded hover:text-emerald-200 hover:underline"><I18nText id={item.label} /></Link></li>)}
          </ul>
        </nav>

        <nav aria-label="معلومات وروابط مفيدة">
          <h3 className="mb-3 font-black"><I18nText id="home.footer.information" /></h3>
          <ul className="grid gap-2 text-sm text-white/[0.72]">
            <li><Link href="/about-nashmi" className="focus-ring inline-flex min-h-9 items-center rounded hover:text-emerald-200 hover:underline"><I18nText id="nav.aboutNashmi" /></Link></li>
            <li><Link href="/iec" className="focus-ring inline-flex min-h-9 items-center rounded hover:text-emerald-200 hover:underline"><I18nText id="home.footer.resources" /></Link></li>
            <li><a href="https://www.iec.jo/ar" target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex min-h-9 items-center gap-2 rounded hover:text-emerald-200 hover:underline"><I18nText id="home.footer.iecOfficial" /><ExternalLink className="h-3.5 w-3.5" /></a></li>
          </ul>
        </nav>
      </div>
      <div className="container-page mt-9 flex flex-col gap-2 border-t border-white/[0.12] pt-5 text-xs leading-6 text-white/[0.58] sm:flex-row sm:items-center sm:justify-between">
        <p><I18nText id="home.footer.rightsShort" /></p>
        <p><I18nText id="home.footer.neutrality" /></p>
      </div>
    </footer>
  );
}
