import ChatClient from "@/components/chat/ChatClient";
import Alert from "@/components/ui/Alert";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ lawId?: string }> }) {
  const params = await searchParams;
  return (
    <main className="container-page py-8">
      <div className="mx-auto mb-6 max-w-3xl">
        <h1 className="text-3xl font-black">المساعد الذكي</h1>
        <p className="mt-2 leading-8 text-ink/70">مساعد توعوي محايد يشرح القوانين والمفاهيم السياسية والانتخابية بلغة عربية مبسطة.</p>
        <div className="mt-4">
          <Alert>لا أستطيع ترشيح حزب أو توجيهك لاختيار سياسي معين. أقدر أشرح لك برامج الأحزاب المتاحة داخل المنصة بنبرة محايدة، أو أساعدك تفهم القانون وآلية المشاركة.</Alert>
        </div>
      </div>
      <ChatClient lawId={params.lawId} />
    </main>
  );
}
