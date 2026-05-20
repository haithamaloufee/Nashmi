import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import FloatingAssistant from "@/components/layout/FloatingAssistant";
import { ToastProvider } from "@/components/ui/ToastProvider";
import RouteTransitionProvider from "@/components/navigation/RouteTransitionProvider";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { cookies } from "next/headers";
import { defaultLanguage, isLanguage } from "@/lib/i18n";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004"),
  title: "Nashmi / نشمي",
  description: "منصة رقمية تجريبية ومحايدة لتعزيز المشاركة المدنية والوعي الانتخابي والتواصل المنظم بين المواطنين والأحزاب.",
  icons: {
    icon: "/images/nashmi%20logo_transparent.png",
    shortcut: "/images/nashmi%20logo_transparent.png",
    apple: "/images/nashmi%20logo_transparent.png"
  },
  openGraph: {
    title: "Nashmi / نشمي",
    description: "منصة رقمية تجريبية ومحايدة لتعزيز المشاركة المدنية والوعي الانتخابي.",
    images: [{ url: "/images/nashmi%20logo_transparent.png", width: 614, height: 614, alt: "شعار منصة نشمي" }]
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get("nashmi-language")?.value;
  const initialLanguage = isLanguage(cookieLanguage) ? cookieLanguage : defaultLanguage;
  const initialDir = initialLanguage === "ar" ? "rtl" : "ltr";
  return (
    <html lang={initialLanguage} dir={initialDir} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("nashmi-theme");if(t!=="light"&&t!=="dark"){t="light"}document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t;var m=document.cookie.match(/(?:^|; )nashmi-language=(ar|en)/);var l=localStorage.getItem("nashmi-language")||(m&&m[1]);if(l!=="en"&&l!=="ar"){l="${initialLanguage}"}document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}`
          }}
        />
      </head>
      <body className={cairo.variable} suppressHydrationWarning>
        <LanguageProvider initialLanguage={initialLanguage}>
          <ToastProvider>
            <Navbar />
            <RouteTransitionProvider>{children}</RouteTransitionProvider>
            <FloatingAssistant />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
