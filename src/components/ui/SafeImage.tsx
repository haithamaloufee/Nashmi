"use client";

import { useMemo, useState, type ReactNode } from "react";
import { normalizeSafeImageUrl } from "@/lib/imageUrls";

type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
  localPrefixes?: string[];
};

export default function SafeImage({ src, alt, className, fallback, localPrefixes }: SafeImageProps) {
  const safeSrc = useMemo(() => normalizeSafeImageUrl(src, { localPrefixes: localPrefixes || ["/images/", "/uploads/"] }), [src, localPrefixes]);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!safeSrc || failedSrc === safeSrc) return <>{fallback}</>;

  return (
    <img
      src={safeSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(safeSrc)}
    />
  );
}
