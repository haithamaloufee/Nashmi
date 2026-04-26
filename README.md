# Sharek / شارك

منصة رقمية محايدة لتعزيز المشاركة السياسية والتواصل المنظم بين المواطنين والأحزاب والهيئة المستقلة.

شارك هو جسر رقمي محايد بين المواطن والأحزاب والهيئة المستقلة، يرفع الوعي السياسي، يسهل فهم القوانين، ويمنح الشباب مساحة آمنة ومنظمة للتفاعل وصناعة الرأي العام.

## Tech Stack

- Next.js App Router + TypeScript + React
- Tailwind CSS with Arabic RTL UI
- MongoDB + Mongoose
- Zod validation
- bcryptjs password hashing
- jose JWT signed auth token in HttpOnly cookies
- Server-side RBAC in API routes
- Local upload fallback under `public/uploads`

## Setup

```bash
npm install
cp .env.example .env.local
npm run seed
npm run dev
```

For a single local startup command that installs dependencies, seeds when MongoDB is reachable, and starts the dev server:

```bash
npm run app
```

Set `MONGODB_URI` in `.env.local`. Local scripts load `.env` first and then `.env.local`, so machine-specific development values stay outside source control.

## Environment Variables

```bash
MONGODB_URI=
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
JWT_SECRET=
OPENAI_API_KEY=
YOUTUBE_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
REQUIRE_EMAIL_VERIFICATION=false
MAX_UPLOAD_SIZE_MB=3
```

`MONGODB_URI` and `JWT_SECRET` are required for the app runtime. `OPENAI_API_KEY` and `YOUTUBE_API_KEY` are optional. Without `OPENAI_API_KEY`, chat uses deterministic neutral local answers and the party-recommendation refusal rules still work.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run env:check
npm run db:test
npm run verify
npm run seed
npm run sync-indexes
npm run recalculate-counters
```

## Demo Accounts

All seeded accounts use:

```text
Password123!
```

| Role | Email |
| --- | --- |
| super_admin | admin@sharek.demo |
| iec | iec@sharek.demo |
| party | party1@sharek.demo |
| party | party2@sharek.demo |
| party | party3@sharek.demo |
| party | party4@sharek.demo |
| party | party5@sharek.demo |
| citizen | citizen1@sharek.demo |
| citizen | citizen2@sharek.demo |
| citizen | citizen3@sharek.demo |

## Main Demo Flow

1. Open `/` and browse the neutral landing page.
2. Browse `/parties` as guest.
3. Try follow/vote/comment/report and see login prompt or 401 response.
4. Login as `citizen1@sharek.demo`.
5. Follow a party, open `/updates`, vote once, then try a second vote.
6. Comment and report content.
7. Open `/laws`, view a law, and use the safe YouTube embed when present.
8. Open `/chat`, ask about a law, then ask for a party recommendation and see refusal.
9. Login as a party account and create posts/polls in `/party-dashboard`.
10. Login as admin and review reports/audit logs in `/admin`.

## Security Notes

- Auth tokens are stored only in HttpOnly SameSite cookies.
- API routes perform server-side auth, active-user checks, RBAC, and ownership checks.
- Party accounts derive `partyId` server-side from `Party.accountUserId`.
- Dangerous request keys containing `$` or `.` are rejected before validation.
- Public political content uses soft delete states.
- Poll votes are unique by `{ pollId, userId }` and only aggregate results are returned.
- Chat refuses party recommendations before any model path.
- Uploads allow jpg/jpeg/png/webp only, reject SVG and executable extensions, enforce max size, generate server-side filenames, and check MIME plus file magic bytes.

## Privacy Notes

- Parties never see individual poll votes.
- Follower identities are not exposed to parties in the MVP.
- Political interactions are not used for recommendations or ads.
- Chat is not given sensitive vote/follow data.
- Audit logs avoid passwords, tokens, and raw IP/user-agent values.

## MVP Limitations

- Email verification and password reset endpoints are safe stubs until a mail provider and secure token store are configured.
- Upload storage is local for development; production should switch the storage adapter to S3, Cloudinary, UploadThing, or another managed object store.
- Rate limiting is in-memory and suitable for MVP/demo. Production should use Redis, Upstash, or another shared store.
- The optional AI path currently falls back to deterministic local answers unless a model integration is added behind `OPENAI_API_KEY`.

## Deployment Notes

- Deploy on Vercel with `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, and `MAX_UPLOAD_SIZE_MB`.
- Use MongoDB Atlas for production.
- Run `npm run sync-indexes` once after deployment or let Mongoose build indexes during non-production setup.
- For production uploads, replace local writes in `/api/uploads` with S3/Cloudinary and keep the `MediaAsset` model unchanged.
