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
- Vercel Blob للرفع الدائم في الإنتاج عند ضبط `BLOB_READ_WRITE_TOKEN`
- Gemini AI assistant server-side integration

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
BLOB_READ_WRITE_TOKEN=
MAX_UPLOAD_SIZE_MB=
NEXT_PUBLIC_APP_URL=
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
```

## Demo Accounts

راجع [docs/DEMO_ACCOUNTS.md](docs/DEMO_ACCOUNTS.md).

## Security Notes

- الصلاحيات مطبقة في صفحات dashboard و API routes.
- حساب الحزب ينشر باسم الحزب المرتبط به من الخادم.
- رفع الصور يتحقق من الامتداد و MIME والحجم ومحتوى الملف.
- الإنتاج يحتاج تخزين دائم مثل Vercel Blob، وليس runtime filesystem.
