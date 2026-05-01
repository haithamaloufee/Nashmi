"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ExternalLink, Globe2 } from "lucide-react";

type RelatedSite = {
  title: string;
  href: string;
  description: string;
  initials: string;
  logoSrc?: string;
  logoAlt?: string;
};

const primarySites: RelatedSite[] = [
  {
    title: "الهيئة المستقلة للانتخاب",
    href: "https://www.iec.jo/ar",
    description: "المصدر الرسمي للمعلومات والخدمات الانتخابية في الأردن.",
    initials: "IEC",
    logoSrc: "/related/iec-logo.png",
    logoAlt: "شعار الهيئة المستقلة للانتخاب"
  },
  {
    title: "منصة الأحزاب",
    href: "https://parties.iec.jo/",
    description: "بوابة رسمية لمتابعة معلومات وخدمات الأحزاب السياسية.",
    initials: "أحزاب",
    logoSrc: "/related/parties-logo.svg"
  },
  {
    title: "منصة التدريب الانتخابي - جاهز",
    href: "https://rfe.iec.jo/",
    description: "منصة تدريبية متخصصة لتأهيل الكوادر العاملة في العملية الانتخابية.",
    initials: "جاهز",
    logoSrc: "/related/jahez-logo.svg"
  },
  {
    title: "موقع سند للخدمات الحكومية",
    href: "https://www.sanad.gov.jo/Default/AR",
    description: "بوابة للخدمات الحكومية الرقمية في الأردن.",
    initials: "سند",
    logoSrc: "/related/sanad-logo.svg"
  },
  {
    title: "دائرة الأحوال المدنية والجوازات",
    href: "https://www.cspd.gov.jo/Default/Ar",
    description: "الجهة المختصة بخدمات الأحوال المدنية والجوازات.",
    initials: "CSPD",
    logoSrc: "/related/cspd-logo.svg"
  },
  {
    title: "المنظمة العربية للإدارات الانتخابية",
    href: "https://arabembs.org/",
    description: "منظمة عربية تعنى بتطوير الإدارات والعمليات الانتخابية.",
    initials: "AEM",
    logoSrc: "/related/arabembs-logo.svg"
  }
];

const optionalSites: RelatedSite[] = [
  {
    title: "هيئة الأمم المتحدة للمرأة",
    href: "https://arabstates.unwomen.org/ar",
    description: "موقع إقليمي يعرض موارد وبرامج متعلقة بمشاركة المرأة.",
    initials: "UN"
  },
  {
    title: "أمانة عمان الكبرى",
    href: "https://www.ammancity.gov.jo/ar/gameservices/eservices.aspx",
    description: "خدمات إلكترونية مرتبطة بأمانة عمان الكبرى.",
    initials: "عمّان"
  },
  {
    title: "الجامعة الأردنية",
    href: "https://www.ju.edu.jo/ar/arabic/Home.aspx",
    description: "موقع الجامعة الأردنية الرسمي.",
    initials: "JU"
  },
  {
    title: "منصة تصفح بأمان",
    href: "https://share.google/R8MzgeJ8BYCfWDM93",
    description: "رابط توعوي يساعد المستخدمين على التصفح الآمن.",
    initials: "أمان"
  }
];

function SiteCard({ site }: { site: RelatedSite }) {
  return (
    <a
      href={site.href}
      target="_blank"
      rel="noopener noreferrer"
      className="reveal-on-scroll focus-ring group flex min-h-40 flex-col rounded border border-line bg-paper p-5 shadow-sm transition hover:-translate-y-1 hover:border-civic hover:bg-white hover:shadow-soft"
      aria-label={`زيارة ${site.title} في تبويب جديد`}
      data-reveal
    >
      <span className="mb-4 flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded bg-white text-sm font-black text-civic ring-1 ring-civic/15">
          {site.logoSrc ? (
            <Image src={site.logoSrc} alt={site.logoAlt || ""} width={64} height={64} unoptimized className="h-16 w-16 object-contain p-1.5" />
          ) : (
            <span className="grid place-items-center text-center">
              <Globe2 className="mx-auto h-6 w-6" aria-hidden="true" />
              <span className="mt-1 text-xs">{site.initials}</span>
            </span>
          )}
        </span>
        <span className="block min-w-0">
          <span className="block font-black text-ink">{site.title}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-civic">
            زيارة الموقع
            <ExternalLink className="h-4 w-4" />
          </span>
        </span>
      </span>
      <span className="block flex-1 text-sm leading-7 text-ink/70">{site.description}</span>
    </a>
  );
}

export default function RelatedSitesSection() {
  const [expanded, setExpanded] = useState(false);
  const displayedSites = expanded ? [...primarySites, ...optionalSites] : primarySites;

  return (
    <section className="bg-white py-14" id="related" aria-labelledby="related-title">
      <div className="container-page">
        <div className="reveal-on-scroll mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end" data-reveal>
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-bold text-civic">روابط رسمية ومساندة</p>
            <h2 id="related-title" className="text-3xl font-black">مواقع ذات صلة</h2>
            <p className="mt-3 leading-8 text-ink/70">روابط خارجية تفتح في تبويب جديد، وتساعد المستخدم على الوصول للمصادر الرسمية والخدمات العامة ذات العلاقة.</p>
          </div>
          <button
            type="button"
            className="focus-ring inline-flex items-center justify-center gap-2 rounded border border-line px-4 py-2 font-bold text-civic hover:border-civic hover:bg-civic/5"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls="related-extra-sites"
          >
            {expanded ? "عرض أقل" : "عرض المزيد"}
            <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div id="related-extra-sites" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedSites.map((site) => (
            <SiteCard key={site.href} site={site} />
          ))}
        </div>
      </div>
    </section>
  );
}
