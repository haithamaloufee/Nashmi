import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import FloatingAssistant from "@/components/layout/FloatingAssistant";
import { ToastProvider } from "@/components/ui/ToastProvider";
import RouteTransitionProvider from "@/components/navigation/RouteTransitionProvider";

export const metadata: Metadata = {
  title: "Nashmi / نشمي",
  description: "منصة رقمية محايدة لتعزيز المشاركة السياسية والتواصل المنظم بين المواطنين والأحزاب والهيئة المستقلة"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastProvider>
          <Navbar />
          <RouteTransitionProvider>{children}</RouteTransitionProvider>
          <FloatingAssistant />
        </ToastProvider>
      </body>
    </html>
  );
}
