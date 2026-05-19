"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import LoadingButton from "@/components/ui/LoadingButton";
import MediaUploadField from "@/components/ui/MediaUploadField";
import SafeImage from "@/components/ui/SafeImage";
import { useToast } from "@/components/ui/ToastProvider";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { allowedPollDurationDays, defaultPollDurationDays } from "@/lib/polls";

function useApiMessage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(url: string, payload: unknown, method = "POST") {
    setLoading(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      setLoading(false);
      setMessage(json.ok ? "تم الحفظ" : json.error?.message || "تعذر الحفظ");
      if (json.ok) router.refresh();
      return json;
    } catch {
      setLoading(false);
      setMessage("تعذر الاتصال بالخادم");
      return { ok: false };
    }
  }
  return { message, submit, loading };
}

function splitLines(value: FormDataEntryValue | null) {
  return String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
}

function splitComma(value: FormDataEntryValue | null) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function PostCreateForm() {
  const api = useApiMessage();
  const { showToast } = useToast();
  const [media, setMedia] = useState<Array<{ id: string; url: string; type?: string; mimeType?: string }>>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  return (
    <form
      action={async (formData) => {
        if (uploadingMedia) {
          showToast("انتظر حتى يكتمل رفع الملف قبل النشر.", "error");
          return;
        }
        const json = await api.submit("/api/posts", {
          title: formData.get("title") || null,
          content: formData.get("content"),
          tags: splitComma(formData.get("tags")),
          mediaIds: media.map((item) => item.id).filter(Boolean)
        });
        if (json?.ok) {
          setMedia([]);
          showToast("تم نشر المنشور", "success");
        }
      }}
      className="card space-y-3 p-5"
    >
      <h2 className="text-xl font-bold">منشور جديد</h2>
      <input name="title" className="w-full rounded border-line" placeholder="عنوان اختياري" />
      <textarea name="content" className="w-full rounded border-line" rows={5} placeholder="اكتب منشورًا..." required />
      <input name="tags" className="w-full rounded border-line" placeholder="وسوم مفصولة بفواصل" />
      <MediaUploadField
        label="مرفقات المنشور"
        imagesOnly={false}
        helper="يمكنك رفع صورة بصيغة JPG أو PNG أو WEBP أو GIF، أو فيديو MP4/WEBM حتى 100MB"
        fallbackText="+"
        purpose="post"
        onUploaded={(asset) => setMedia((current) => current.length >= 6 ? current : [...current, { id: asset._id, url: asset.url, type: asset.type, mimeType: asset.mimeType }])}
        onUploadingChange={setUploadingMedia}
      />
      {media.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {media.map((item) => (
            <div key={item.id || item.url} className="rounded border border-line p-2">
              {item.type === "video" || item.mimeType?.startsWith("video/") ? (
                <video src={item.url} className="h-32 w-full rounded bg-black object-contain" controls />
              ) : (
                <SafeImage src={item.url} alt="معاينة المرفق" className="h-32 w-full rounded object-contain" fallback={<div className="grid h-32 place-items-center text-sm text-ink/60">تعذر عرض الصورة</div>} localPrefixes={["/uploads/", "/images/", "/related/"]} />
              )}
              <button type="button" onClick={() => setMedia((current) => current.filter((mediaItem) => mediaItem.id !== item.id))} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-red-700">
                <Trash2 className="h-4 w-4" />
                حذف
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <LoadingButton loading={api.loading || uploadingMedia} disabled={uploadingMedia} className="bg-civic px-4 py-2 text-white hover:bg-civic/90">{uploadingMedia ? "جار رفع الملف" : "نشر"}</LoadingButton>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function PollCreateForm() {
  const api = useApiMessage();
  const { t } = useTranslation();
  return (
    <form
      action={(formData) =>
        api.submit("/api/polls", {
          question: formData.get("question"),
          description: formData.get("description") || null,
          options: splitLines(formData.get("options")),
          resultsVisibility: formData.get("resultsVisibility") || "always",
          durationDays: Number(formData.get("durationDays") || defaultPollDurationDays)
        })
      }
      className="card space-y-3 p-5"
    >
      <h2 className="text-xl font-bold">تصويت جديد</h2>
      <input name="question" className="w-full rounded border-line" placeholder="السؤال" required />
      <textarea name="description" className="w-full rounded border-line" rows={2} placeholder="وصف اختياري" />
      <textarea name="options" className="w-full rounded border-line" rows={5} placeholder={"كل خيار في سطر\nمثال: أوافق\nلا أوافق"} required />
      <select name="resultsVisibility" className="rounded border-line">
        <option value="always">النتائج دائمًا</option>
        <option value="after_vote">بعد التصويت</option>
        <option value="after_close">بعد الإغلاق</option>
      </select>
      <label className="block text-sm font-semibold">
        {t("poll.duration")}
        <select name="durationDays" defaultValue={defaultPollDurationDays} className="mt-1 w-full rounded border-line">
          {allowedPollDurationDays.map((days) => (
            <option key={days} value={days}>
              {t(`poll.duration.${days}` as never)}
            </option>
          ))}
        </select>
      </label>
      <button className="block rounded bg-civic px-4 py-2 text-white">إنشاء</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function AboutNashmiAdminForm({ content }: { content: any }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { t } = useTranslation();

  return (
    <form
      action={async (formData) => {
        setLoading(true);
        setMessage("");
        try {
          const response = await fetch("/api/admin/site-content/about-nashmi", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              titleAr: formData.get("titleAr"),
              titleEn: formData.get("titleEn"),
              bodyAr: formData.get("bodyAr"),
              bodyEn: formData.get("bodyEn"),
              youtubeUrl: formData.get("youtubeUrl") || null
            })
          });
          const json = await response.json().catch(() => ({}));
          if (!json.ok) {
            const error = json.error?.message || t("admin.about.failed");
            setMessage(error);
            showToast(error, "error");
            return;
          }
          setMessage(t("admin.about.saved"));
          showToast(t("admin.about.saved"), "success");
        } catch {
          setMessage(t("admin.about.failed"));
          showToast(t("admin.about.failed"), "error");
        } finally {
          setLoading(false);
        }
      }}
      className="card space-y-4 p-5"
    >
      <div>
        <h2 className="text-2xl font-black">{t("admin.about.title")}</h2>
        <p className="mt-1 text-sm text-ink/60">{t("admin.about.hint")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t("admin.about.titleAr")}
          <input name="titleAr" defaultValue={content?.titleAr || "عن نشمي"} className="mt-1 w-full rounded border-line" required />
        </label>
        <label className="block text-sm font-semibold">
          {t("admin.about.titleEn")}
          <input name="titleEn" defaultValue={content?.titleEn || "About Nashmi"} className="mt-1 w-full rounded border-line" required />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        {t("admin.about.bodyAr")}
        <textarea name="bodyAr" defaultValue={content?.bodyAr || ""} className="mt-1 w-full rounded border-line" rows={7} required />
      </label>
      <label className="block text-sm font-semibold">
        {t("admin.about.bodyEn")}
        <textarea name="bodyEn" defaultValue={content?.bodyEn || ""} className="mt-1 w-full rounded border-line" rows={7} required />
      </label>
      <label className="block text-sm font-semibold">
        {t("admin.about.youtube")}
        <input name="youtubeUrl" defaultValue={content?.youtubeUrl || ""} className="mt-1 w-full rounded border-line" placeholder="https://www.youtube.com/watch?v=..." />
      </label>
      <button type="submit" disabled={loading} className="rounded bg-civic px-5 py-2.5 text-sm font-bold text-white hover:bg-civic/90 disabled:opacity-60">
        {loading ? t("common.saving") : t("common.save")}
      </button>
      {message ? <p className="text-sm font-semibold text-ink/65">{message}</p> : null}
    </form>
  );
}

export function PartyProfileForm({ party }: { party: any }) {
  const api = useApiMessage();
  const [logoUrl, setLogoUrl] = useState(party.logoUrl || "");
  const [coverUrl, setCoverUrl] = useState(party.coverUrl || "");

  return (
    <form
      action={(formData) =>
        api.submit(
          "/api/party/profile",
          {
            shortDescription: formData.get("shortDescription"),
            description: formData.get("description"),
            vision: formData.get("vision"),
            goals: splitLines(formData.get("goals")),
            contact: {
              phones: splitComma(formData.get("phones")),
              email: formData.get("email") || null,
              website: formData.get("website") || null,
              headquarters: formData.get("headquarters") || null,
              branches: splitLines(formData.get("branches"))
            },
            socialLinks: {
              website: formData.get("website") || null,
              facebook: formData.get("facebook") || null,
              x: formData.get("x") || null,
              instagram: formData.get("instagram") || null,
              youtube: formData.get("youtube") || null
            },
            logoUrl: formData.get("logoUrl") || logoUrl || null,
            coverUrl: formData.get("coverUrl") || coverUrl || null
          },
          "PATCH"
        )
      }
      className="card space-y-4 p-5"
    >
      <h2 className="text-xl font-bold">تعديل ملف الحزب</h2>
      <MediaUploadField label="شعار الحزب" value={logoUrl} purpose="party_logo" fallbackText={party.name?.slice(0, 1) || "ح"} onUploaded={(asset) => setLogoUrl(asset.url)} onClear={() => setLogoUrl("")} />
      <MediaUploadField label="غلاف الحزب" value={coverUrl} purpose="party_cover" fallbackText="غ" onUploaded={(asset) => setCoverUrl(asset.url)} onClear={() => setCoverUrl("")} />
      <label className="block"><span>الوصف المختصر</span><textarea name="shortDescription" defaultValue={party.shortDescription} className="mt-1 w-full rounded border-line" rows={3} required /></label>
      <label className="block"><span>الوصف الكامل</span><textarea name="description" defaultValue={party.description} className="mt-1 w-full rounded border-line" rows={5} required /></label>
      <label className="block"><span>الرؤية</span><textarea name="vision" defaultValue={party.vision} className="mt-1 w-full rounded border-line" rows={3} required /></label>
      <label className="block"><span>الأهداف</span><textarea name="goals" defaultValue={(party.goals || []).join("\n")} className="mt-1 w-full rounded border-line" rows={4} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block"><span>الهواتف</span><input name="phones" defaultValue={(party.contact?.phones || []).join(", ")} className="mt-1 w-full rounded border-line" /></label>
        <label className="block"><span>البريد الإلكتروني</span><input name="email" type="email" defaultValue={party.contact?.email} className="mt-1 w-full rounded border-line" /></label>
      </div>
      <input name="website" type="url" defaultValue={party.contact?.website} className="w-full rounded border-line" placeholder="الموقع الإلكتروني" />
      <div className="grid gap-4 md:grid-cols-3">
        <input name="facebook" defaultValue={party.socialLinks?.facebook} className="rounded border-line" placeholder="فيسبوك" />
        <input name="x" defaultValue={party.socialLinks?.x} className="rounded border-line" placeholder="X" />
        <input name="instagram" defaultValue={party.socialLinks?.instagram} className="rounded border-line" placeholder="إنستغرام" />
      </div>
      <input name="youtube" defaultValue={party.socialLinks?.youtube} className="w-full rounded border-line" placeholder="يوتيوب" />
      <input name="headquarters" defaultValue={party.contact?.headquarters} className="w-full rounded border-line" placeholder="المقر الرئيسي" />
      <textarea name="branches" defaultValue={(party.contact?.branches || []).join("\n")} className="w-full rounded border-line" rows={3} placeholder="الفروع، كل فرع في سطر" />
      <button type="submit" className="rounded bg-civic px-4 py-2 font-semibold text-white">حفظ التغييرات</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function IecProfileForm({ authority }: { authority: any }) {
  const api = useApiMessage();
  const [logoUrl, setLogoUrl] = useState(authority.logoUrl || "");
  const [coverUrl, setCoverUrl] = useState(authority.coverUrl || "");

  return (
    <form action={(formData) => api.submit("/api/iec/profile", { logoUrl: formData.get("logoUrl") || logoUrl || null, coverUrl: formData.get("coverUrl") || coverUrl || null }, "PATCH")} className="card space-y-4 p-5">
      <h2 className="text-xl font-bold">ملف الهيئة</h2>
      <MediaUploadField label="شعار الهيئة" value={logoUrl} purpose="authority_logo" fallbackText="هـ" onUploaded={(asset) => setLogoUrl(asset.url)} onClear={() => setLogoUrl("")} />
      <MediaUploadField label="غلاف الهيئة" value={coverUrl} purpose="authority_cover" fallbackText="غ" onUploaded={(asset) => setCoverUrl(asset.url)} onClear={() => setCoverUrl("")} />
      <button type="submit" className="rounded bg-civic px-4 py-2 font-semibold text-white">حفظ</button>
      {api.message ? <p className="text-sm text-ink/60">{api.message}</p> : null}
    </form>
  );
}

export function AdminPartyLogoForm({ party }: { party: any }) {
  const api = useApiMessage();
  const [logoUrl, setLogoUrl] = useState(party.logoUrl || "");
  const logoFallback = <div className="grid h-10 w-10 place-items-center rounded bg-civic/10 text-sm font-bold text-civic">{party.name?.slice(0, 1) || "ح"}</div>;

  return (
    <form action={(formData) => api.submit(`/api/admin/parties/${party._id}`, { logoUrl: formData.get("logoUrl") || null }, "PATCH")} className="mt-3 grid gap-2">
      <div className="flex items-center gap-2">
        <SafeImage src={logoUrl} alt={party.name || "شعار الحزب"} className="h-10 w-10 shrink-0 rounded bg-white object-contain ring-1 ring-line" fallback={logoFallback} />
        <input name="logoUrl" type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} className="min-w-0 flex-1 rounded border-line text-sm" placeholder="https://example.com/logo.png" />
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
          goals: splitLines(formData.get("goals")),
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
  const [thumbnailUrl, setThumbnailUrl] = useState("");
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
          youtubeUrl: formData.get("youtubeVideoId") || null,
          thumbnailUrl: formData.get("thumbnailUrl") || thumbnailUrl || "",
          tags: splitComma(formData.get("tags")),
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
        <input name="youtubeVideoId" className="rounded border-line" placeholder="رابط YouTube أو معرف الفيديو" />
      </div>
      <input name="officialReferenceUrl" className="w-full rounded border-line" placeholder="رابط رسمي اختياري" />
      <MediaUploadField label="رفع صورة القانون من الجهاز" value={thumbnailUrl} purpose="law_thumbnail" onUploaded={(asset) => setThumbnailUrl(asset.url)} onClear={() => setThumbnailUrl("")} />
      <input name="thumbnailUrl" className="w-full rounded border-line" value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder="أو أدخل رابط صورة خارجي" />
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
