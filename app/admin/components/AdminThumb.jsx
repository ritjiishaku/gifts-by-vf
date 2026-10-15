import { validateUrl, directImageUrl } from "@/lib/format";

// Admin list thumbnails. Google Drive share links (and other external URLs) are
// normalised to a direct image URL so they render instead of appearing broken.
// Falls back to a letter tile when there is no usable image.
export function AdminThumb({ url, fallback = "" }) {
  const src = validateUrl(directImageUrl(url));
  if (src) return <img src={src} alt="" loading="lazy" />;
  return fallback ? <>{fallback}</> : null;
}
