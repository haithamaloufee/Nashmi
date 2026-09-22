import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import FloatingAssistant from "@/components/layout/FloatingAssistant";
import { ToastProvider } from "@/components/ui/ToastProvider";
import RouteTransitionProvider from "@/components/navigation/RouteTransitionProvider";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { cookies } from "next/headers";
import { defaultLanguage, isLanguage } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/siteUrl";
import LiveNewsTicker from "@/components/news/LiveNewsTicker";
import { getActiveNewsItems } from "@/lib/news/service";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "نشمي",
  description: "منصة مدنية رقمية محايدة لمتابعة المستجدات، فهم القوانين، والتعرّف إلى الأحزاب والمشاركة بمسؤولية.",
  alternates: { canonical: "/" },
  icons: {
    icon: "/images/nashmi%20logo_transparent.png",
    shortcut: "/images/nashmi%20logo_transparent.png",
    apple: "/images/nashmi%20logo_transparent.png"
  },
  openGraph: {
    title: "نشمي",
    description: "منصة مدنية رقمية محايدة لمتابعة المستجدات وفهم القوانين والمشاركة بمسؤولية.",
    url: "/",
    siteName: "نشمي",
    type: "website",
    images: [{ url: "/images/nashmi%20logo_transparent.png", width: 614, height: 614, alt: "شعار منصة نشمي" }]
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get("nashmi-language")?.value;
  const initialLanguage = isLanguage(cookieLanguage) ? cookieLanguage : defaultLanguage;
  const initialDir = initialLanguage === "ar" ? "rtl" : "ltr";
  const newsItems = await getActiveNewsItems(15).catch(() => []);
  return (
    <html lang={initialLanguage} dir={initialDir} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("nashmi-theme");if(t!=="light"&&t!=="dark"){t="light"}document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t;var m=document.cookie.match(/(?:^|; )nashmi-language=(ar|en)/);var l=localStorage.getItem("nashmi-language")||(m&&m[1]);if(l!=="en"&&l!=="ar"){l="${initialLanguage}"}document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}`
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">تخطي إلى المحتوى الرئيسي</a>
        <LanguageProvider initialLanguage={initialLanguage}>
          <ToastProvider>
            <Navbar />
            <LiveNewsTicker initialItems={newsItems} />
            <div id="main-content" tabIndex={-1}><RouteTransitionProvider>{children}</RouteTransitionProvider></div>
            <FloatingAssistant />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
