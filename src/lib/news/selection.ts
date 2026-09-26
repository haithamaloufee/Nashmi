import { z } from "zod";
import { NEWS_CATEGORIES } from "@/lib/news/types";

const SelectionSchema = z.object({ selected: z.array(z.object({
  index: z.number().int().min(0),
  category: z.enum(NEWS_CATEGORIES)
})).max(10) });

export function parseNewsSelection(value: unknown, itemCount: number, maximum: number) {
  const selection = SelectionSchema.parse(value).selected;
  if (selection.length > maximum) throw new Error("NEWS_SELECTION_TOO_LARGE");
  const indexes = new Set<number>();
  for (const item of selection) {
    if (item.index >= itemCount || indexes.has(item.index)) throw new Error("NEWS_SELECTION_INVALID_INDEX");
    indexes.add(item.index);
  }
  return selection;
}
