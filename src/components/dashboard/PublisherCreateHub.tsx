import Link from "next/link";
import { BarChart3, FileText, ListChecks, PlusCircle } from "lucide-react";

type CreateItem = {
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: typeof FileText;
};

export default function PublisherCreateHub({ basePath, includePolls = true }: { basePath: "/party-dashboard" | "/iec-dashboard"; includePolls?: boolean }) {
  const items: CreateItem[] = [
    {
      href: `${basePath}/posts`,
      title: "منشور",
      description: "شارك خبرًا أو تحديثًا أو إعلانًا مع الجمهور.",
      cta: "إنشاء منشور",
      icon: FileText
    },
    ...(includePolls
      ? [{
          href: `${basePath}/polls`,
          title: "تصويت",
          description: "اطرح سؤالًا سريعًا واحصل على تفاعل مباشر.",
          cta: "إنشاء تصويت",
          icon: ListChecks
        }]
      : []),
    {
      href: `${basePath}/surveys`,
      title: "استبيان / نبض المجتمع",
      description: "أنشئ استبيانًا متكاملًا لقياس آراء المواطنين وتحليل النتائج.",
      cta: "إنشاء استبيان",
      icon: BarChart3
    }
  ];

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <PlusCircle className="h-5 w-5 text-civic" />
        <h2 className="text-xl font-black">إنشاء محتوى جديد</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="card card-hover block bg-white p-4 dark:bg-slate-950">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded bg-civic/10 text-civic">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-black">{item.title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-ink/65 dark:text-slate-300">{item.description}</p>
              <span className="mt-4 inline-flex rounded bg-civic px-3 py-2 text-sm font-bold text-white">{item.cta}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
