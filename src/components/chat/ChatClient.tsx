"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatClient({ lawId }: { lawId?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "أهلا بك في مساعد شارك. أشرح القوانين والمفاهيم الانتخابية وطريقة استخدام المنصة بنبرة محايدة."
    }
  ]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    const message = String(formData.get("message") || "").trim();
    if (!message) return;
    setMessages((items) => [...items, { role: "user", content: message }]);
    setLoading(true);
    const response = await fetch(lawId ? `/api/chat/law/${lawId}` : "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, lawId })
    });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    setMessages((items) => [
      ...items,
      {
        role: "assistant",
        content: json.ok ? json.data.message.content : json.error?.message || "تعذر الحصول على إجابة"
      }
    ]);
  }

  return (
    <div className="card mx-auto max-w-3xl p-5">
      <div className="mb-4 h-[520px] space-y-3 overflow-auto rounded border border-line bg-white p-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded p-3 leading-7 ${message.role === "assistant" ? "bg-civic/10 text-ink" : "mr-auto bg-ink text-white"}`}>
            {message.content}
          </div>
        ))}
        {loading ? <div className="rounded bg-civic/10 p-3 text-sm text-ink/70">جار إعداد إجابة محايدة...</div> : null}
      </div>
      <form action={submit} className="flex gap-2">
        <input name="message" className="flex-1 rounded border-line" maxLength={1200} placeholder="اسأل عن قانون، مفهوم انتخابي، أو طريقة استخدام المنصة" />
        <button className="rounded bg-civic px-4 py-2 text-white">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-3 text-xs text-ink/60">المساعد لا يرشح أحزابا ولا يوجه قرار التصويت ولا ينفذ إجراءات نيابة عن المستخدم.</p>
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
