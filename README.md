# Nashmi / نشمي

منصة عربية RTL تربط المواطنين والأحزاب والهيئة المستقلة للانتخاب عبر صفحات عامة، آخر المستجدات، القوانين المبسطة، التصويتات، التعليقات، والبلاغات.

## التوثيق الكامل

راجع التوثيق العربي الشامل:

[docs/SHAREK_FULL_DOCUMENTATION_AR.md](docs/SHAREK_FULL_DOCUMENTATION_AR.md)

## Tech Stack

- Next.js App Router + TypeScript + React
- Tailwind CSS
- MongoDB + Mongoose
- Zod validation
- JWT auth cookies عبر `jose`
- Cloudflare R2 للتخزين الدائم مع رفع مباشر من المتصفح عبر روابط PUT موقعة قصيرة العمر
- Gemini AI assistant server-side integration
- Resend للبريد التشغيلي والتحقق واستعادة كلمة المرور

## Setup

```bash
npm install
cp .env.example .env.local
npm run seed
npm run dev
```

أمر تشغيل محلي مع فحوص أولية:

```bash
npm run app
```

## Environment Variables

لا تضع الأسرار أو كلمات المرور الحقيقية في Git. استخدم `.env.local` محليًا و Vercel Environment Variables في الإنتاج.

```bash
MONGODB_URI=
JWT_SECRET=
GEMINI_API_KEY=
STORAGE_PROVIDER=cloudflare_r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=nashmi-media
R2_UPLOAD_EXPIRY_SECONDS=300
R2_DOWNLOAD_EXPIRY_SECONDS=300
MAX_UPLOAD_SIZE_MB=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=
EMAIL_FROM=Nashmi <no-reply@auth.nashmi.haitham.website>
EMAIL_ALLOWED_RECIPIENTS=
```

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run verify
npm run seed
npm run db:test
npm run sync-indexes
npm run recalculate-counters
npm run email:preview
npm run storage:inventory
npm run storage:migrate-r2
npm run storage:reconcile-r2
```

## Demo Accounts

راجع [docs/DEMO_ACCOUNTS.md](docs/DEMO_ACCOUNTS.md).

## Security Notes

- الصلاحيات مطبقة في صفحات dashboard و API routes.
- حساب الحزب ينشر باسم الحزب المرتبط به من الخادم.
- رفع الصور يتحقق من الامتداد و MIME والحجم ومحتوى الملف.
- أسرار R2 تبقى على الخادم، والعميل يحصل فقط على تفويض PUT محدود بمفتاح واحد وعملية واحدة ومدة قصيرة.
- الحاوية خاصة؛ الوسائط العامة تمر عبر رابط Nashmi ثابت يعيد التوجيه إلى GET موقع، والوسائط المحمية تتطلب تحقق الملكية/الدور أولًا.
