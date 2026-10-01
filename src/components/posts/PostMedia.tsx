"use client";
import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import SafeImage from "@/components/ui/SafeImage";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { normalizeSafeImageUrl } from "@/lib/imageUrls";
export type FeedMedia = { _id?: string; url: string; type?: "image" | "video" | "document"; mimeType?: string; status?: string };
const MediaViewer = dynamic(() => import("./MediaViewer"), { ssr: false });

export default function PostMedia({ media, title }: { media: FeedMedia[]; title: string }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => { setSelected(null); requestAnimationFrame(() => opener.current?.focus({ preventScroll: true })); }, []);
  const safeMedia = media.map(item => ({ ...item, url: normalizeSafeImageUrl(item.url, { localPrefixes: ["/uploads/", "/images/", "/related/"] }) })).filter((item): item is FeedMedia => Boolean(item.url));
  const images = safeMedia.filter(item => item.type !== "video" && !item.mimeType?.startsWith("video/") && item.type !== "document" && !item.mimeType?.startsWith("application/"));
  return <>
    <div className={`post-media mt-3 ${safeMedia.length > 1 ? "post-media-grid" : ""}`} data-post-media>
      {safeMedia.slice(0, 4).map((item, index) => item.type === "video" || item.mimeType?.startsWith("video/") ?
        <video key={item._id || item.url} className="aspect-video w-full bg-black object-contain" controls playsInline preload="none" aria-label={title}>
          <source src={item.url} type={item.mimeType || "video/mp4"} />
        </video> : item.type === "document" || item.mimeType?.startsWith("application/") ?
        <a key={item._id || item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="focus-ring flex min-h-11 items-center justify-center px-4 text-civic underline">{t("social.openDocument")}</a> :
        <button key={item._id || item.url} type="button" className="focus-ring relative block w-full overflow-hidden" aria-haspopup="dialog" aria-label={`${t("social.openImage")} ${index + 1}`} onClick={event => { opener.current = event.currentTarget; setSelected(images.indexOf(item)); }}>
          <SafeImage src={item.url} alt={`${title} — ${index + 1}`} className="h-full max-h-[360px] w-full object-contain" sizes={media.length > 1 ? "(max-width: 640px) 50vw, 310px" : "(max-width: 640px) 100vw, 620px"} localPrefixes={["/uploads/", "/images/", "/related/"]} fallback={<span className="grid min-h-44 place-items-center text-sm text-ink/60">{t("common.error")}</span>} />
          {index === 3 && media.length > 4 ? <span className="absolute inset-0 grid place-items-center bg-black/55 text-3xl font-bold text-white">+{media.length - 4}</span> : null}
        </button>)}
    </div>
    {selected !== null ? <MediaViewer images={images} initialIndex={selected} title={title} onClose={close} /> : null}
  </>;
}
