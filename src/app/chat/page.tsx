import ChatClient from "@/components/chat/ChatClient";
import Alert from "@/components/ui/Alert";
import { I18nText } from "@/components/i18n/LanguageProvider";
import { getCurrentUser } from "@/lib/auth";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ lawId?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  return (
    <main className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black"><I18nText id="chat.title" /></h1>
        <p className="mt-2 max-w-3xl leading-8 text-ink/70">
          <I18nText id="chat.subtitle" />
        </p>
        <div className="mt-4 max-w-4xl">
          <Alert><I18nText id="chat.notice" /></Alert>
        </div>
      </div>
      <ChatClient lawId={params.lawId} authenticated={Boolean(user)} />
    </main>
  );
}
