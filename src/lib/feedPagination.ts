type FeedItem = { publishedAt: unknown; item: object };
function identifier(item: object) {
  return String((item as { _id?: unknown })._id);
}
function timestamp(value: unknown) {
  return value instanceof Date ? value.getTime() : new Date(typeof value === "number" ? value : String(value)).getTime();
}
export function feedCursor(update: FeedItem) {
  return `${new Date(timestamp(update.publishedAt)).toISOString()}~${identifier(update.item)}`;
}
export function parseFeedCursor(cursor: string) {
  const [timestamp, id, extra] = cursor.split("~");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime()) || extra !== undefined || (id !== undefined && !/^[a-f0-9]{24}$/i.test(id))) return null;
  return { date, id: id || null };
}
export function compareFeedItems(a: FeedItem, b: FeedItem) {
  return timestamp(b.publishedAt) - timestamp(a.publishedAt) || identifier(b.item).localeCompare(identifier(a.item));
}
