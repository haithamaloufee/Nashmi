"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";

function useApiMessage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function submit(url: string, payload: unknown, method = "POST") {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json().catch(() => ({}));
    setMessage(json.ok ? "تم الحفظ" : json.error?.message || "تعذر الحفظ");
    if (json.ok) router.refresh();
  }
  return { message, submit };
}

export function PostCreateForm() {
  const api = useApiMessage();
  return (
    <form action={(formData) => api.submit("/api/posts", { title: formData.get("title"), content: formData.get("content"), tags: String(formData.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean) })} className="card space-y-3 p-5">
      <h2 className="text-xl font-bold">منشور جديد</h2>
      <input name="title" className="w-full rounded border-line" placeholder="عنوان اختياري" />
      <textarea name="content" className="w-full rounded border-line" rows={5} placeholder="نص المنشور" required />
      <input name="tags" className="w-full rounded border-line" placeholder="وسوم مفصولة بفواصل" />
      <button className="rounded bg-civic px-4 py-2 text-white">نشر</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function PollCreateForm() {
  const api = useApiMessage();
  return (
    <form
      action={(formData) =>
        api.submit("/api/polls", {
          question: formData.get("question"),
          description: formData.get("description"),
          options: String(formData.get("options") || "")
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean),
          resultsVisibility: formData.get("resultsVisibility") || "always"
        })
      }
      className="card space-y-3 p-5"
    >
      <h2 className="text-xl font-bold">تصويت جديد</h2>
      <input name="question" className="w-full rounded border-line" placeholder="السؤال" required />
      <textarea name="description" className="w-full rounded border-line" rows={2} placeholder="وصف اختياري" />
      <textarea name="options" className="w-full rounded border-line" rows={5} placeholder={"كل خيار في سطر\nمثال: أوافق\nلا أوافق"} required />
      <select name="resultsVisibility" className="rounded border-line">
        <option value="always">النتائج دائما</option>
        <option value="after_vote">بعد التصويت</option>
        <option value="after_close">بعد الإغلاق</option>
      </select>
      <button className="block rounded bg-civic px-4 py-2 text-white">إنشاء</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function PartyProfileForm({ party }: { party: any }) {
  const api = useApiMessage();
  const [logoPreview, setLogoPreview] = useState(party.logoUrl || "");
  const logoFallback = <div className="grid h-16 w-16 place-items-center rounded bg-civic/10 text-xl font-bold text-civic">{party.name?.slice(0, 1) || "ح"}</div>;
  return (
    <form
      action={(formData) =>
        api.submit(
          "/api/party/profile",
          {
            shortDescription: formData.get("shortDescription"),
            description: formData.get("description"),
            vision: formData.get("vision"),
            goals: String(formData.get("goals") || "")
              .split("\n")
              .map((goal) => goal.trim())
              .filter(Boolean),
            contact: {
              phones: String(formData.get("phones") || "").split(",").map(p => p.trim()).filter(Boolean),
              email: formData.get("email") || null,
              website: formData.get("website") || null,
              headquarters: formData.get("headquarters") || null,
              branches: String(formData.get("branches") || "").split("\n").map(b => b.trim()).filter(Boolean)
            },
            socialLinks: {
              website: formData.get("website") || null,
              facebook: formData.get("facebook") || null,
              x: formData.get("x") || null,
              instagram: formData.get("instagram") || null,
              youtube: formData.get("youtube") || null
            },
            latestAchievements: String(formData.get("latestAchievements") || "").split("\n").map(line => {
              const [title, date] = line.split(" - ");
              return { title: title?.trim(), date: date ? new Date(date.trim()) : null };
            }).filter(a => a.title),
            logoUrl: formData.get("logoUrl") || null
          },
          "PATCH"
        )
      }
      className="card space-y-4 p-5"
    >
      <h2 className="text-xl font-bold">تعديل ملف الحزب</h2>
      <label className="block">
        <span>الوصف المختصر</span>
        <textarea name="shortDescription" defaultValue={party.shortDescription} className="mt-1 w-full rounded border-line" rows={3} required />
      </label>
      <label className="block">
        <span>الوصف الكامل</span>
        <textarea name="description" defaultValue={party.description} className="mt-1 w-full rounded border-line" rows={5} required />
      </label>
      <label className="block">
        <span>الرؤية</span>
        <textarea name="vision" defaultValue={party.vision} className="mt-1 w-full rounded border-line" rows={3} required />
      </label>
      <label className="block">
        <span>الأهداف</span>
        <textarea name="goals" defaultValue={(party.goals || []).join("\n")} className="mt-1 w-full rounded border-line" rows={4} />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span>الهواتف</span>
          <input name="phones" defaultValue={(party.contact?.phones || []).join(", ")} className="mt-1 w-full rounded border-line" />
        </label>
        <label className="block">
          <span>البريد الإلكتروني</span>
          <input name="email" type="email" defaultValue={party.contact?.email} className="mt-1 w-full rounded border-line" />
        </label>
      </div>
      <label className="block">
        <span>الموقع الإلكتروني</span>
        <input name="website" type="url" defaultValue={party.contact?.website} className="mt-1 w-full rounded border-line" />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span>فيسبوك</span>
          <input name="facebook" defaultValue={party.socialLinks?.facebook} className="mt-1 w-full rounded border-line" />
        </label>
        <label className="block">
          <span>تويتر</span>
          <input name="x" defaultValue={party.socialLinks?.x} className="mt-1 w-full rounded border-line" />
        </label>
        <label className="block">
          <span>إنستغرام</span>
          <input name="instagram" defaultValue={party.socialLinks?.instagram} className="mt-1 w-full rounded border-line" />
        </label>
      </div>
      <label className="block">
        <span>المقر الرئيسي</span>
        <input name="headquarters" defaultValue={party.contact?.headquarters} className="mt-1 w-full rounded border-line" />
      </label>
      <label className="block">
        <span>الفروع</span>
        <textarea name="branches" defaultValue={(party.contact?.branches || []).join("\n")} className="mt-1 w-full rounded border-line" rows={3} />
      </label>
      <label className="block">
        <span>الإنجازات الأخيرة</span>
        <textarea name="latestAchievements" defaultValue={(party.latestAchievements || []).map((a: {title: string; date: string}) => `${a.title} - ${a.date}`).join("\n")} className="mt-1 w-full rounded border-line" rows={4} />
      </label>
      <label className="block">
        <span>رابط شعار الحزب</span>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SafeImage src={logoPreview} alt={party.name || "شعار الحزب"} className="h-16 w-16 rounded bg-white object-contain ring-1 ring-line" fallback={logoFallback} />
          <div className="flex-1">
            <input name="logoUrl" type="url" value={logoPreview} onChange={(event) => setLogoPreview(event.target.value)} className="w-full rounded border-line" placeholder="https://parties.iec.jo/storage/example.png" />
            <p className="mt-1 text-sm text-ink/60">ضع رابط صورة الشعار من مصدر موثوق. صورة الغلاف مؤجلة حاليًا.</p>
          </div>
        </div>
      </label>
      <button type="submit" className="rounded bg-civic px-4 py-2 font-semibold text-white">حفظ التغييرات</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function IecProfileForm({ authority }: { authority: any }) {
  const api = useApiMessage();
  const [logoPreview, setLogoPreview] = useState(authority.logoUrl || "");
  const logoFallback = <div className="grid h-16 w-16 place-items-center rounded bg-civic/10 text-xl font-bold text-civic">هـ</div>;

  return (
    <form
      action={(formData) => api.submit("/api/iec/profile", { logoUrl: formData.get("logoUrl") || null }, "PATCH")}
      className="card space-y-4 p-5"
    >
      <h2 className="text-xl font-bold">ملف الهيئة</h2>
      <label className="block">
        <span>رابط شعار الهيئة</span>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SafeImage src={logoPreview} alt={authority.name || "شعار الهيئة"} className="h-16 w-16 rounded bg-white object-contain ring-1 ring-line" fallback={logoFallback} />
          <div className="flex-1">
            <input name="logoUrl" type="url" value={logoPreview} onChange={(event) => setLogoPreview(event.target.value)} className="w-full rounded border-line" placeholder="https://..." />
            <p className="mt-1 text-sm text-ink/60">ضع رابط شعار الهيئة من مصدر موثوق. صورة الغلاف مؤجلة حاليًا.</p>
          </div>
        </div>
      </label>
      <button type="submit" className="rounded bg-civic px-4 py-2 font-semibold text-white">حفظ</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function AdminPartyLogoForm({ party }: { party: any }) {
  const api = useApiMessage();
  const [logoPreview, setLogoPreview] = useState(party.logoUrl || "");
  const logoFallback = <div className="grid h-10 w-10 place-items-center rounded bg-civic/10 text-sm font-bold text-civic">{party.name?.slice(0, 1) || "ح"}</div>;

  return (
    <form action={(formData) => api.submit(`/api/admin/parties/${party._id}`, { logoUrl: formData.get("logoUrl") || null }, "PATCH")} className="mt-3 grid gap-2">
      <div className="flex items-center gap-2">
        <SafeImage src={logoPreview} alt={party.name || "شعار الحزب"} className="h-10 w-10 shrink-0 rounded bg-white object-contain ring-1 ring-line" fallback={logoFallback} />
        <input name="logoUrl" type="url" value={logoPreview} onChange={(event) => setLogoPreview(event.target.value)} className="min-w-0 flex-1 rounded border-line text-sm" placeholder="https://parties.iec.jo/storage/example.png" />
        <button className="rounded border border-line px-3 py-2 text-sm hover:border-civic">حفظ</button>
      </div>
      {api.message ? <p className="text-xs text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function PartyCreateForm() {
  const api = useApiMessage();
  return (
    <form
      action={(formData) =>
        api.submit("/api/admin/parties", {
          name: formData.get("name"),
          slug: formData.get("slug"),
          shortDescription: formData.get("shortDescription"),
          description: formData.get("description"),
          vision: formData.get("vision"),
          goals: String(formData.get("goals") || "")
            .split("\n")
            .map((goal) => goal.trim())
            .filter(Boolean),
          socialLinks: {},
          status: "active",
          isVerified: true,
          createAccount: formData.get("createAccount") === "on",
          accountEmail: formData.get("accountEmail") || undefined
        })
      }
      className="card space-y-3 p-5"
    >
      <h2 className="text-xl font-bold">إضافة حزب</h2>
      <input name="name" className="w-full rounded border-line" placeholder="اسم الحزب" required />
      <input name="slug" className="w-full rounded border-line" placeholder="slug-latin" required />
      <input name="shortDescription" className="w-full rounded border-line" placeholder="وصف قصير" required />
      <textarea name="description" className="w-full rounded border-line" rows={4} placeholder="الوصف" required />
      <textarea name="vision" className="w-full rounded border-line" rows={2} placeholder="الرؤية" required />
      <textarea name="goals" className="w-full rounded border-line" rows={3} placeholder="الأهداف، كل هدف في سطر" />
      <label className="flex items-center gap-2 text-sm"><input name="createAccount" type="checkbox" /> إنشاء حساب حزب</label>
      <input name="accountEmail" className="w-full rounded border-line" placeholder="party@example.com" />
      <button className="rounded bg-civic px-4 py-2 text-white">إنشاء</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function LawCreateForm() {
  const api = useApiMessage();
  return (
    <form
      action={(formData) =>
        api.submit("/api/admin/laws", {
          title: formData.get("title"),
          slug: formData.get("slug"),
          category: formData.get("category"),
          sourceName: formData.get("sourceName"),
          sourceType: formData.get("sourceType"),
          officialReferenceUrl: formData.get("officialReferenceUrl") || "",
          shortDescription: formData.get("shortDescription"),
          simplifiedExplanation: formData.get("simplifiedExplanation"),
          practicalExample: formData.get("practicalExample") || null,
          youtubeVideoId: formData.get("youtubeVideoId") || null,
          tags: String(formData.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
          status: "published"
        })
      }
      className="card space-y-3 p-5"
    >
      <h2 className="text-xl font-bold">إضافة قانون</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input name="title" className="rounded border-line" placeholder="العنوان" required />
        <input name="slug" className="rounded border-line" placeholder="slug-latin" required />
        <input name="category" className="rounded border-line" placeholder="التصنيف" required />
        <input name="sourceName" className="rounded border-line" placeholder="المصدر" required />
        <input name="sourceType" className="rounded border-line" placeholder="نوع المصدر" required />
        <input name="youtubeVideoId" className="rounded border-line" placeholder="YouTube ID اختياري" />
      </div>
      <input name="officialReferenceUrl" className="w-full rounded border-line" placeholder="رابط رسمي اختياري" />
      <textarea name="shortDescription" className="w-full rounded border-line" rows={2} placeholder="وصف قصير" required />
      <textarea name="simplifiedExplanation" className="w-full rounded border-line" rows={5} placeholder="شرح مبسط" required />
      <textarea name="practicalExample" className="w-full rounded border-line" rows={2} placeholder="مثال عملي" />
      <input name="tags" className="w-full rounded border-line" placeholder="وسوم مفصولة بفواصل" />
      <button className="rounded bg-civic px-4 py-2 text-white">حفظ</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function ReportModerationForm({ reportId }: { reportId: string }) {
  const api = useApiMessage();
  return (
    <form action={(formData) => api.submit(`/api/admin/reports/${reportId}`, { action: formData.get("action"), reason: formData.get("reason") }, "PATCH")} className="flex flex-wrap gap-2">
      <select name="action" className="rounded border-line text-sm">
        <option value="dismiss_report">رفض البلاغ</option>
        <option value="hide">إخفاء الهدف</option>
        <option value="delete">حذف ناعم</option>
        <option value="restore">استعادة</option>
      </select>
      <input name="reason" className="rounded border-line text-sm" placeholder="سبب إلزامي" required />
      <button className="rounded bg-civic px-3 py-2 text-sm text-white">تنفيذ</button>
      {api.message ? <span className="text-xs text-ink/60">{api.message}</span> : null}
    </form>
  );
}

export function UserControls({ user }: { user: any }) {
  const api = useApiMessage();
  return (
    <div className="flex flex-wrap gap-2">
      <form action={(formData) => api.submit(`/api/admin/users/${user._id}/status`, { status: formData.get("status") }, "PATCH")} className="flex gap-1">
        <select name="status" defaultValue={user.status} className="rounded border-line text-xs">
          <option value="active">active</option>
          <option value="disabled">disabled</option>
          <option value="pending">pending</option>
          <option value="locked">locked</option>
        </select>
        <button className="rounded border border-line px-2 text-xs">حفظ</button>
      </form>
      <form action={(formData) => api.submit(`/api/admin/users/${user._id}/role`, { role: formData.get("role") }, "PATCH")} className="flex gap-1">
        <select name="role" defaultValue={user.role} className="rounded border-line text-xs">
          <option value="citizen">citizen</option>
          <option value="party">party</option>
          <option value="iec">iec</option>
          <option value="admin">admin</option>
          <option value="super_admin">super_admin</option>
        </select>
        <button className="rounded border border-line px-2 text-xs">حفظ</button>
      </form>
    </div>
  );
}

export function UserCreateForm() {
  const api = useApiMessage();
  return (
    <form
      action={(formData) =>
        api.submit("/api/admin/users", {
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password") || "Password123!",
          role: formData.get("role") || "citizen",
          status: formData.get("status") || "active"
        })
      }
      className="card space-y-3 p-5"
    >
      <h2 className="text-xl font-bold">إنشاء حساب</h2>
      <input name="name" className="w-full rounded border-line" placeholder="الاسم" required />
      <input name="email" type="email" className="w-full rounded border-line" placeholder="البريد الإلكتروني" required />
      <input name="password" className="w-full rounded border-line" placeholder="كلمة المرور الافتراضية" defaultValue="Password123!" />
      <div className="grid gap-3 md:grid-cols-2">
        <select name="role" className="rounded border-line">
          <option value="citizen">citizen</option>
          <option value="party">party</option>
          <option value="iec">iec</option>
          <option value="admin">admin</option>
          <option value="super_admin">super_admin</option>
        </select>
        <select name="status" className="rounded border-line">
          <option value="active">active</option>
          <option value="pending">pending</option>
          <option value="disabled">disabled</option>
          <option value="locked">locked</option>
        </select>
      </div>
      <button className="rounded bg-civic px-4 py-2 text-white">إنشاء</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}
