import ChatClient from "@/components/chat/ChatClient";
import Alert from "@/components/ui/Alert";
import { getCurrentUser } from "@/lib/auth";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ lawId?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  return (
    <main className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">مساعد منصة نشمي الذكي</h1>
        <p className="mt-2 max-w-3xl leading-8 text-ink/70">
          مساعد توعوي محايد يشرح القوانين والانتخابات والأحزاب واستخدام منصة نشمي باللغة العربية، مع اعتماد قاعدة قوانين Nashmi كمصدر أساسي.
        </p>
        <div className="mt-4 max-w-4xl">
          <Alert>المساعد لا يرشح أحزابًا أو مرشحين، ولا يقدم استشارة قانونية قطعية. استخدمه للفهم والمقارنة المحايدة والرجوع إلى المصادر الرسمية.</Alert>
        </div>
      </div>
      <ChatClient lawId={params.lawId} authenticated={Boolean(user)} />
    </main>
  );
}
