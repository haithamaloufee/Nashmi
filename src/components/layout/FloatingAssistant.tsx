import Link from "next/link";
import { Bot } from "lucide-react";

export default function FloatingAssistant() {
  return (
    <Link href="/chat" className="fixed bottom-5 left-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-civic text-white shadow-soft" aria-label="المساعد الذكي">
      <Bot className="h-6 w-6" />
    </Link>
  );
}
