import ChatClient from "@/components/chat/ChatClient";
import Alert from "@/components/ui/Alert";
import { I18nText } from "@/components/i18n/LanguageProvider";
import { getCurrentUser } from "@/lib/auth";
import { getNewsSnapshot } from "@/lib/news/service";
import { buildNewsInitialSummary } from "@/lib/ai/chatSession";
import { serialize } from "@/lib/routeUtils";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ lawId?: string; news?: string; fresh?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const newsContext = params.news ? await getNewsSnapshot(params.news).catch(() => null) : null;
  const serializedNews = newsContext ? serialize({ ...newsContext, publishedAt: newsContext.publishedAt.toISOString() }) : null;
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
      <ChatClient
        lawId={params.lawId}
        newsId={newsContext?.newsId}
        initialNewsContext={serializedNews}
        initialNewsSummary={newsContext ? buildNewsInitialSummary(newsContext) : undefined}
        authenticated={Boolean(user)}
        currentUser={user}
      />
    </main>
  );
}
