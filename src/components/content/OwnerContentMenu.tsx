"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import MediaUploadField from "@/components/ui/MediaUploadField";
import SafeImage from "@/components/ui/SafeImage";
import { useToast } from "@/components/ui/ToastProvider";
import { canEditOwnPost, canEditOwnPoll } from "@/lib/permissions";

type SafeUser = { id: string; role: string } | null;
type MediaItem = { _id?: string; url: string; mimeType?: string; type?: "image" | "video" | "document"; status?: string };

type OwnerContentMenuProps = {
  type: "post" | "poll";
  item: any;
  onUpdated: (item: any) => void;
  onDeleted: () => void;
};

let currentUserPromise: Promise<SafeUser> | null = null;

function existingMedia(item: any): MediaItem[] {
  return (item?.mediaIds || []).filter((media: unknown): media is MediaItem => typeof media === "object" && media !== null && Boolean((media as MediaItem).url) && (media as MediaItem).status !== "deleted");
}

function mediaId(item: MediaItem) {
  return item._id || item.url;
}

function fetchCurrentUser() {
  if (!currentUserPromise) {
    currentUserPromise = fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => (json?.ok ? json.data?.user || null : null))
      .catch(() => null);
  }
  return currentUserPromise;
}

export default function OwnerContentMenu({ type, item, onUpdated, onDeleted }: OwnerContentMenuProps) {
  const { showToast } = useToast();
  const [user, setUser] = useState<SafeUser>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(item?.title || "");
  const [content, setContent] = useState(item?.content || "");
  const [tags, setTags] = useState(Array.isArray(item?.tags) ? item.tags.join(", ") : "");
  const [question, setQuestion] = useState(item?.question || "");
  const [description, setDescription] = useState(item?.description || "");
  const [options, setOptions] = useState(Array.isArray(item?.options) ? item.options.map((option: any) => option.text).join("\n") : "");
  const [media, setMedia] = useState<MediaItem[]>(() => existingMedia(item));

  useEffect(() => {
    void fetchCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    setTitle(item?.title || "");
    setContent(item?.content || "");
    setTags(Array.isArray(item?.tags) ? item.tags.join(", ") : "");
    setQuestion(item?.question || "");
    setDescription(item?.description || "");
    setOptions(Array.isArray(item?.options) ? item.options.map((option: any) => option.text).join("\n") : "");
    setMedia(existingMedia(item));
  }, [item]);

  const isVisible = useMemo(() => {
    if (!user) return false;
    return type === "post" ? canEditOwnPost(user, item) : canEditOwnPoll(user, item);
  }, [item, type, user]);

  if (!isVisible) return null;

  async function saveEdit() {
    if (uploading) {
      showToast("انتظر حتى يكتمل رفع الملف.", "error");
      return;
    }
    setSaving(true);
    const payload =
      type === "post"
        ? {
            title: title.trim() || null,
            content: content.trim(),
            tags: tags.split(",").map((tag: string) => tag.trim()).filter(Boolean),
            mediaIds: media.map((mediaItem) => mediaItem._id).filter(Boolean)
          }
        : {
            question: question.trim(),
            description: description.trim() || null,
            ...(options !== (Array.isArray(item?.options) ? item.options.map((option: any) => option.text).join("\n") : "")
              ? { options: options.split("\n").map((option: string) => option.trim()).filter(Boolean) }
              : {})
          };

    const response = await fetch(`/api/${type === "post" ? "posts" : "polls"}/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      showToast(json.error?.message || "تعذر حفظ التعديلات.", "error");
      return;
    }
    onUpdated(json.data?.[type] || json.data?.post || json.data?.poll);
    setEditOpen(false);
    setMenuOpen(false);
    showToast("تم حفظ التعديلات.", "success");
  }

  async function deleteItem() {
    setSaving(true);
    const response = await fetch(`/api/${type === "post" ? "posts" : "polls"}/${item._id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "حذف بواسطة المالك" })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      showToast(json.error?.message || "تعذر الحذف.", "error");
      return;
    }
    onDeleted();
    setDeleteOpen(false);
    setMenuOpen(false);
    showToast("تم حذف المحتوى.", "success");
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setMenuOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-slate-600 hover:border-civic hover:text-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="إجراءات المحتوى">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <div className="absolute left-0 z-30 mt-2 w-44 rounded border border-line bg-white p-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-950">
          <button type="button" onClick={() => setEditOpen(true)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-right hover:bg-civic/10">
            <Pencil className="h-4 w-4" />
            تعديل
          </button>
          <button type="button" onClick={() => setDeleteOpen(true)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-right text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">
            <Trash2 className="h-4 w-4" />
            حذف
          </button>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">تعديل {type === "post" ? "المنشور" : "التصويت"}</h2>
              <button type="button" onClick={() => setEditOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </div>
            {type === "post" ? (
              <div className="space-y-3">
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded border-line" placeholder="عنوان اختياري" />
                <textarea value={content} onChange={(event) => setContent(event.target.value)} className="w-full rounded border-line" rows={6} placeholder="نص المنشور" required />
                <input value={tags} onChange={(event) => setTags(event.target.value)} className="w-full rounded border-line" placeholder="وسوم مفصولة بفواصل" />
                <MediaUploadField label="وسائط المنشور" imagesOnly={false} purpose="post" onUploaded={(asset) => setMedia((current) => current.length >= 6 ? current : [...current, { _id: asset._id, url: asset.url, type: asset.type, mimeType: asset.mimeType }])} onUploadingChange={setUploading} />
                {media.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {media.map((mediaItem) => (
                      <div key={mediaId(mediaItem)} className="rounded border border-line p-2">
                        {mediaItem.type === "video" || mediaItem.mimeType?.startsWith("video/") ? (
                          <video src={mediaItem.url} className="h-32 w-full rounded bg-black object-contain" controls preload="metadata" />
                        ) : (
                          <SafeImage src={mediaItem.url} alt="معاينة المرفق" className="h-32 w-full rounded object-contain" fallback={<div className="grid h-32 place-items-center text-sm text-slate-500">تعذر عرض الصورة</div>} localPrefixes={["/uploads/", "/images/", "/related/"]} />
                        )}
                        <button type="button" onClick={() => setMedia((current) => current.filter((entry) => mediaId(entry) !== mediaId(mediaItem)))} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-red-700">
                          <Trash2 className="h-4 w-4" />
                          إزالة
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <input value={question} onChange={(event) => setQuestion(event.target.value)} className="w-full rounded border-line" placeholder="السؤال" />
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded border-line" rows={3} placeholder="وصف اختياري" />
                <textarea value={options} onChange={(event) => setOptions(event.target.value)} className="w-full rounded border-line" rows={5} placeholder="كل خيار في سطر" />
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditOpen(false)} className="rounded border border-line px-4 py-2 font-semibold">إلغاء</button>
              <button type="button" onClick={saveEdit} disabled={saving || uploading} className="rounded bg-civic px-4 py-2 font-semibold text-white disabled:opacity-60">
                {saving ? "جار الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-950">
            <h2 className="text-lg font-bold">{type === "post" ? "حذف المنشور" : "حذف التصويت"}</h2>
            <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">
              {type === "post"
                ? "هل أنت متأكد أنك تريد حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء."
                : "هل أنت متأكد أنك تريد حذف هذا التصويت؟"}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteOpen(false)} className="rounded border border-line px-4 py-2 font-semibold">إلغاء</button>
              <button type="button" onClick={deleteItem} disabled={saving} className="rounded bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
                {saving ? "جار الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
