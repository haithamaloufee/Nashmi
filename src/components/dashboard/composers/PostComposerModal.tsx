"use client";

import { useState, type FormEvent } from "react";
import { ImagePlus, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ComposerModalShell from "@/components/dashboard/composers/ComposerModalShell";
import PublisherIdentity from "@/components/dashboard/composers/PublisherIdentity";
import type { PublisherComposerProfile, UploadedComposerMedia } from "@/components/dashboard/composers/types";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import LoadingButton from "@/components/ui/LoadingButton";
import MediaUploadField from "@/components/ui/MediaUploadField";
import SafeImage from "@/components/ui/SafeImage";
import { useToast } from "@/components/ui/ToastProvider";

type PostComposerModalProps = {
  open: boolean;
  publisher: PublisherComposerProfile;
  onClose: () => void;
  onBack?: () => void;
  onPublished?: () => void;
};

export default function PostComposerModal({ open, publisher, onClose, onBack, onPublished }: PostComposerModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<UploadedComposerMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dirty = Boolean(content.trim() || media.length || uploadingMedia);

  function reset() {
    setContent("");
    setMedia([]);
    setUploadingMedia(false);
    setLoading(false);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError(t("composer.post.emptyError"));
      return;
    }
    if (uploadingMedia) {
      showToast(t("composer.post.uploadWait"), "error");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: null,
          content: trimmedContent,
          tags: [],
          mediaIds: media.map((item) => item.id).filter(Boolean)
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        const message = t("composer.post.error");
        setError(message);
        showToast(message, "error");
        return;
      }

      reset();
      showToast(t("composer.post.success"), "success");
      onPublished?.();
      router.refresh();
      onClose();
    } catch {
      const message = t("composer.post.error");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ComposerModalShell
      open={open}
      titleKey="composer.post.title"
      dirty={dirty && !loading}
      onBack={onBack ? () => {
        reset();
        onBack();
      } : undefined}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="space-y-5 p-4 sm:p-5">
          <PublisherIdentity publisher={publisher} />

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t("composer.post.placeholder")}
            className="min-h-44 w-full resize-y rounded-2xl border-0 bg-white/80 px-4 py-4 text-lg leading-9 text-ink shadow-inner ring-1 ring-line placeholder:text-ink/40 focus:ring-2 focus:ring-civic dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            aria-label={t("composer.post.placeholder")}
          />

          {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}

          <div className="rounded-2xl border border-line bg-white/72 p-3 dark:border-slate-700 dark:bg-slate-900/55">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-black text-ink dark:text-white">
                <ImagePlus className="h-4 w-4 text-civic dark:text-emerald-200" />
                {t("composer.post.mediaTools")}
              </div>
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold text-ink/55 ring-1 ring-line dark:bg-slate-950 dark:text-slate-300">
                {t("composer.post.mediaKind")}
              </span>
            </div>
            <MediaUploadField
              label={t("composer.post.attachments")}
              imagesOnly={false}
              helper={t("composer.post.uploadHelper")}
              fallbackText="+"
              purpose="post"
              onUploaded={(asset) =>
                setMedia((current) =>
                  current.length >= 6 ? current : [...current, { id: asset._id, url: asset.url, type: asset.type, mimeType: asset.mimeType }]
                )
              }
              onUploadingChange={setUploadingMedia}
            />
          </div>

          {media.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {media.map((item) => (
                <div key={item.id || item.url} className="rounded-xl border border-line bg-white p-2 dark:bg-slate-900">
                  {item.type === "video" || item.mimeType?.startsWith("video/") ? (
                    <video src={item.url} className="h-32 w-full rounded-lg bg-black object-contain" controls />
                  ) : (
                    <SafeImage
                      src={item.url}
                      alt={t("composer.post.previewAlt")}
                      className="h-32 w-full rounded-lg object-contain"
                      fallback={<div className="grid h-32 place-items-center text-sm text-ink/60">{t("composer.post.previewFailed")}</div>}
                      localPrefixes={["/uploads/", "/images/", "/related/"]}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setMedia((current) => current.filter((mediaItem) => mediaItem.id !== item.id))}
                    className="mt-2 inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("composer.post.removeMedia")}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="sticky bottom-0 border-t border-line bg-[#fffaf1]/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 sm:px-5">
          <LoadingButton
            type="submit"
            loading={loading || uploadingMedia}
            disabled={loading || uploadingMedia || !content.trim()}
            className="w-full rounded-xl bg-civic px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-civic/90"
          >
            {uploadingMedia ? t("composer.post.uploading") : loading ? t("composer.post.loading") : (
              <>
                <Send className="h-4 w-4" />
                {t("composer.post.submit")}
              </>
            )}
          </LoadingButton>
        </footer>
      </form>
    </ComposerModalShell>
  );
}
