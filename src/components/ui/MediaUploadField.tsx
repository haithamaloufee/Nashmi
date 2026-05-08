"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { useToast } from "@/components/ui/ToastProvider";

type UploadedAsset = {
  _id: string;
  url: string;
  type?: "image" | "video" | "document";
  mimeType?: string;
};

type MediaUploadFieldProps = {
  label: string;
  value?: string | null;
  helper?: string;
  imagesOnly?: boolean;
  endpoint?: string;
  fileField?: string;
  rounded?: "full" | "default";
  fallbackText?: string;
  onUploaded: (asset: UploadedAsset) => void;
  onClear?: () => void;
};

const imageAccept = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif";
const mediaAccept = `${imageAccept},video/mp4,video/webm`;

export default function MediaUploadField({
  label,
  value,
  helper = "يمكنك رفع صورة بصيغة JPG أو PNG أو WEBP أو GIF",
  imagesOnly = true,
  endpoint = "/api/uploads",
  fileField = "file",
  rounded = "default",
  fallbackText = "ص",
  onUploaded,
  onClear
}: MediaUploadFieldProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const displayUrl = previewUrl || value || "";
  const imageClass = useMemo(
    () =>
      rounded === "full"
        ? "h-24 w-24 rounded-full bg-white object-cover ring-1 ring-line dark:bg-slate-900"
        : "h-28 w-full rounded bg-white object-contain p-2 ring-1 ring-line dark:bg-slate-900",
    [rounded]
  );
  const fallback = (
    <div className={rounded === "full" ? "grid h-24 w-24 place-items-center rounded-full bg-civic/10 text-2xl font-bold text-civic" : "grid h-28 w-full place-items-center rounded bg-civic/10 text-2xl font-bold text-civic"}>
      {fallbackText}
    </div>
  );

  async function upload(file: File | null | undefined) {
    if (!file || uploading) return;
    if (imagesOnly && !file.type.startsWith("image/")) {
      showToast("يرجى اختيار صورة فقط.", "error");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);

    const form = new FormData();
    form.append(fileField, file);
    try {
      const response = await fetch(endpoint, { method: "POST", body: form });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        setPreviewUrl(null);
        URL.revokeObjectURL(localPreview);
        showToast(json.error?.message || "تعذر رفع الصورة", "error");
        return;
      }
      const asset = json.data.asset || json.data.user;
      onUploaded(json.data.asset || { _id: "", url: asset.avatarUrl, type: "image", mimeType: file.type });
      showToast("تم رفع الصورة بنجاح", "success");
    } catch {
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
      showToast("تعذر الاتصال بالخادم أثناء رفع الصورة", "error");
    } finally {
      setUploading(false);
    }
  }

  async function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onClear?.();
    showToast("تم حذف الصورة من النموذج", "success");
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{label}</span>
        {uploading ? <span className="inline-flex items-center gap-1 text-xs text-civic"><Loader2 className="h-3.5 w-3.5 animate-spin" /> جار الرفع</span> : null}
      </div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files?.[0]);
        }}
        className={`rounded border border-dashed p-3 transition ${dragging ? "border-civic bg-civic/10" : "border-line bg-paper/40 dark:bg-slate-900/40"}`}
      >
        <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-center">
          <SafeImage src={displayUrl} alt={label} className={imageClass} fallback={fallback} localPrefixes={["/uploads/", "/images/", "/related/"]} />
          <div className="space-y-3">
            <p className="text-sm leading-6 text-ink/65 dark:text-slate-300">{helper}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded bg-civic px-3 py-2 text-sm font-semibold text-white hover:bg-civic/90 disabled:opacity-60"
              >
                {value || previewUrl ? <Upload className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                {value || previewUrl ? "تغيير الصورة" : "اختيار صورة"}
              </button>
              {(value || previewUrl) && onClear ? (
                <button type="button" onClick={clear} disabled={uploading} className="inline-flex items-center gap-2 rounded border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                  <Trash2 className="h-4 w-4" />
                  حذف
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <input ref={inputRef} type="file" accept={imagesOnly ? imageAccept : mediaAccept} className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} disabled={uploading} />
      </div>
    </div>
  );
}
