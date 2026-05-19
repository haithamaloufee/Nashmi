import { config } from "dotenv";
import { connectToDatabase } from "../src/lib/db";
import Poll from "../src/models/Poll";
import { calculatePollEndDate, defaultPollDurationDays, normalizePollDurationDays } from "../src/lib/polls";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  await connectToDatabase();
  const polls = await Poll.collection
    .find({
      status: { $ne: "deleted" },
      $or: [
        { endsAt: null },
        { endsAt: { $exists: false } },
        { startsAt: null },
        { startsAt: { $exists: false } },
        { durationDays: null },
        { durationDays: { $exists: false } }
      ]
    })
    .toArray();

  let updated = 0;
  for (const poll of polls) {
    const startsAt = poll.startsAt || poll.publishedAt || poll.createdAt || new Date();
    const durationDays = normalizePollDurationDays(poll.durationDays || defaultPollDurationDays);
    const endsAt = poll.endsAt || poll.expiresAt || calculatePollEndDate(startsAt, durationDays);
    await Poll.updateOne(
      { _id: poll._id },
      {
        $set: {
          startsAt,
          durationDays,
          endsAt,
          expiresAt: poll.expiresAt || endsAt
        }
      }
    );
    updated += 1;
  }

  const suspiciousPolls = await Poll.collection
    .find({
      status: { $ne: "deleted" },
      startsAt: { $exists: true, $ne: null },
      publishedAt: { $exists: true, $ne: null },
      endsAt: { $exists: true, $ne: null }
    })
    .toArray();

  let repaired = 0;
  for (const poll of suspiciousPolls) {
    const startsAt = poll.startsAt instanceof Date ? poll.startsAt : new Date(poll.startsAt);
    const publishedAt = poll.publishedAt instanceof Date ? poll.publishedAt : new Date(poll.publishedAt);
    const createdAt = poll.createdAt instanceof Date ? poll.createdAt : new Date(poll.createdAt || poll.publishedAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(publishedAt.getTime())) continue;

    const baselineStart = publishedAt || createdAt;
    const durationDays = normalizePollDurationDays(poll.durationDays || defaultPollDurationDays);
    const expectedEndFromCurrentStart = calculatePollEndDate(startsAt, durationDays).getTime();
    const currentEnd = poll.endsAt instanceof Date ? poll.endsAt : new Date(poll.endsAt);
    const looksDefaultedAfterPublish = startsAt.getTime() - baselineStart.getTime() > 60 * 60 * 1000;
    const looksScriptGenerated = !Number.isNaN(currentEnd.getTime()) && Math.abs(currentEnd.getTime() - expectedEndFromCurrentStart) < 1000;
    if (!looksDefaultedAfterPublish || !looksScriptGenerated) continue;

    const repairedEnd = calculatePollEndDate(baselineStart, durationDays);
    await Poll.updateOne(
      { _id: poll._id },
      {
        $set: {
          startsAt: baselineStart,
          durationDays,
          endsAt: repairedEnd,
          expiresAt: poll.expiresAt || repairedEnd
        }
      }
    );
    repaired += 1;
  }

  console.log(`Backfilled ${updated} polls; repaired ${repaired} defaulted poll timings`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
