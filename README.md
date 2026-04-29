# Nashmi / نشمي

منصة رقمية محايدة لتعزيز المشاركة السياسية والتواصل المنظم بين المواطنين والأحزاب والهيئة المستقلة.

نشمي هو جسر رقمي محايد بين المواطن والأحزاب والهيئة المستقلة، يرفع الوعي السياسي، يسهل فهم القوانين، ويمنح الشباب مساحة آمنة ومنظمة للتفاعل وصناعة الرأي العام.

## Tech Stack

- Next.js App Router + TypeScript + React
- Tailwind CSS with Arabic RTL UI
- MongoDB + Mongoose
- Zod validation
- bcryptjs password hashing
- jose JWT signed auth token in HttpOnly cookies
- Server-side RBAC in API routes
- Gemini AI assistant server-side integration

## Setup

```bash
npm install
cp .env.example .env.local
npm run seed
npm run dev
```

For a single local startup command that validates the environment, checks demo data, and starts the dev server:

```bash
npm run app
```

## Environment Variables

```bash
MONGODB_URI=
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
JWT_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
GEMINI_ENABLE_GOOGLE_SEARCH=false
GEMINI_MAX_HISTORY_MESSAGES=30
GEMINI_MAX_LAW_CONTEXT_RESULTS=6
GEMINI_TEMPERATURE=0.3
YOUTUBE_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
REQUIRE_EMAIL_VERIFICATION=false
MAX_UPLOAD_SIZE_MB=3
```

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

See [docs/DEMO_ACCOUNTS.md](docs/DEMO_ACCOUNTS.md).

ملاحظة: بعض حسابات الديمو تستخدم نطاق `sharek.demo` لأسباب توافقية في النسخة الحالية.

## Main Demo Flow

1. Open `/` and browse the neutral landing page.
2. Browse `/parties` as guest.
3. Try follow/vote/comment/report and see login prompt or 401 response.
4. Login as a citizen demo account.
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
- Chat refuses party recommendations and keeps Gemini API calls server-side.
- Uploads allow jpg/jpeg/png/webp only, reject SVG and executable extensions, enforce max size, generate server-side filenames, and check MIME plus file magic bytes.

## MVP Limitations

- Upload storage is local for development; production should switch to managed object storage.
- Rate limiting is in-memory and suitable for MVP/demo. Production should use Redis, Upstash, or another shared store.
- Google Search grounding is optional and disabled by default.
