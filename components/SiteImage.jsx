import Image from "next/image";
import { directImageUrl, validateUrl, srcVariant, hasResizableVariants, isSupabaseImage } from "@/lib/format";

// Renders an image responsively:
// - Supabase-hosted images (the migrated/optimised case) go through next/image,
//   which resizes them and serves WebP/AVIF with long-lived caching.
// - Any other host (legacy Google Drive links, arbitrary pasted URLs) falls back
//   to a plain <img> so nothing ever breaks, but sized via srcVariant when the
//   host supports it.
//
// `fill` (default true) makes the image cover its positioned parent — every
// container in this project (.product-img, .portfolio-item, .category-card-media,
// .hero) is already position:relative/an absolute overlay with object-fit:cover.
export function SiteImage({
  src,
  alt = "",
  sizes = "100vw",
  priority = false,
  fill = true,
  className,
  id,
  style,
  onError,
  legacyWidths = [300, 600, 900],
}) {
  const url = validateUrl(directImageUrl(src));
  if (!url) return null;

  if (isSupabaseImage(url)) {
    return (
      <Image
        src={url}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={className}
        id={id}
        style={style}
        onError={onError}
      />
    );
  }

  // Legacy path: plain <img> with a srcset only when it actually changes the URL.
  const srcSet = hasResizableVariants(url)
    ? legacyWidths.map((w) => `${srcVariant(url, w, w)} ${w}w`).join(", ")
    : undefined;

  return (
    <img
      id={id}
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      className={className}
      style={style}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      onError={onError}
    />
  );
}
