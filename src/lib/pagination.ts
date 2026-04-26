import type { FilterQuery, SortOrder } from "mongoose";

export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 30;

export function parseLimit(value: string | null) {
  const parsed = Number(value || DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT);
}

export function cursorFilter<T>(cursor: string | null): FilterQuery<T> {
  if (!cursor) return {};
  const date = new Date(cursor);
  if (Number.isNaN(date.getTime())) return {};
  return { createdAt: { $lt: date } } as FilterQuery<T>;
}

export function getNextCursor(items: Array<{ createdAt?: Date }>, limit: number) {
  if (items.length < limit) return null;
  const last = items[items.length - 1];
  return last?.createdAt?.toISOString() || null;
}

export const newestSort: Record<string, SortOrder> = { createdAt: -1, _id: -1 };
