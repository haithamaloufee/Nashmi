import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import FloatingAssistant from "@/components/layout/FloatingAssistant";
import { ToastProvider } from "@/components/ui/ToastProvider";
import RouteTransitionProvider from "@/components/navigation/RouteTransitionProvider";

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
    icon: "/images/nashmi%20logo.png",
    shortcut: "/images/nashmi%20logo.png",
    apple: "/images/nashmi%20logo.png"
  },
  openGraph: {
    title: "Nashmi / نشمي",
    description: "منصة رقمية تجريبية ومحايدة لتعزيز المشاركة المدنية والوعي الانتخابي.",
    images: [{ url: "/images/nashmi%20logo.png", width: 2048, height: 2048, alt: "شعار منصة نشمي" }]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("nashmi-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t}catch(e){}`
          }}
        />
      </head>
      <body className={cairo.variable} suppressHydrationWarning>
        <ToastProvider>
          <Navbar />
          <RouteTransitionProvider>{children}</RouteTransitionProvider>
          <FloatingAssistant />
        </ToastProvider>
      </body>
    </html>
  );
}
