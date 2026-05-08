"use client";

import { useMemo, useRef, useState } from "react";
import { upload as blobUpload } from "@vercel/blob/client";
import { ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
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
  completeEndpoint?: string;
  fileField?: string;
  purpose?: string;
  rounded?: "full" | "default";
  fallbackText?: string;
  onUploaded: (asset: UploadedAsset) => void;
  onClear?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
};

const imageAccept = "image/jpeg,image/png,image/webp,image/gif";
const mediaAccept = `${imageAccept},video/mp4,video/webm`;
const allowedImages = new Set(imageAccept.split(","));
const allowedMedia = new Set(mediaAccept.split(","));
const imageLimit = 5 * 1024 * 1024;
const videoLimit = 25 * 1024 * 1024;

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/webm") return "webm";
  return "bin";
}

function validateClientFile(file: File, imagesOnly: boolean) {
  const allowed = imagesOnly ? allowedImages : allowedMedia;
  if (!allowed.has(file.type)) {
    return imagesOnly
      ? "الصيغ المسموحة للصور: JPG أو PNG أو WEBP أو GIF."
      : "الصيغ المسموحة: صور JPG أو PNG أو WEBP أو GIF، أو فيديو MP4/WEBM.";
  }
  if (file.size <= 0) return "الملف فارغ.";
  const max = file.type.startsWith("video/") ? videoLimit : imageLimit;
  if (file.size > max) return `حجم الملف يتجاوز الحد الأقصى المسموح (${Math.floor(max / 1024 / 1024)}MB).`;
  return null;
}

function xhrUpload(input: { endpoint: string; fileField: string; purpose: string; file: File; onProgress: (value: number) => void }) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append(input.fileField, input.file);
    form.append("purpose", input.purpose);
    xhr.open("POST", input.endpoint);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) input.onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("NETWORK"));
    xhr.onload = () => {
      const json = JSON.parse(xhr.responseText || "{}");
      if (xhr.status < 200 || xhr.status >= 300 || !json.ok) reject(new Error(json.error?.message || "تعذر رفع الملف"));
      else resolve(json);
    };
    xhr.send(form);
  });
}

export default function MediaUploadField({
  label,
  value,
  helper = "يمكنك رفع صورة بصيغة JPG أو PNG أو WEBP أو GIF",
  imagesOnly = true,
  endpoint = "/api/uploads",
  completeEndpoint,
  fileField = "file",
  purpose = "post",
  rounded = "default",
  fallbackText = "ص",
  onUploaded,
  onClear,
  onUploadingChange
}: MediaUploadFieldProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const displayUrl = previewUrl || value || "";
  const imageClass = useMemo(
    () =>
      rounded === "full"
        ? "h-24 w-24 rounded-full bg-white object-cover ring-1 ring-line dark:bg-slate-900"
        : "h-32 w-full rounded bg-white object-contain p-2 ring-1 ring-line dark:bg-slate-900",
    [rounded]
  );
  const fallback = (
    <div className={rounded === "full" ? "grid h-24 w-24 place-items-center rounded-full bg-civic/10 text-2xl font-bold text-civic" : "grid h-32 w-full place-items-center rounded bg-civic/10 text-2xl font-bold text-civic"}>
      {fallbackText}
    </div>
  );

  function setUploadingState(value: boolean) {
    setUploading(value);
    onUploadingChange?.(value);
  }

  async function directBlobUpload(file: File) {
    const extension = extensionForMimeType(file.type);
    const storageKey = `media/direct/${crypto.randomUUID()}.${extension}`;
    const result = await blobUpload(storageKey, file, {
      access: "public",
      handleUploadUrl: "/api/uploads/blob",
      contentType: file.type,
      multipart: file.type.startsWith("video/") || file.size >= 5 * 1024 * 1024,
      clientPayload: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, purpose }),
      abortSignal: abortRef.current?.signal,
      onUploadProgress: (event) => setProgress(Math.max(1, Math.round(event.percentage)))
    });

    const response = await fetch(completeEndpoint || endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: result.url, storageKey, mimeType: file.type, sizeBytes: file.size, fileName: file.name, purpose })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) throw new Error(json.error?.message || "تعذر تثبيت الملف بعد رفعه");
    return json;
  }

  async function upload(file: File | null | undefined) {
    if (!file || uploading) return;
    const validationError = validateClientFile(file, imagesOnly);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(localPreview);
    setPreviewType(file.type);
    setProgress(0);
    setUploadingState(true);
    abortRef.current = new AbortController();

    try {
      let json: any;
      try {
        json = await directBlobUpload(file);
      } catch {
        json = await xhrUpload({ endpoint, fileField, purpose, file, onProgress: setProgress });
      }

      const asset = json.data.asset || json.data.user;
      onUploaded(json.data.asset || { _id: "", url: asset.avatarUrl, type: "image", mimeType: file.type });
      setProgress(100);
      showToast(file.type.startsWith("video/") ? "تم رفع الفيديو بنجاح" : "تم رفع الصورة بنجاح", "success");
    } catch (error) {
      setPreviewUrl(null);
      setPreviewType("");
      URL.revokeObjectURL(localPreview);
      showToast(error instanceof Error ? error.message : "تعذر رفع الملف. حاول مرة أخرى.", "error");
    } finally {
      abortRef.current = null;
      setUploadingState(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  async function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewType("");
    setProgress(0);
    onClear?.();
    showToast("تم حذف الملف من النموذج", "success");
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{label}</span>
        {uploading ? <span className="inline-flex items-center gap-1 text-xs text-civic"><Loader2 className="h-3.5 w-3.5 animate-spin" /> جار الرفع {progress}%</span> : null}
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
        <div className="grid gap-3 sm:grid-cols-[132px_1fr] sm:items-center">
          {previewType.startsWith("video/") ? (
            <video src={displayUrl} className="h-32 w-full rounded bg-black object-contain ring-1 ring-line" controls muted />
          ) : (
            <SafeImage src={displayUrl} alt={label} className={imageClass} fallback={fallback} localPrefixes={["/uploads/", "/images/", "/related/"]} />
          )}
          <div className="min-w-0 space-y-3">
            <p className="text-sm leading-6 text-ink/65 dark:text-slate-300">{helper}</p>
            {uploading ? (
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full bg-civic transition-all" style={{ width: `${Math.max(progress, 4)}%` }} />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded bg-civic px-3 py-2 text-sm font-semibold text-white hover:bg-civic/90 disabled:opacity-60"
              >
                {value || previewUrl ? <Upload className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                {value || previewUrl ? "تغيير الملف" : imagesOnly ? "اختيار صورة" : "اختيار ملف"}
              </button>
              {uploading ? (
                <button type="button" onClick={cancelUpload} className="inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-ink/70 hover:border-civic">
                  <X className="h-4 w-4" />
                  إلغاء
                </button>
              ) : null}
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
