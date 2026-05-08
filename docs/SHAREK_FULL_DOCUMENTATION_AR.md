# التوثيق الكامل لمنصة نشمي / شارك

## فهرس المحتويات

1. [ملخص تنفيذي](#ملخص-تنفيذي)
2. [مقدمة عامة](#مقدمة-عامة)
3. [وصف النظام](#وصف-النظام)
4. [رحلات المستخدم User Journeys](#رحلات-المستخدم-user-journeys)
5. [الأدوار والصلاحيات](#الأدوار-والصلاحيات)
6. [جداول الصلاحيات](#جداول-الصلاحيات)
7. [خريطة المسارات](#خريطة-المسارات)
8. [API Reference](#api-reference)
9. [Database Models](#database-models)
10. [إدارة الحسابات](#إدارة-الحسابات)
11. [إدارة الأحزاب](#إدارة-الأحزاب)
12. [إدارة الهيئة](#إدارة-الهيئة)
13. [القوانين وروابط YouTube والصور الخارجية](#القوانين-وروابط-youtube-والصور-الخارجية)
14. [المنشورات والتصويتات والتفاعل](#المنشورات-والتصويتات-والتفاعل)
15. [نظام رفع الصور والملفات](#نظام-رفع-الصور-والملفات)
16. [المكونات البرمجية المهمة](#المكونات-البرمجية-المهمة)
17. [إرشادات التصميم وتجربة المستخدم](#إرشادات-التصميم-وتجربة-المستخدم)
18. [الأمان والحماية](#الأمان-والحماية)
19. [دليل تشغيل المطور](#دليل-تشغيل-المطور)
20. [دليل النشر على Vercel](#دليل-النشر-على-vercel)
21. [دليل العرض أمام اللجنة](#دليل-العرض-أمام-اللجنة)
22. [الاختبار وضمان الجودة](#الاختبار-وضمان-الجودة)
23. [Checklist تسليم نهائي](#checklist-تسليم-نهائي)
24. [Troubleshooting](#troubleshooting)
25. [القيود والتحسينات المستقبلية](#القيود-والتحسينات-المستقبلية)
26. [Changelog](#changelog)
27. [FAQ تقنية](#faq-تقنية)
28. [قائمة ملفات مهمة](#قائمة-ملفات-مهمة)
29. [ملخص ختامي](#ملخص-ختامي)

> ملاحظة أمنية: هذا الملف لا يحتوي أي أسرار أو رموز وصول أو كلمات مرور حقيقية. أي قيمة سرية يجب أن تبقى في `.env.local` محليا أو في Environment Variables داخل Vercel.

## ملخص تنفيذي

منصة **نشمي / شارك** هي منصة ويب عربية موجهة للتوعية والمشاركة المدنية. تربط المنصة بين المواطن، الأحزاب السياسية، والهيئة المستقلة للانتخاب ضمن تجربة موحدة تعرض الأحزاب والقوانين وآخر المستجدات والتصويتات والتعليقات والبلاغات.

تم بناء المنصة لمعالجة مشكلة تشتت المعلومات الانتخابية والحزبية وصعوبة الوصول إلى شرح مبسط للقوانين ومتابعة محتوى الجهات الرسمية والحزبية في مكان واحد. القيمة الأساسية للمنصة هي تقديم معلومات منظمة ومحايدة، وتمكين المواطن من التفاعل بطريقة مضبوطة، وتمكين الحزب والهيئة من نشر المحتوى من خلال صلاحيات واضحة.

المستخدمون المستهدفون هم:

- **الزائر:** يتصفح المحتوى العام دون حساب.
- **المواطن:** يتفاعل بالتصويت والتعليق والبلاغات ومتابعة الأحزاب.
- **الحزب:** يدير ملف الحزب وينشر منشورات وتصويتات باسمه.
- **الهيئة IEC:** تدير ملف الهيئة وتنشر المستجدات والقوانين.
- **الإدارة:** تراقب المستخدمين والأحزاب والبلاغات والسجلات.

تقنيا، تتميز المنصة باستخدام Next.js App Router و MongoDB عبر Mongoose، وصلاحيات مبنية على الأدوار RBAC، وواجهات RTL عربية، وتخزين صور دائم مناسب لـ Vercel عبر Vercel Blob عند ضبط `BLOB_READ_WRITE_TOKEN`. كما تحتوي على طبقة تحقق للملفات وروابط آمنة للقوانين و YouTube.

حالة المشروع الحالية: مناسب للديمو والهاكاثون والتسليم التجريبي. قبل الإنتاج الحقيقي واسع النطاق، يحتاج إلى اختبارات E2E، مراقبة أخطاء مركزية، تخزين Blob مضبوط في الإنتاج، مراجعة أمنية أوسع، وربما rate limiting مشترك مثل Redis أو Upstash بدلا من التخزين الذاكري الحالي.

## مقدمة عامة

**اسم الموقع:** نشمي / شارك.

**فكرة الموقع:** منصة عربية باتجاه RTL تجمع المواطن، الأحزاب السياسية، والهيئة المستقلة للانتخاب في تجربة واحدة لعرض المعلومات العامة، آخر المستجدات، القوانين المبسطة، المنشورات، التصويتات، والتفاعل المجتمعي.

**الهدف:** تقديم مساحة موثوقة وسهلة الاستخدام لفهم المشهد الحزبي والانتخابي، ومتابعة محتوى الجهات، والتفاعل مع التصويتات والتعليقات والبلاغات ضمن صلاحيات واضحة.

**الفئة المستهدفة:** الزائر العام، المواطن المسجل، حسابات الأحزاب، حساب الهيئة، وفريق الإدارة.

**المشكلة التي يحلها الموقع:** تشتت معلومات الأحزاب والقوانين والتحديثات، وصعوبة الوصول إلى محتوى مبسط وآمن ومهيكل.

**القيمة التي يقدمها:** عرض مركزي للمعلومات، تجربة عربية RTL، حماية صلاحيات، واجهات إدارة، رفع صور دائم مناسب للنشر، وتوثيق واضح للمطورين واللجنة ومسؤول التشغيل.

## وصف النظام

النظام مبني بـ Next.js App Router و TypeScript و React، ويستخدم MongoDB مع Mongoose كنظام تخزين بيانات. الواجهة تعتمد Tailwind CSS ومكونات React Client/Server حسب الحاجة.

الموقع يحتوي على:

- صفحات عامة: الرئيسية، الأحزاب، صفحة الحزب، الهيئة، القوانين، تفاصيل القانون، آخر المستجدات، والمساعد الذكي.
- لوحات تحكم محمية: لوحة الحزب، لوحة الهيئة، لوحة الأدمن.
- API routes: للمصادقة، المستخدمين، الأحزاب، الهيئة، المنشورات، التصويتات، القوانين، البلاغات، الرفع، والسجلات.
- نماذج قاعدة بيانات: User, Party, AuthorityProfile, Post, Poll, Law, Comment, Report, AuditLog, MediaAsset وغيرها.

آخر المستجدات تعرض منشورات وتصويتات منشورة من الأحزاب والهيئة والإدارة. القوانين تعرض بطاقات قانونية مبسطة مع صورة أو YouTube عند توفره. التصويتات تسمح للمواطن بالتصويت مرة واحدة، وتعرض النتائج والنسب. التفاعل العام يشمل التعليقات، الإعجاب، عدم الإعجاب، والبلاغات.

## رحلات المستخدم User Journeys

### رحلة الزائر

**الخطوات:**

1. يدخل إلى `/`.
2. يقرأ مدخل المنصة وأقسام الصفحة الرئيسية.
3. ينتقل إلى `/parties` لاستعراض الأحزاب.
4. يفتح `/parties/[slug]` لمشاهدة تفاصيل حزب.
5. يزور `/iec` لمشاهدة صفحة الهيئة.
6. يفتح `/laws` ثم `/laws/[slug]` لقراءة قانون مبسط.
7. يزور `/updates` لمشاهدة المنشورات والتصويتات.

**الصفحات المستخدمة:** `/`, `/parties`, `/parties/[slug]`, `/iec`, `/laws`, `/laws/[slug]`, `/updates`, `/chat`.

**الصلاحيات:** عرض فقط. لا يستطيع التصويت أو التعليق أو البلاغ أو دخول الداشبورد.

**النتائج المتوقعة:** تصفح المحتوى العام ورؤية صور الناشرين وبيانات الأحزاب والهيئة والقوانين.

**أخطاء محتملة:** محاولة التصويت أو التعليق تؤدي إلى مطالبة بتسجيل الدخول أو رد 401 من API.

### رحلة المواطن

**الخطوات:**

1. يسجل حسابا عبر `/signup`.
2. يسجل الدخول عبر `/login`.
3. يدخل إلى `/account` لتعديل الاسم والصورة الشخصية.
4. يفتح `/updates` ويصوت على Poll.
5. يعلق على منشور أو تصويت.
6. يضغط إعجاب أو عدم إعجاب.
7. يرسل بلاغا على منشور أو تصويت أو تعليق أو حزب عند الحاجة.
8. يتابع حزبا من صفحة الحزب.

**الصفحات المستخدمة:** `/signup`, `/login`, `/account`, `/updates`, `/parties/[slug]`, `/laws`.

**الصلاحيات:** يستطيع التفاعل كمواطن. لا يستطيع النشر باسم حزب أو هيئة ولا دخول لوحات التحكم.

**النتائج المتوقعة:** تسجيل تصويت واحد لكل Poll، إنشاء تعليق منشور، تسجيل تفاعل، وفتح بلاغ بحالة `open`.

**أخطاء محتملة وطريقة التعامل معها:**

- تصويت مكرر: يعيد API خطأ تعارض 409.
- حساب غير نشط: `requireActiveUser` يمنع التفاعل.
- تعليق طويل أو فارغ: Zod validation يرفض المدخلات.

### رحلة الحزب

**الخطوات:**

1. يسجل الدخول بحساب دوره `party`.
2. يدخل `/party-dashboard`.
3. يعدل ملف الحزب من `/party-dashboard/profile`.
4. يرفع شعار الحزب وغلافه.
5. ينشئ منشورا من `/party-dashboard/posts`.
6. يضيف صورا أو فيديو للمنشور عند الحاجة.
7. ينشئ تصويتا من `/party-dashboard/polls`.
8. يتأكد أن المحتوى يظهر في `/updates` وصفحة الحزب العامة.

**الصلاحيات:** النشر باسم الحزب المرتبط بحقل `Party.accountUserId` فقط.

**النتائج المتوقعة:** تحديث `Party.logoUrl` و `Party.coverUrl`، إنشاء Post أو Poll مرتبط بـ `partyId`.

**أخطاء محتملة:** إذا لم يكن للحساب حزب مرتبط، يتم تحويله أو رفض العملية حسب المسار. إذا حاول إدخال `partyId` لحزب آخر، يتم اشتقاق الحزب من الخادم للحساب الحزبي ولا يعتمد على الواجهة.

### رحلة الهيئة IEC

**الخطوات:**

1. تسجل الدخول بحساب دوره `iec`.
2. تدخل `/iec-dashboard`.
3. تعدل شعار وغلاف الهيئة من `/iec-dashboard/profile`.
4. تنشر منشورا من `/iec-dashboard/posts`.
5. تضيف قانونا من `/iec-dashboard/laws`.
6. تضيف رابط YouTube أو صورة قانون مرفوعة أو رابط صورة خارجي.
7. تتحقق من ظهور منشورات الهيئة في `/updates` و `/iec`.

**الصلاحيات:** إدارة ملف الهيئة والقوانين والمنشورات باسم الهيئة.

**النتائج المتوقعة:** تخزين بيانات الهيئة في `AuthorityProfile`، وتخزين القوانين في `Law`، وظهور صورة الهيئة في كروت المنشورات والتصويتات.

**أخطاء محتملة:** رابط صورة غير آمن أو رابط YouTube غير صالح يرفضه validation.

### رحلة الأدمن

**الخطوات:**

1. يسجل الدخول بحساب `admin`.
2. يدخل `/admin`.
3. يراجع الإحصاءات العامة.
4. يدير المستخدمين من `/admin/users`.
5. يدير الأحزاب من `/admin/parties`.
6. يدير البلاغات من `/admin/reports`.
7. يراجع السجلات من `/admin/logs` أو `/admin/audit-logs`.
8. يراجع المحتوى من `/admin/moderation`.

**الصلاحيات:** إدارة واسعة حسب APIs المحمية. بعض عمليات تغيير أدوار المستخدمين مقيدة بحيث لا يستطيع admin العادي إدارة `super_admin` حسب `canManageUser`.

**أخطاء محتملة:** محاولة الدخول دون دور إداري تؤدي إلى تحويل للـ login أو 403 من API.

### رحلة Super Admin

**التمييز الأساسي:** الدور الفعلي في الكود هو `super_admin`. يمتلك صلاحيات أعلى من `admin` في إدارة المستخدمين، خاصة عند التعامل مع أدوار إدارية حساسة.

**الصفحات:** نفس صفحات `/admin`.

**النتائج المتوقعة:** إدارة كاملة للمستخدمين ضمن القيود الحالية في الكود.

## الأدوار والصلاحيات

الأدوار الفعلية في الكود موجودة في `src/lib/permissions.ts`:

- `citizen`
- `party`
- `iec`
- `admin`
- `super_admin`

> ملاحظة: إن ظهر في المتطلبات أو الكلام العام اسم `admin_super`، فالاسم الموجود فعليا في الكود هو `super_admin`.

### وصف مختصر لكل دور

| الدور | ماذا يستطيع أن يفعل | ماذا لا يستطيع أن يفعل |
|---|---|---|
| Guest | تصفح الصفحات العامة | التصويت، التعليق، البلاغ، الرفع، الداشبورد |
| Citizen | الحساب الشخصي، التصويت، التعليق، التفاعل، البلاغ، متابعة الأحزاب | النشر باسم حزب/هيئة، إدارة القوانين، دخول الإدارة |
| Party | تعديل حزبه، رفع شعار/غلاف، إنشاء منشورات وتصويتات باسمه | إدارة حزب آخر، إدارة المستخدمين، إدارة القوانين |
| IEC | تعديل ملف الهيئة، نشر منشورات الهيئة، إدارة القوانين | النشر باسم حزب، إدارة المستخدمين كأدمن |
| Admin | إدارة المستخدمين والأحزاب والبلاغات والقوانين والمحتوى | التحكم الكامل بـ super_admin |
| Super Admin | صلاحيات إدارية عليا | لا توجد صلاحيات خارج ما تنفذه APIs الحالية |

## جداول الصلاحيات

| الميزة | Guest | Citizen | Party | IEC | Admin | Super Admin |
|---|---|---|---|---|---|---|
| عرض الصفحات العامة | مسموح | مسموح | مسموح | مسموح | مسموح | مسموح |
| إنشاء حساب | مسموح | غير مطلوب | غير مسموح من الواجهة العامة | غير مسموح من الواجهة العامة | حسب لوحة الإدارة | حسب لوحة الإدارة |
| تسجيل الدخول | مسموح | مسموح | مسموح | مسموح | مسموح | مسموح |
| تعديل الملف الشخصي | غير مسموح | مسموح | مسموح | مسموح | مسموح | مسموح |
| رفع صورة حساب | غير مسموح | مسموح | مسموح | مسموح | مسموح | مسموح |
| نشر منشور | غير مسموح | غير مسموح | حسب الملكية | مسموح باسم الهيئة | مسموح | مسموح |
| إنشاء تصويت | غير مسموح | غير مسموح | حسب الملكية | مسموح باسم الهيئة | مسموح | مسموح |
| التصويت على Poll | غير مسموح | مسموح | غير مسموح | غير مسموح | غير مسموح | غير مسموح |
| التعليق | غير مسموح | مسموح | غير مسموح حسب API الحالي | غير مسموح حسب API الحالي | غير مسموح حسب API الحالي | غير مسموح حسب API الحالي |
| الإعجاب/عدم الإعجاب | غير مسموح | مسموح للمسجلين حسب API | مسموح للمسجلين حسب API | مسموح للمسجلين حسب API | مسموح للمسجلين حسب API | مسموح للمسجلين حسب API |
| إرسال بلاغ | غير مسموح | مسموح | مسموح | مسموح | مسموح | مسموح |
| متابعة حزب | غير مسموح | مسموح | غير مسموح | غير مسموح | غير مسموح | غير مسموح |
| إدارة البلاغات | غير مسموح | غير مسموح | غير مسموح | غير مسموح | مسموح | مسموح |
| إدارة المستخدمين | غير مسموح | غير مسموح | غير مسموح | غير مسموح | حسب الصلاحية | مسموح |
| تغيير أدوار المستخدمين | غير مسموح | غير مسموح | غير مسموح | غير مسموح | حسب الصلاحية | مسموح |
| إدارة الأحزاب | غير مسموح | غير مسموح | حزب مرتبط فقط | غير مسموح | مسموح | مسموح |
| إدارة القوانين | غير مسموح | غير مسموح | غير مسموح | مسموح | مسموح | مسموح |
| مشاهدة Audit Logs | غير مسموح | غير مسموح | غير مسموح | غير مسموح | مسموح | مسموح |
| رفع وسائط منشورات | غير مسموح | مسموح تقنيا عبر API للمسجلين، لكن النشر محصور بصناع المحتوى | مسموح | مسموح | مسموح | مسموح |

## خريطة المسارات

### صفحات التطبيق

| المسار | النوع | الدور المسموح | الوصف | البيانات | ملاحظات |
|---|---|---|---|---|---|
| `/` | عام | الجميع | الصفحة الرئيسية | إحصاءات ومنشورات وتصويتات حديثة | Server-rendered |
| `/login` | عام | الجميع | تسجيل الدخول | email/password | يستخدم AuthForm |
| `/signup` | عام | الجميع | تسجيل مواطن | name/email/password | الدور الافتراضي citizen |
| `/account` | محمي | أي مستخدم مسجل | إدارة الحساب والصورة | SafeUser | يستخدم AccountProfileForm |
| `/updates` | عام | الجميع | آخر المستجدات | Post/Poll feed | التفاعل يحتاج تسجيل دخول |
| `/laws` | عام | الجميع | قائمة القوانين | Law list/categories | يستخدم LawCard |
| `/laws/[slug]` | عام مع أدوات إدارة | الجميع، أدوات الإدارة لـ IEC/Admin | تفاصيل قانون | Law | YouTube embed عند توفره |
| `/parties` | عام | الجميع | قائمة الأحزاب | Party list | بحث حسب المتاح |
| `/parties/[slug]` | عام | الجميع | صفحة حزب | Party/Post/Poll | متابعة الحزب للمواطن |
| `/iec` | عام | الجميع | صفحة الهيئة | AuthorityProfile/Post/Poll | تعرض شعار وغلاف الهيئة |
| `/chat` | عام/تجريبي | الجميع حسب الواجهة | المساعد الذكي | Chat data | يعتمد على Gemini إذا كان مضبوطا |
| `/party-dashboard` | لوحة تحكم | party | ملخص الحزب | Party stats | محمي بالـ middleware |
| `/party-dashboard/profile` | لوحة تحكم | party | تعديل ملف الحزب | Party | شعار وغلاف وروابط |
| `/party-dashboard/posts` | لوحة تحكم | party | إنشاء وعرض منشورات | Post | النشر باسم الحزب المرتبط |
| `/party-dashboard/polls` | لوحة تحكم | party | إنشاء وعرض تصويتات | Poll | تصويتات الحزب |
| `/iec-dashboard` | لوحة تحكم | iec | ملخص الهيئة | IEC data | محمي |
| `/iec-dashboard/profile` | لوحة تحكم | iec | تعديل ملف الهيئة | AuthorityProfile | شعار وغلاف |
| `/iec-dashboard/posts` | لوحة تحكم | iec | منشورات الهيئة | Post | النشر باسم الهيئة |
| `/iec-dashboard/laws` | لوحة تحكم | iec | إدارة قوانين الهيئة | Law | إضافة قانون |
| `/admin` | لوحة إدارة | admin/super_admin | ملخص إداري | Stats | محمي |
| `/admin/users` | لوحة إدارة | admin/super_admin | إدارة مستخدمين | User | أدوار وحالة |
| `/admin/parties` | لوحة إدارة | admin/super_admin | إدارة أحزاب | Party | إنشاء/تحديث |
| `/admin/reports` | لوحة إدارة | admin/super_admin | إدارة بلاغات | Report | إجراءات moderation |
| `/admin/logs` | لوحة إدارة | admin/super_admin | سجلات | AuditLog | صفحة إدارية |
| `/admin/audit-logs` | لوحة إدارة | admin/super_admin | سجلات تدقيق | AuditLog | endpoint مستقل |
| `/admin/laws` | لوحة إدارة | admin/super_admin | إدارة قوانين | Law | إضافة/تعديل |
| `/admin/moderation` | لوحة إدارة | admin/super_admin | مراجعة محتوى | Post/Poll/Comment/Report | إخفاء/حذف/استعادة |

### API Routes

| المسار | النوع | الدور | وصف مختصر |
|---|---|---|---|
| `/api/auth/signup` | API | عام | إنشاء حساب |
| `/api/auth/login` | API | عام | تسجيل الدخول |
| `/api/auth/logout` | API | مسجل | إنهاء الجلسة |
| `/api/auth/me` | API | مسجل | المستخدم الحالي |
| `/api/auth/request-password-reset` | API | عام | طلب إعادة تعيين |
| `/api/auth/reset-password` | API | عام | إعادة تعيين |
| `/api/auth/verify-email` | API | عام | تحقق بريد إذا مفعل |
| `/api/users/me` | API | مسجل | تحديث بيانات الحساب |
| `/api/account/avatar` | API | مسجل | رفع/حذف صورة الحساب |
| `/api/uploads` | API | مسجل | رفع وسائط عامة |
| `/api/updates` | API | عام | آخر المستجدات مع فلاتر |
| `/api/posts` | API | عام للقراءة، صناع محتوى للإنشاء | منشورات |
| `/api/posts/[id]` | API | حسب الصلاحية | تحديث/حذف منشور |
| `/api/posts/[id]/comments` | API | عام للقراءة، citizen للإنشاء | تعليقات منشور |
| `/api/posts/[id]/reaction` | API | مسجل | تفاعل منشور |
| `/api/polls` | API | عام للقراءة، صناع محتوى للإنشاء | تصويتات |
| `/api/polls/[id]` | API | حسب الصلاحية | تحديث/حذف تصويت |
| `/api/polls/[id]/vote` | API | citizen | تصويت |
| `/api/polls/[id]/comments` | API | عام للقراءة، citizen للإنشاء | تعليقات تصويت |
| `/api/polls/[id]/reaction` | API | مسجل | تفاعل تصويت |
| `/api/laws` | API | عام | قائمة قوانين |
| `/api/laws/[law]` | API | عام | قانون محدد |
| `/api/laws/[law]/view` | API | عام | زيادة عداد مشاهدة |
| `/api/parties` | API | عام | قائمة أحزاب |
| `/api/parties/[party]` | API | عام | حزب محدد |
| `/api/parties/[party]/follow` | API | citizen | متابعة حزب |
| `/api/parties/[party]/stats` | API | عام | إحصاءات حزب |
| `/api/party/profile` | API | party | ملف الحزب المرتبط |
| `/api/iec/profile` | API | iec | ملف الهيئة |
| `/api/reports` | API | مسجل | إنشاء بلاغ |
| `/api/admin/*` | API | admin/super_admin أو iec للقوانين | إدارة |
| `/api/chat*` | API | حسب المسار | المساعد والجلسات |

## API Reference

### Auth

| Method | Path | الغرض | الدور | Body | Response | أخطاء شائعة | ملاحظات أمنية |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/signup` | إنشاء حساب مواطن | عام | `name`, `email`, `password` | SafeUser أو جلسة حسب التنفيذ | بريد مكرر، كلمة مرور قصيرة | passwordHash فقط يخزن |
| POST | `/api/auth/login` | تسجيل الدخول | عام | `email`, `password` | Cookie جلسة | بيانات خاطئة، حساب مقفل | HttpOnly cookie |
| POST | `/api/auth/logout` | خروج | مسجل | لا يوجد | نجاح | لا يوجد غالبا | يمسح cookie |
| GET | `/api/auth/me` | جلب المستخدم الحالي | مسجل | لا يوجد | SafeUser | 401 | لا يرجع passwordHash |
| POST | `/api/auth/request-password-reset` | طلب إعادة تعيين | عام | email | رسالة عامة | بريد غير صالح | لا يجب كشف وجود البريد |
| POST | `/api/auth/reset-password` | تعيين كلمة جديدة | عام | token/password | نجاح | token غير صالح | لا توثق token في Git |
| POST/GET | `/api/auth/verify-email` | تحقق البريد | عام | token حسب التنفيذ | نجاح/فشل | token غير صالح | مرتبط بإعداد `REQUIRE_EMAIL_VERIFICATION` |

### Account و Uploads

| Method | Path | الغرض | الدور | Body | Response | أخطاء شائعة | ملاحظات أمنية |
|---|---|---|---|---|---|---|---|
| PATCH | `/api/users/me` | تحديث اسم/نبذة/لغة | مسجل | `name`, `bio`, `language` | SafeUser | Validation | لا يرجع passwordHash |
| POST | `/api/account/avatar` | رفع صورة شخصية | مسجل | `multipart/form-data` باسم `avatar` | SafeUser مع `avatarUrl` | نوع غير مسموح، Blob غير مضبوط | يتحقق من MIME و magic bytes |
| DELETE | `/api/account/avatar` | حذف صورة الحساب | مسجل | لا يوجد | SafeUser | 401 | يضبط `avatarUrl` إلى null |
| POST | `/api/uploads` | رفع وسائط منشور/قانون/شعار | مسجل | `multipart/form-data` باسم `file` | MediaAsset | حجم كبير، امتداد غير مسموح | Vercel Blob في الإنتاج |
| DELETE | `/api/uploads?assetId=` | حذف منطقي للملف | مالك الملف | query `assetId` | MediaAsset status deleted | ملف غير موجود | لا يحذف من Blob حاليا، يغير status |

### Updates و Posts

| Method | Path | الغرض | الدور | Body/Query | Response | أخطاء شائعة | ملاحظات |
|---|---|---|---|---|---|---|---|
| GET | `/api/updates` | Feed موحد | عام | `filter`, `search`, `cursor`, `limit` | `updates`, `nextCursor` | filter followed دون دخول | يرفق صورة الهيئة |
| GET | `/api/posts` | جلب منشورات | عام | `limit`, `search`, `partyId`, `filter` | posts | لا يوجد | populate للناشر والوسائط |
| POST | `/api/posts` | إنشاء منشور | party/iec/admin/super_admin | `title`, `content`, `tags`, `mediaIds`, `partyId` | post | محتوى فارغ، role غير مصرح | حزب party يشتق من الحساب |
| PATCH | `/api/posts/[id]` | تحديث منشور | مصرح | post patch | post | 403/404 | حسب منطق المسار |
| DELETE | `/api/posts/[id]` | حذف/إخفاء منشور | مصرح | لا يوجد أو سبب | post | 403/404 | soft delete غالبا |
| GET | `/api/posts/[id]/comments` | تعليقات منشور | عام | cursor/limit | comments | 404 | published فقط |
| POST | `/api/posts/[id]/comments` | تعليق على منشور | citizen | `content` | comment | rate limit، محتوى غير صالح | citizen فقط حسب الكود |
| POST | `/api/posts/[id]/reaction` | إعجاب/عدم إعجاب | مسجل | `type` | counts | type غير صالح | unique per user |

### Polls

| Method | Path | الغرض | الدور | Body/Query | Response | أخطاء شائعة | ملاحظات |
|---|---|---|---|---|---|---|---|
| GET | `/api/polls` | جلب تصويتات | عام | `limit`, `partyId`, `filter` | polls | لا يوجد | active فقط |
| POST | `/api/polls` | إنشاء تصويت | party/iec/admin/super_admin | `question`, `description`, `options`, `resultsVisibility` | poll | خيارات مكررة | خيارات 2 إلى 6 |
| PATCH | `/api/polls/[id]` | تحديث تصويت | مصرح | poll patch | poll | 403/404 | حسب المسار |
| POST | `/api/polls/[id]/vote` | تسجيل صوت | citizen | `optionId` | poll محدث | تصويت مكرر 409، منتهي | unique `{pollId,userId}` |
| GET/POST | `/api/polls/[id]/comments` | تعليقات تصويت | عام/citizen | content | comments/comment | 401/validation | citizen فقط للإنشاء |
| POST | `/api/polls/[id]/reaction` | تفاعل تصويت | مسجل | `type` | counts | type غير صالح | unique per user |

### Laws

| Method | Path | الغرض | الدور | Body/Query | Response | أخطاء شائعة | ملاحظات أمنية |
|---|---|---|---|---|---|---|---|
| GET | `/api/laws` | قائمة القوانين | عام | `search`, `category`, `cursor` | laws/categories | لا يوجد | published فقط |
| GET | `/api/laws/[law]` | قانون محدد | عام | path | law | 404 | حسب slug/id في التنفيذ |
| POST | `/api/laws/[law]/view` | زيادة المشاهدة | عام | لا يوجد | success | 404 | لا يحتاج دخول |
| GET | `/api/admin/laws` | إدارة القوانين | iec/admin/super_admin | لا يوجد | laws | 403 | محمي |
| POST | `/api/admin/laws` | إنشاء قانون | iec/admin/super_admin | law payload | law | رابط غير آمن، slug غير صالح | يقبل YouTube ID أو URL |
| PATCH | `/api/admin/laws/[id]` | تعديل قانون | iec/admin/super_admin | law patch | law | 404/validation | ينشئ LawVersion عند تغير المعنى |
| DELETE | `/api/admin/laws/[id]` | إخفاء قانون | iec/admin/super_admin | لا يوجد | law | 404 | status hidden |

### Parties و IEC

| Method | Path | الغرض | الدور | Body/Query | Response | أخطاء شائعة | ملاحظات |
|---|---|---|---|---|---|---|---|
| GET | `/api/parties` | قائمة أحزاب | عام | search | parties | لا يوجد | active |
| GET | `/api/parties/[party]` | حزب محدد | عام | id/slug | party | 404 | بيانات عامة |
| POST | `/api/parties/[party]/follow` | متابعة حزب | citizen | لا يوجد | followed/count | 401 | unique follow |
| GET | `/api/parties/[party]/stats` | إحصاءات حزب | عام | لا يوجد | stats | 404 | للعرض |
| GET | `/api/party/profile` | ملف الحزب للحساب | party | لا يوجد | party | لا يوجد حزب مرتبط | ownership |
| PATCH | `/api/party/profile` | تحديث ملف الحزب | party | party fields | party | URL غير آمن | يعدل الحزب المرتبط فقط |
| GET | `/api/iec/profile` | ملف الهيئة | iec | لا يوجد | authority | 404 | slug ثابت |
| PATCH | `/api/iec/profile` | تحديث شعار/غلاف الهيئة | iec | `logoUrl`, `coverUrl` | authority | URL غير آمن | محمي |

### Admin و Reports

| Method | Path | الغرض | الدور | Body/Query | Response | أخطاء شائعة | ملاحظات |
|---|---|---|---|---|---|---|---|
| POST | `/api/reports` | إنشاء بلاغ | مسجل | `targetType`, `targetId`, `reason`, `details` | report | هدف غير موجود | rate limited |
| GET | `/api/admin/reports` | عرض بلاغات | admin/super_admin | filters | reports | 403 | محمي |
| PATCH | `/api/admin/reports/[id]` | إجراء على بلاغ | admin/super_admin | `action`, `reason` | report | reason ناقص | يكتب audit |
| GET/POST | `/api/admin/users` | إدارة مستخدمين | admin/super_admin | user payload | users/user | صلاحيات | لا توثق كلمات مرور حقيقية |
| PATCH | `/api/admin/users/[id]/role` | تغيير دور | admin/super_admin | `role` | user | ممنوع على super_admin لغير المصرح | canManageUser |
| PATCH | `/api/admin/users/[id]/status` | تغيير حالة | admin/super_admin | `status` | user | 404 | active/disabled/pending/locked |
| GET/POST | `/api/admin/parties` | إدارة أحزاب | admin/super_admin | party payload | parties/party | slug مكرر | يمكن إنشاء حساب حزب |
| PATCH | `/api/admin/parties/[id]` | تعديل حزب | admin/super_admin | party patch | party | 404 | logoUrl آمن |
| GET | `/api/admin/audit-logs` | سجلات تدقيق | admin/super_admin | filters | logs | 403 | لا تحتوي أسرار |
| DELETE/PATCH | `/api/admin/comments/[id]` | إدارة تعليق | admin/super_admin | moderation | comment | 404 | soft moderation |

### Chat

| Method | Path | الغرض | الدور | ملاحظات |
|---|---|---|---|---|
| POST | `/api/chat` | إرسال رسالة للمساعد | حسب تنفيذ المسار | يعتمد على Gemini |
| GET/POST | `/api/chat/sessions` | جلسات المحادثة | مستخدم حسب التنفيذ | يخزن ChatSession |
| GET/PATCH/DELETE | `/api/chat/sessions/[id]` | جلسة محددة | مالك الجلسة غالبا | status active/archived/deleted |
| GET/POST | `/api/chat/sessions/[id]/messages` | رسائل جلسة | مالك الجلسة | ChatMessage |
| GET/POST | `/api/chat/law/[lawId]` | سياق قانون | حسب التنفيذ | يزيد استخدام القانون في المساعد |

## Database Models

### User

**الهدف:** تمثيل كل حساب في النظام.

| الحقل | النوع | الوصف |
|---|---|---|
| `name` | String | اسم المستخدم |
| `email`, `emailNormalized` | String | البريد وأداة البحث/التفرد |
| `emailVerified` | Boolean | حالة التحقق |
| `passwordHash` | String/null | hash وليس كلمة المرور |
| `image`, `avatarUrl` | String/null | صورة خارجية/مرفوعة |
| `role` | enum | `citizen`, `party`, `iec`, `admin`, `super_admin` |
| `provider`, `googleId` | enum/String | اعتماديات |
| `status` | enum | `active`, `disabled`, `pending`, `locked` |
| `bio`, `language` | String | بيانات حساب |
| `failedLoginCount`, `lockedUntil`, `lastLoginAt` | Number/Date | أمان الدخول |

**العلاقات:** يرتبط بـ Party عبر `Party.accountUserId`، وبـ Post/Poll/Comment/Report/AuditLog كفاعل أو مالك.

**من يقرأه:** auth, admin, comments, cards.

**من يعدله:** المستخدم لنفسه، الأدمن للمستخدمين، auth عند الدخول.

### Party

**الهدف:** تمثيل الحزب السياسي وبياناته العامة.

أهم الحقول: `name`, `slug`, `logoMediaId`, `coverMediaId`, `logoUrl`, `coverUrl`, `shortDescription`, `description`, `foundedYear`, `vision`, `goals`, `socialLinks`, `officialRegistry`, `contact`, `statistics`, `committees`, `latestAchievements`, `accountUserId`, `createdByAdminId`, `followersCount`, `postsCount`, `pollsCount`, `status`, `isVerified`, `searchNormalized`.

**العلاقات:** `accountUserId` مع User، `logoMediaId/coverMediaId` مع MediaAsset، و Post/Poll عبر `partyId`.

**من يعدله:** حساب الحزب المرتبط أو الأدمن.

**ملاحظة أمنية:** حساب party لا يختار الحزب بحرية عند النشر؛ الخادم يستخدم `requirePartyForUser`.

### AuthorityProfile

**الهدف:** ملف الهيئة المستقلة للانتخاب.

أهم الحقول: `name`, `slug`, `shortDescription`, `description`, `establishedYear`, `vision`, `mission`, `goals`, `logoMediaId`, `coverMediaId`, `logoUrl`, `coverUrl`, `contact`, `socialLinks`, `officialLinks`, `statistics`, `source`, `status`.

**العلاقات:** MediaAsset للشعار/الغلاف. منشورات الهيئة ترتبط بـ `Post.authorType = "iec"` وليس `authorityId`.

### Post

**الهدف:** منشور عام في المنصة.

أهم الحقول: `authorType`, `authorUserId`, `partyId`, `title`, `content`, `mediaIds`, `tags`, `likesCount`, `dislikesCount`, `commentsCount`, `viewsCount`, `visibility`, `status`, `publishedAt`, `searchNormalized`, `deletedAt`, `deletedBy`, `moderationReason`.

**العلاقات:** User, Party, MediaAsset, Comment, PostReaction, Report.

**من يعدله:** صانع المحتوى أو الإدارة حسب API.

### Poll

**الهدف:** تصويت أحادي الاختيار.

أهم الحقول: `authorType`, `authorUserId`, `partyId`, `question`, `description`, `options[{text,votesCount}]`, `pollType`, `allowedVoterRoles`, `resultsVisibility`, `allowVoteChange`, `optionsLockedAt`, `totalVotes`, counts, `expiresAt`, `status`, `publishedAt`.

**العلاقات:** User/Party كناشر، PollVote للتصويت، PollReaction للتفاعل، Comment للتعليقات.

**ملاحظة:** التصويت الحالي للمواطن فقط، والتغيير غير مسموح لأن `allowVoteChange` مضبوط على false.

### PollVote

**الهدف:** منع التصويت المكرر وتسجيل الخيار.

الحقول: `pollId`, `userId`, `optionId`. يوجد index فريد على `{pollId,userId}`.

### Law

**الهدف:** تخزين القانون المبسط ومصادره.

أهم الحقول: `title`, `slug`, `category`, `sourceName`, `sourceType`, `articleNumber`, `officialReferenceUrl`, `originalText`, `shortDescription`, `simplifiedExplanation`, `practicalExample`, `youtubeVideoId`, `youtubeUrl`, `thumbnailUrl`, `tags`, `createdByUserId`, `updatedByUserId`, `reviewedByUserId`, `lastVerifiedAt`, `status`, `viewsCount`, `askedChatbotCount`.

**العلاقات:** User للإنشاء/التحديث/المراجعة، LawVersion عند تغييرات جوهرية، ChatMessage كمصدر.

### LawVersion

**الهدف:** حفظ نسخة قبل تعديل معنى القانون.

الحقول: `lawId`, `title`, `originalText`, `simplifiedExplanation`, `changedByUserId`, `changeReason`.

### Comment

**الهدف:** تعليقات على post أو poll.

الحقول: `targetType`, `targetId`, `authorUserId`, `authorRoleSnapshot`, `partyId`, `content`, `status`, `reportsCount`, `isEdited`, `editedAt`, `hiddenReason`, `moderatedBy`, `moderatedAt`, `deletedAt`, `deletedBy`.

**ملاحظة:** إنشاء التعليقات في APIs الحالية محصور بالمواطن `citizen`.

### Report

**الهدف:** بلاغ على منشور أو تصويت أو تعليق أو حزب.

الحقول: `targetType`, `targetId`, `reporterUserId`, `reason`, `details`, `status`, `reviewedBy`, `reviewedAt`.

### AuditLog

**الهدف:** سجل تدقيق للعمليات الحساسة.

الحقول: `actorUserId`, `actorRole`, `action`, `targetType`, `targetId`, `metadata`, `ipHash`, `userAgentHash`.

**ملاحظة أمنية:** لا يجب وضع secrets داخل `metadata`.

### MediaAsset

**الهدف:** تمثيل ملف مرفوع.

الحقول: `ownerUserId`, `url`, `storageKey`, `mimeType`, `sizeBytes`, `width`, `height`, `type`, `status`.

**الاستخدام:** صور المنشورات، صور القوانين، الشعار/الغلاف عند ربطها أو حفظ URL النهائي.

### Reactions

`PostReaction` و `PollReaction` يخزنان `postId/pollId`, `userId`, و `type` بقيم `like` أو `dislike`. يوجد index فريد لكل مستخدم وهدف.

### PartyFollower

يخزن متابعة المواطن للحزب عبر `partyId` و `userId` مع index فريد.

### ModerationAction

يسجل إجراءات moderation مثل `hide`, `delete`, `restore`, `dismiss_report` مع السبب والفاعل.

### ChatSession و ChatMessage

يمثلان جلسات ورسائل المساعد الذكي. `ChatMessage` يحتوي مصادر قوانين أو أحزاب وحقول grounding ومؤشرات أمان.

## إدارة الحسابات

التسجيل يتم من `/signup`، والدخول من `/login`. الجلسة تعتمد على JWT cookie عبر `src/lib/jwt.ts` و `src/lib/cookies.ts`. `getCurrentUser` يقرأ cookie ويتحقق من token ثم يجلب المستخدم دون `passwordHash`.

حماية الجلسة:

- `middleware.ts` يحمي `/admin`, `/party-dashboard`, `/iec-dashboard`.
- `requireActiveUser` يحمي API routes ويتأكد أن `status` هو `active`.
- `SafeUser` يمنع إرجاع الحقول الحساسة للواجهة.

ربط الحساب بالدور:

- المواطن: الدور الافتراضي `citizen`.
- الحزب: حساب `party` مرتبط بسجل في Party.
- الهيئة: حساب `iec` يدير AuthorityProfile.
- الأدمن: `admin`.
- الأدمن الأعلى: `super_admin`.

## إدارة الأحزاب

الأحزاب تعرض في `/parties` وتفاصيلها في `/parties/[slug]`. الحزب يستطيع تعديل ملفه من `/party-dashboard/profile`، ورفع الشعار والغلاف، وإنشاء منشورات وتصويتات من صفحات الداشبورد.

الحقول التي تظهر للمستخدم تشمل الوصف، الرؤية، الأهداف، الروابط، التواصل، الفروع، اللجان، الإحصاءات، الإنجازات، حالة التوثيق، وعدد المتابعين.

القيود الأمنية:

- الحزب لا يستطيع النشر باسم حزب آخر.
- `Party.accountUserId` هو رابط الملكية.
- الإدارة تستطيع إدارة الأحزاب من `/admin/parties`.

## إدارة الهيئة

ملف الهيئة مخزن في `AuthorityProfile` بسجل slug ثابت `independent-election-commission`. تعرض صفحة `/iec` الشعار والغلاف والبيانات الرسمية والروابط والمنشورات والتصويتات.

حساب `iec` يستطيع:

- تعديل `logoUrl` و `coverUrl`.
- إنشاء منشورات باسم الهيئة.
- إدارة القوانين عبر API admin laws.

منشورات الهيئة وتصويتاتها تعرض صورة الهيئة في الكرت عبر إرفاق `authorityAuthor` عند الجلب من `serverData` و `/api/updates`.

## القوانين وروابط YouTube والصور الخارجية

### حقول القانون

القانون يحتوي على بيانات تعريفية ومحتوى مبسط وحقول وسائط:

- `youtubeVideoId`: معرف الفيديو.
- `youtubeUrl`: رابط YouTube الموحد.
- `thumbnailUrl`: صورة القانون أو thumbnail.
- `officialReferenceUrl`: الرابط الرسمي.

### قبول روابط YouTube

النظام يقبل:

- معرف فيديو مباشر، مثل: `abc123XYZ_9`
- رابط watch، مثل: `https://www.youtube.com/watch?v=abc123XYZ_9`
- رابط مختصر، مثل: `https://youtu.be/abc123XYZ_9`
- روابط embed/shorts/live المدعومة من `src/lib/youtube.ts`.

يتم استخراج ID عبر `extractYoutubeVideoId`، ثم توليد رابط موحد عبر `normalizeYoutubeInput`. إذا لم ترسل صورة، يحاول النظام توليد thumbnail بصيغة `https://i.ytimg.com/vi/{id}/hqdefault.jpg`.

### قواعد الأمان للروابط

الروابط العامة الآمنة في القوانين تقبل `http` و `https` فقط. يتم رفض:

- `javascript:alert(1)`
- `data:image/svg+xml,...`
- روابط تحتوي credentials مثل `https://user:pass@example.com`
- روابط غير قابلة للتحليل كـ URL.

سبب الرفض هو منع XSS، منع تحميل payloads خطرة، ومنع تسريب اعتماديات داخل URL.

### العرض

`LawCard` يعرض الصورة المصغرة إن وجدت، ويعرض مؤشر فيديو عند وجود `youtubeVideoId`. صفحة `/laws/[slug]` تعرض الصورة والفيديو داخل iframe آمن من `youtube-nocookie.com`، مع رابط لفتح الفيديو في تبويب جديد.

## المنشورات والتصويتات والتفاعل

### المنشورات

المنشور ينشأ من `party`, `iec`, أو `admin`. يظهر في `/updates`، وفي صفحة الحزب أو الهيئة عند ارتباطه. المرفقات محفوظة كـ `MediaAsset` وتعرض عبر `SafeImage` أو `<video>`.

### التصويتات

التصويت يحتوي سؤالا وخيارات. المواطن فقط يصوت عبر `/api/polls/[id]/vote`. عند التصويت، ينشأ `PollVote` ثم تزيد `votesCount` و `totalVotes`.

كرت التصويت بعد التعديل يحتوي:

- صورة الناشر.
- اسم الناشر.
- نوع الحساب.
- تاريخ النشر.
- badge "تصويت".
- خيارات مع progress bars ونسب وأعداد.

### التعليقات والإعجابات والبلاغات

التعليقات على المنشورات والتصويتات تستخدم `Comment`. الإعجاب وعدم الإعجاب يستخدمان `PostReaction` و `PollReaction`. البلاغات تستخدم `Report` وتنتقل للإدارة للمراجعة.

## نظام رفع الصور والملفات

### الملفات المسؤولة

- `src/lib/storage.ts`: طبقة التخزين.
- `src/lib/uploadValidation.ts`: تحقق الملفات.
- `src/app/api/uploads/route.ts`: رفع وسائط عامة.
- `src/app/api/account/avatar/route.ts`: رفع صورة الحساب.
- `src/components/ui/MediaUploadField.tsx`: واجهة الرفع.

### شرح `storage.ts`

الدالة `storePublicFile` تستقبل `buffer`, `storageKey`, و `contentType`.

السلوك:

1. إذا وجد `BLOB_READ_WRITE_TOKEN` تستخدم Vercel Blob عبر `put`.
2. إذا لم يوجد token وكان التطبيق في production أو Vercel، ترمي الخطأ `BLOB_STORAGE_NOT_CONFIGURED`.
3. إذا كان التشغيل محليا فقط، تحفظ داخل `public/uploads`.

الـ fallback المحلي للتطوير فقط لأن ملفات runtime على Vercel لا تبقى بعد redeploy ولا تصلح كتخزين دائم.

### شرح `uploadValidation.ts`

يتحقق من:

- الامتداد.
- MIME type.
- الحجم عبر `MAX_UPLOAD_SIZE_MB`.
- magic bytes لمحتوى الملف.
- منع امتدادات تنفيذية و SVG.

الصيغ المسموحة:

| النوع | الصيغ |
|---|---|
| صور | jpg, jpeg, png, webp, gif, avif, heic, heif |
| فيديو | mp4, webm |

### أين تخزن الروابط

- صورة المستخدم: `User.avatarUrl`.
- شعار الحزب: `Party.logoUrl`.
- غلاف الحزب: `Party.coverUrl`.
- شعار الهيئة: `AuthorityProfile.logoUrl`.
- غلاف الهيئة: `AuthorityProfile.coverUrl`.
- صورة القانون: `Law.thumbnailUrl`.
- وسائط المنشور: `MediaAsset.url` ثم `Post.mediaIds`.

### عرض الصور

`SafeImage` يستخدم `normalizeSafeImageUrl` ويعرض fallback إذا:

- الرابط فارغ.
- الرابط غير آمن.
- التحميل فشل.
- المسار المحلي غير مسموح.

### إعداد Vercel Blob بأمان

1. أنشئ Blob Store من Vercel Dashboard.
2. انسخ token من إعدادات Vercel.
3. أضفه في Environment Variables باسم `BLOB_READ_WRITE_TOKEN`.
4. لا تضع token في Git أو README أو هذا الملف.
5. أعد النشر.
6. اختبر رفع صورة من `/account` أو `/party-dashboard/profile`.

إذا لم يتم ضبط `BLOB_READ_WRITE_TOKEN` في الإنتاج، يفشل الرفع برسالة عربية توضح أن تخزين الصور الدائم غير مفعل.

## المكونات البرمجية المهمة

| Component | الملف | الوظيفة | أهم props | أين يستخدم | ملاحظات |
|---|---|---|---|---|---|
| `MediaUploadField` | `src/components/ui/MediaUploadField.tsx` | رفع ومعاينة وحذف صورة/ملف | `label`, `value`, `imagesOnly`, `endpoint`, `onUploaded`, `onClear` | الحساب، الداشبورد، القوانين | يدعم drag/drop وحالة تحميل |
| `SafeImage` | `src/components/ui/SafeImage.tsx` | عرض صورة آمنة مع fallback | `src`, `alt`, `fallback`, `localPrefixes` | الكروت والصفحات | يمنع روابط غير آمنة |
| `Navbar` | `src/components/layout/Navbar.tsx` | رأس الموقع والتنقل | لا يوجد props | layout | لوجو object-contain و dark mode |
| `MobileNav` | `src/components/layout/MobileNav.tsx` | تنقل الموبايل | `links`, `dashboardHref` | Navbar | يحافظ على responsive |
| `PostCard` | `src/components/posts/PostCard.tsx` | كرت منشور | `post`, `compact` | updates, party, iec, dashboards | يعرض الناشر والوسائط والتفاعل |
| `PollCard` | `src/components/polls/PollCard.tsx` | كرت تصويت | `poll`, `compact` | updates, party, iec | ترويسة ناشر و badge تصويت |
| `PollVote` | `src/components/polls/PollVote.tsx` | منطق التصويت | `poll` | PollCard | optimistic update و login prompt |
| `LawCard` | `src/components/laws/LawCard.tsx` | بطاقة قانون | `law` | `/laws` | صورة/مؤشر فيديو |
| `LawManagementControls` | `src/components/laws/LawManagementControls.tsx` | إنشاء/تعديل قانون | `mode`, `law` | تفاصيل القانون/admin | Modal مع رفع صورة |
| `PostCreateForm` | `src/components/dashboard/Forms.tsx` | إنشاء منشور | لا يوجد | dashboards | رفع مرفقات |
| `PollCreateForm` | `src/components/dashboard/Forms.tsx` | إنشاء تصويت | لا يوجد | dashboards | خيارات بسطر لكل خيار |
| `PartyProfileForm` | `src/components/dashboard/Forms.tsx` | تعديل الحزب | `party` | party dashboard | شعار وغلاف وروابط |
| `IecProfileForm` | `src/components/dashboard/Forms.tsx` | تعديل الهيئة | `authority` | iec dashboard | شعار وغلاف |
| `DashboardNav` | `src/components/dashboard/DashboardNav.tsx` | إطار dashboard | `title`, `links`, children | لوحات التحكم | يحافظ على بنية موحدة |
| `CommentBox` | `src/components/comments/CommentBox.tsx` | التعليقات | target info | Post/Poll cards | يحتاج مستخدم |
| `ReportButton` | `src/components/reports/ReportButton.tsx` | إنشاء بلاغ | target info | الكروت والصفحات | يستخدم LoginPrompt |

## إرشادات التصميم وتجربة المستخدم

### RTL واللغة

التجربة عربية بالأساس. النصوص والحقول والاتجاهات يجب أن تبقى مناسبة للغة العربية. الحقول التقنية مثل `slug` أو URLs تعرض عادة باتجاه `ltr`.

### الموبايل

الصفحات تعتمد grids responsive، وNavbar يحتوي MobileNav. يجب اختبار صفحات الكروت والدواشبورد على عرض هاتف، خصوصا رفع الصور والتصويت.

### Dark Mode

تستخدم المكونات classes خاصة بـ `dark:`. اللوجو في Navbar داخل container أبيض/داكن مع `object-contain` لتجنب القص والخلفية السيئة.

### البطاقات

PostCard و PollCard و LawCard تستخدم بنية card واضحة. لا يجب تكديس cards داخل cards دون سبب. حافظ على spacing ثابت وتجنب تداخل النص مع progress bars.

### رسائل النجاح والخطأ

الواجهات تعرض رسائل عربية عبر toast أو نص داخلي. أخطاء API ترجع `json.error.message` وتعرض للمستخدم.

### fallback images

كل صورة مهمة يجب أن تمر عبر SafeImage أو fallback واضح حتى لا تظهر أيقونة مكسورة.

### رفع الصور

MediaUploadField يوفر:

- drag/drop.
- زر اختيار صورة.
- معاينة.
- حذف/تغيير.
- loading state.
- نص إرشادي للصيغ.

## الأمان والحماية

### الموجود فعليا

- JWT cookie للمصادقة.
- RBAC في API routes و middleware.
- حماية dashboard routes.
- `requireActiveUser` للتأكد من status active.
- Zod validation.
- safe URL validation.
- file validation للرفع.
- CSP headers في middleware.
- Audit logs لبعض العمليات الحساسة.
- rate limiting ذاكرية على الرفع، التصويت، التعليقات، والبلاغات.
- soft status مثل `hidden`, `deleted`, `disabled`.

### ما لا يجب ادعاؤه كمنفذ بالكامل

- لا يوجد فحص فيروسات للملفات.
- لا يوجد rate limiting مشترك production-grade.
- لا يوجد test suite E2E شامل.
- لا يوجد تحويل HEIC/HEIF إلى WebP.
- لا توجد مراقبة أخطاء مركزية موثقة في الكود.

## دليل تشغيل المطور

### المتطلبات

- Node.js حديث متوافق مع Next.js 15.
- npm.
- MongoDB محلي أو MongoDB Atlas.
- Vercel Blob اختياري محليا ومطلوب للإنتاج إذا كان الرفع يجب أن يكون دائما.

### نسخ المشروع وتثبيت الاعتماديات

```bash
git clone <repo-url>
cd <project-folder>
npm install
```

### تجهيز البيئة

```bash
cp .env.example .env.local
```

اشرح المتغيرات دون وضع قيم حقيقية:

| المتغير | الوظيفة | مطلوب |
|---|---|---|
| `MONGODB_URI` | رابط MongoDB | نعم |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | مهلة الاتصال | اختياري |
| `JWT_SECRET` | توقيع الجلسة | نعم |
| `GEMINI_API_KEY` | المساعد الذكي | عند استخدام المساعد |
| `GEMINI_MODEL` | موديل Gemini | اختياري |
| `GEMINI_FALLBACK_MODEL` | موديل احتياطي | اختياري |
| `GEMINI_ENABLE_GOOGLE_SEARCH` | grounding اختياري | اختياري |
| `NEXT_PUBLIC_APP_URL` | عنوان الموقع | مستحسن |
| `REQUIRE_EMAIL_VERIFICATION` | تفعيل تحقق البريد | اختياري |
| `MAX_UPLOAD_SIZE_MB` | حد الرفع | نعم بقيمة مناسبة |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | مطلوب للإنتاج |
| `YOUTUBE_API_KEY` | تكامل YouTube إن استخدم | اختياري |

### تشغيل قاعدة البيانات والـ seed

```bash
npm run db:test
npm run seed
```

قد توجد سكربتات إضافية:

```bash
npm run sync-indexes
npm run recalculate-counters
npm run audit-demo-content
```

### تشغيل التطوير

```bash
npm run dev
```

أو:

```bash
npm run app
```

### التحقق

```bash
npm run lint
npm run build
npm run verify
```

لا يوجد script باسم `test` في `package.json` حاليا.

### مشاكل شائعة محليا

- فشل MongoDB: افحص `MONGODB_URI`.
- فشل env check: أكمل المتغيرات المطلوبة.
- فشل الرفع: محليا يجب أن يعمل fallback إذا لم تكن البيئة production.
- تعارض port: شغل Next على port آخر.

## دليل النشر على Vercel

1. اربط الريبو مع Vercel.
2. تأكد أن Build Command هو:

```bash
npm run build
```

3. لا تحتاج Output Directory مخصصا لتطبيق Next.js عادي.
4. أضف Environment Variables:

```env
MONGODB_URI=
JWT_SECRET=
GEMINI_API_KEY=
BLOB_READ_WRITE_TOKEN=
MAX_UPLOAD_SIZE_MB=
NEXT_PUBLIC_APP_URL=
```

5. استخدم MongoDB Atlas للإنتاج.
6. أنشئ Vercel Blob Store وأضف `BLOB_READ_WRITE_TOKEN`.
7. نفذ Deploy.
8. بعد النشر افحص:
   - `/`
   - `/updates`
   - `/laws`
   - `/iec`
   - `/parties`
   - `/login`
9. سجل دخول بحساب مناسب واختبر رفع صورة.
10. إذا فشل الرفع، افحص وجود `BLOB_READ_WRITE_TOKEN` وسجلات Vercel Function.

سبب عدم استخدام `public/uploads` في الإنتاج: Vercel لا يحفظ ملفات runtime بعد redeploy، وقد لا تكون الملفات متاحة عبر كل instance.

## دليل العرض أمام اللجنة

1. افتح الصفحة الرئيسية واشرح أن المنصة تجمع المواطن والأحزاب والهيئة.
2. افتح `/parties` واعرض قائمة الأحزاب.
3. افتح صفحة حزب واعرض الشعار والغلاف والمنشورات والتصويتات.
4. افتح `/iec` واعرض بيانات الهيئة ومنشوراتها.
5. افتح `/laws` ثم قانونا يحتوي صورة أو YouTube.
6. افتح `/updates` واعرض كروت المنشورات والتصويتات.
7. سجل دخول كمواطن واعرض التصويت والتعليق والبلاغ.
8. سجل دخول كحزب واعرض إنشاء منشور بصورة.
9. سجل دخول كهيئة واعرض إضافة قانون بصورة أو YouTube.
10. سجل دخول كأدمن واعرض البلاغات والسجلات.

نقاط قوية للعرض:

- تجربة عربية RTL.
- صلاحيات واضحة لكل دور.
- صور الناشرين تظهر في المنشورات والتصويتات.
- رفع صور دائم في الإنتاج عبر Vercel Blob.
- روابط YouTube آمنة للقوانين.
- توثيق شامل للمطور والتسليم.

## الاختبار وضمان الجودة

Checklist وظيفي:

- تسجيل حساب مواطن.
- تسجيل الدخول والخروج.
- تعديل الاسم والصورة.
- رفع شعار حزب.
- رفع غلاف حزب.
- رفع شعار وغلاف هيئة.
- إنشاء منشور حزب بصورة.
- إنشاء منشور هيئة بصورة.
- ظهور صورة الحزب والهيئة داخل الكروت.
- إنشاء تصويت حزب/هيئة.
- التصويت كمواطن مرة واحدة.
- منع التصويت المكرر.
- إضافة تعليق كمواطن.
- إرسال بلاغ.
- مراجعة البلاغ كأدمن.
- إضافة قانون بصورة مرفوعة.
- إضافة قانون برابط صورة خارجي.
- إضافة قانون برابط YouTube.
- اختبار dark mode.
- اختبار mobile.

أوامر التحقق:

```bash
npm run lint
npm run build
npm run verify
```

## Checklist تسليم نهائي

- [ ] `npm run lint` ناجح.
- [ ] `npm run build` ناجح.
- [ ] `npm run verify` ناجح.
- [ ] `.env.local` مضبوط محليا.
- [ ] Environment Variables مضبوطة على Vercel.
- [ ] MongoDB يعمل.
- [ ] Vercel Blob مضبوط.
- [ ] لا توجد secrets في Git.
- [ ] رفع الصور يعمل.
- [ ] روابط YouTube في القوانين تعمل.
- [ ] منشورات الهيئة تظهر بصورة الهيئة.
- [ ] منشورات الحزب تظهر بصورة الحزب.
- [ ] التصويت يعمل للمواطن.
- [ ] التعليقات والبلاغات تعمل.
- [ ] responsive يعمل.
- [ ] dark mode يعمل.
- [ ] README يشير إلى هذا التوثيق.
- [ ] نسخة احتياطية من قاعدة بيانات الإنتاج متاحة عند الحاجة.

## Troubleshooting

| المشكلة | السبب المحتمل | طريقة الفحص | الحل |
|---|---|---|---|
| الصورة لا تظهر | رابط غير آمن أو فشل تحميل | DevTools Network و `SafeImage` fallback | استخدم URL https أو مسار مسموح |
| الرفع يفشل في الإنتاج | `BLOB_READ_WRITE_TOKEN` غير مضبوط | Vercel logs | أضف المتغير وأعد النشر |
| رسالة Blob غير مفعل | production دون token | Response من API | إعداد Vercel Blob |
| رابط YouTube لا يظهر | الرابط غير مدعوم أو ID غير صالح | جرّب `normalizeYoutubeInput` | استخدم watch أو youtu.be أو ID صالح |
| منشور الهيئة بلا صورة | AuthorityProfile بلا `logoUrl` أو فشل الجلب | افحص `/iec` و DB | ارفع شعار الهيئة أو اضبط `logoUrl` |
| التصويت لا يسمح | المستخدم ليس citizen أو صوت سابقا | Response 401/403/409 | سجل دخول كمواطن أو استخدم تصويت جديد |
| build يفشل | TypeScript أو env | اقرأ output | أصلح النوع أو المتغير |
| MongoDB لا يتصل | URI أو شبكة | `npm run db:test` | صحح `MONGODB_URI` و Atlas IP access |
| 403 صلاحيات | دور غير مناسب أو status غير active | افحص user.role/status | استخدم حسابا بالدور الصحيح |
| 404 route | slug غير موجود أو status ليس published/active | افحص DB | أنشئ بيانات أو صحح slug |
| hydration issue | اختلاف client/server أو تاريخ عشوائي | Console | اجعل البيانات مستقرة أو client-only |
| شعار dark mode سيئ | صورة غير شفافة أو CSS | افحص Navbar | استخدم container الحالي و object-contain |

## القيود والتحسينات المستقبلية

قيود حقيقية من الكود الحالي:

- HEIC/HEIF لا يتم تحويلها إلى WebP؛ عرضها يعتمد على دعم المتصفح.
- fallback المحلي للرفع مخصص للتطوير فقط.
- rate limiting الحالي in-memory وليس مناسبا لتعدد instances في الإنتاج.
- لا يوجد test suite آلي شامل أو E2E.
- لا يوجد فحص فيروسات للملفات المرفوعة.
- بعض صفحات الإدارة وظيفتها أساسية وليست نظام إدارة كامل متقدم.
- email verification موجود كإعداد/مسارات، لكن يجب التحقق من تفعيله وتشغيله في بيئة الإنتاج قبل الاعتماد عليه.
- لا توجد مراقبة أخطاء مركزية موثقة مثل Sentry.
- حذف MediaAsset الحالي soft delete في DB ولا يزيل الملف من Blob.

تحسينات مقترحة:

- تحويل الصور إلى WebP/AVIF على الخادم.
- استخدام Upstash/Redis للـ rate limiting.
- إضافة Playwright E2E.
- إضافة unit tests للـ validators.
- إضافة scan للملفات.
- إضافة مراقبة أخطاء وسجلات إنتاج.
- إضافة backup policy لـ MongoDB Atlas.
- تحسين إدارة الجلسات وربما CSRF حسب نموذج الطلبات النهائي.

## Changelog

| التاريخ | التعديل | الملفات المتأثرة | سبب التعديل | طريقة الاختبار | الأثر |
|---|---|---|---|---|---|
| 2026-05-08 | إضافة Vercel Blob storage | `src/lib/storage.ts`, `src/app/api/uploads/route.ts`, `src/app/api/account/avatar/route.ts` | تخزين دائم مناسب لـ Vercel | `npm run build`, رفع يدوي | صور لا تضيع بعد redeploy |
| 2026-05-08 | إضافة uploadValidation | `src/lib/uploadValidation.ts` | توحيد تحقق الملفات | lint/build | رسائل عربية ورفض الملفات الخطرة |
| 2026-05-08 | إضافة MediaUploadField | `src/components/ui/MediaUploadField.tsx` | تحسين UX للرفع | فحص واجهة وbuild | preview وdrag/drop وحذف |
| 2026-05-08 | إصلاح صورة الهيئة في الكروت | `src/lib/serverData.ts`, `src/app/api/updates/route.ts`, `PostCard`, `PollCard` | ظهور صورة الهيئة في المنشورات والتصويتات | build وفحص صفحات | كروت أوضح |
| 2026-05-08 | تحسين PollCard و PollVote | `src/components/polls/*` | ترويسة ونتائج أوضح | build وفحص يدوي | تجربة تصويت أفضل |
| 2026-05-08 | دعم YouTube links للقوانين | `src/lib/youtube.ts`, `validators.ts`, admin laws APIs, Law model | قبول الرابط الكامل وthumbnail | build | إدارة قوانين أسهل |
| 2026-05-08 | تحسين Navbar logo | `src/components/layout/Navbar.tsx` | مظهر أفضل في dark mode | فحص واجهة | شعار واضح وغير مقصوص |
| 2026-05-08 | تحديث README و env example | `README.md`, `.env.example` | توضيح docs و Blob | مراجعة نصية | تشغيل أوضح |
| 2026-05-08 | إنشاء وتوسيع التوثيق | `docs/SHAREK_FULL_DOCUMENTATION_AR.md` | تسليم للجنة والمطور | مراجعة محتوى | مصدر معرفة شامل |

## FAQ تقنية

**أين أضيف متغيرات البيئة؟** في `.env.local` محليا، وفي Vercel Project Settings للإنتاج.

**أين أعدل صورة الحزب؟** من `/party-dashboard/profile` أو من لوحة الأدمن حسب الصلاحية.

**لماذا لا تظهر صورة؟** غالبا الرابط غير آمن أو الصورة فشلت في التحميل أو لم يتم ضبط Blob في الإنتاج.

**كيف أضيف قانون؟** من `/iec-dashboard/laws` أو `/admin/laws` حسب الدور.

**كيف أضيف منشور؟** من `/party-dashboard/posts` للحزب أو `/iec-dashboard/posts` للهيئة.

**كيف أفحص الصلاحيات؟** راجع `middleware.ts`, `src/lib/auth.ts`, `src/lib/permissions.ts`, و API route المطلوب.

**كيف أشغل المشروع محليا؟**

```bash
npm install
npm run dev
```

**كيف أنشر على Vercel؟** اربط الريبو، أضف env vars، اضبط MongoDB Atlas و Vercel Blob، ثم deploy.

## قائمة ملفات مهمة

| الملف/المجلد | الوظيفة |
|---|---|
| `src/app` | صفحات التطبيق و API routes |
| `src/app/api` | endpoints |
| `src/components` | مكونات الواجهة |
| `src/components/dashboard/Forms.tsx` | نماذج الداشبورد |
| `src/components/ui/MediaUploadField.tsx` | واجهة الرفع |
| `src/components/ui/SafeImage.tsx` | عرض صور آمن |
| `src/components/posts/PostCard.tsx` | كرت المنشور |
| `src/components/polls/PollCard.tsx` | كرت التصويت |
| `src/components/laws/LawCard.tsx` | كرت القانون |
| `src/lib/storage.ts` | التخزين |
| `src/lib/uploadValidation.ts` | تحقق الملفات |
| `src/lib/validators.ts` | Zod validation |
| `src/lib/serverData.ts` | بيانات الصفحات |
| `src/lib/auth.ts` | المستخدم والجلسة |
| `src/lib/permissions.ts` | الأدوار |
| `src/lib/rateLimit.ts` | rate limiting ذاكرية |
| `src/models` | Mongoose models |
| `middleware.ts` | حماية صفحات و security headers |
| `.env.example` | قالب متغيرات |
| `scripts` | seed وفحوص وصيانة |

## ملخص ختامي

منصة نشمي / شارك جاهزة كنسخة ديمو قوية للهاكاثون والتسليم التجريبي، وتغطي أهم الرحلات: تصفح عام، تفاعل المواطن، نشر الحزب، إدارة الهيئة للقوانين والمنشورات، ومراقبة الأدمن. أهم نقاط القوة هي RTL، RBAC، كروت محتوى واضحة، رفع صور دائم عند ضبط Vercel Blob، وتوثيق تشغيلي شامل.

قبل الإنتاج الحقيقي، يجب استكمال تحسينات التشغيل والمراقبة والاختبارات، وتفعيل تخزين Blob ومراجعة الأمن والنسخ الاحتياطي بشكل رسمي.
