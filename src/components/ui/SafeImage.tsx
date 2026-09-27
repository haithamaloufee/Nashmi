"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { normalizeSafeImageUrl, shouldUseNextImageForUrl } from "@/lib/imageUrls";

type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
  localPrefixes?: string[];
  sizes?: string;
  priority?: boolean;
};

export default function SafeImage({ src, alt, className, fallback, localPrefixes, sizes = "(max-width: 768px) 100vw, 640px", priority = false }: SafeImageProps) {
  const safeSrc = useMemo(() => normalizeSafeImageUrl(src, { localPrefixes: localPrefixes || ["/images/", "/uploads/"] }), [src, localPrefixes]);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!safeSrc || failedSrc === safeSrc) return <>{fallback}</>;

  if (shouldUseNextImageForUrl(safeSrc)) {
    return (
      <Image
        src={safeSrc}
        alt={alt}
        width={900}
        height={600}
        sizes={sizes}
        priority={priority}
        unoptimized={safeSrc.startsWith("/api/media/")}
        className={className}
        onError={() => setFailedSrc(safeSrc)}
      />
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(safeSrc)}
    />
  );
}
