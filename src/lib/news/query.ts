export function buildActiveNewsQuery(now: Date, activeHours: number) {
  return {
    status: "published" as const,
    isActive: true,
    publishedAt: { $gte: new Date(now.getTime() - activeHours * 60 * 60 * 1000), $lte: now },
    expiresAt: { $gt: now }
  };
}

export function buildRefreshLockFilter(now: Date) {
  return { _id: "global", $or: [{ lockUntil: null }, { lockUntil: { $exists: false } }, { lockUntil: { $lt: now } }] };
}
