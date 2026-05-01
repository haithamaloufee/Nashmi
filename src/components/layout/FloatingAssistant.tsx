import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";

export default function FloatingAssistant() {
  return (
    <Link
      href="/chat"
      className="focus-ring fixed bottom-5 left-5 z-30 inline-flex items-center gap-2 rounded-full bg-civic px-4 py-3 font-semibold text-white shadow-soft ring-1 ring-white/25 transition hover:bg-civic/90 active:scale-95 print:hidden"
      aria-label="المساعد الذكي"
    >
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/15">
        <Bot className="h-5 w-5" />
        <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-white" />
      </span>
      <span className="hidden text-sm sm:inline">المساعد الذكي</span>
    </Link>
  );
}
