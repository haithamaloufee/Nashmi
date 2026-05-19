const dayMs = 24 * 60 * 60 * 1000;
export const defaultPollDurationDays = 10;
export const allowedPollDurationDays = [1, 3, 7, 10, 14, 30] as const;
export type PollDurationDays = (typeof allowedPollDurationDays)[number];

export type PollTimingFields = {
  status?: string | null;
  durationDays?: number | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  expiresAt?: string | Date | null;
  createdAt?: string | Date | null;
  publishedAt?: string | Date | null;
};

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizePollDurationDays(value: unknown) {
  const duration = Number(value);
  return allowedPollDurationDays.includes(duration as PollDurationDays) ? (duration as PollDurationDays) : defaultPollDurationDays;
}

export function calculatePollEndDate(start: Date, durationDays: number) {
  return new Date(start.getTime() + normalizePollDurationDays(durationDays) * dayMs);
}

export function getPollEndDate(poll: PollTimingFields) {
  const explicitEnd = toDate(poll.endsAt) || toDate(poll.expiresAt);
  if (explicitEnd) return explicitEnd;
  const start = toDate(poll.startsAt) || toDate(poll.publishedAt) || toDate(poll.createdAt);
  if (!start) return null;
  return calculatePollEndDate(start, poll.durationDays || defaultPollDurationDays);
}

export function isPollEnded(poll: PollTimingFields, now = Date.now()) {
  if (poll.status === "closed") return true;
  if (poll.status === "hidden" || poll.status === "deleted") return true;
  const endDate = getPollEndDate(poll);
  return Boolean(endDate && endDate.getTime() <= now);
}

export function isPollOpen(poll: PollTimingFields, now = Date.now()) {
  return poll.status === "active" && !isPollEnded(poll, now);
}
