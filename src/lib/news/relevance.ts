import type { NewsCategory } from "@/lib/news/types";

type RelevanceInput = {
  titleAr: string;
  summaryAr: string;
  category: NewsCategory;
  nashmiRelevant: boolean;
  relevanceReason: string;
  civicImpact: "low" | "medium" | "high";
};

export function isNashmiRelevant(input: RelevanceInput) {
  // The model assesses relevance; source, date and confidence checks remain
  // separate hard gates. Keyword rules rejected valid Jordanian news too often.
  return input.nashmiRelevant && input.relevanceReason.trim().length >= 12;
}
