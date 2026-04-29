import "server-only";

import { generateSharekAssistantResponse, retrieveRelevantLawContext } from "@/lib/ai/gemini";

export async function generateNeutralAnswer(message: string, preferredLawId?: string) {
  const lawContext = await retrieveRelevantLawContext(message, preferredLawId, 6);
  return generateSharekAssistantResponse({ message, history: [{ role: "user", content: message }], lawContext });
}
