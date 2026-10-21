export function slugify(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function validateUrl(str) {
  const s = String(str || "").trim();
  if (/^https?:\/\//i.test(s)) return s;
  return "";
}

export function isDriveUrl(url) {
  return /drive\.google\.com|googleusercontent\.com/i.test(String(url || ""));
}

export function driveId(url) {
  const u = String(url || "");
  let m = u.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/i);
  if (m) return m[1];
  m = u.match(/[?&]id=([A-Za-z0-9_-]{20,})/i);
  if (m) return m[1];
  m = u.match(/\/d\/([A-Za-z0-9_-]{20,})/i);
  if (m) return m[1];
  return null;
}

export function directImageUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  const id = driveId(u);
  if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  if (isDriveUrl(u)) return "";
  return u;
}

export function videoUrl(url) {
  const u = String(url || "").trim();
  if (!u) return null;
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  if (yt) return { src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`, type: "iframe" };
  if (isDriveUrl(u)) {
    const id = driveId(u);
    if (id) return { src: `https://drive.google.com/file/d/${id}/preview`, type: "iframe" };
    return null;
  }
  if (/^https?:\/\/\S+\.(mp4|webm)(\?\S*)?$/i.test(u)) return { src: u, type: "file" };
  return null;
}

export function formatNaira(str) {
  const s = String(str == null ? "" : str).trim();
  if (!s) return "";
  const cleaned = s.replace(/^ngn\s*/i, "").replace(/^[₦#N₹?]+\s*/i, "");
  if (/^[0-9,.]+$/.test(cleaned)) {
    const n = Math.round(parseFloat(cleaned.replace(/,/g, "")));
    if (!Number.isFinite(n)) return s;
    // Pin the locale so the server (Node defaults to en-US) and every browser
    // render the identical grouping. A bare toLocaleString() formats per-locale
    // (e.g. de-DE → "53.000"), which mismatches the server HTML and makes
    // React hydration throw a client-side exception.
    return "₦" + n.toLocaleString("en-US");
  }
  return s;
}

export function priceNumber(row) {
  const s = String(row && row.price != null ? row.price : "").trim();
  if (!s) return null;
  const cleaned = s.replace(/^ngn\s*/i, "").replace(/^[₦#N₹?]+\s*/i, "");
  if (!/^[0-9,.]+$/.test(cleaned)) return null;
  const n = parseFloat(cleaned.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Parse a commission rate that may arrive as 10, "10", "10%" or "10.5".
// Returns null when there is no usable (finite, non-negative) rate.
export function parseRate(value) {
  const raw = String(value == null ? "" : value).trim().replace(/%+$/, "").trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Commission earned on an order amount at a percentage rate.
//   amount 0/empty  -> 0
//   no usable rate  -> null  (caller decides the fallback: manual entry)
// Rounds to the nearest naira, matching RepPortal's estimatedCommission().
export function commissionAmount(amount, rate) {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return 0;
  const r = parseRate(rate);
  if (r == null) return null;
  return Math.round((amt * r) / 100);
}

// Find the catalogue product whose name matches `name` exactly
// (case-insensitive, trimmed). Returns null for a custom / unknown name.
// Used by the admin order form so the picker and the form agree on what
// "an exact catalogue match" means.
export function matchProduct(products, name) {
  const wanted = String(name == null ? "" : name).trim().toLowerCase();
  if (!wanted) return null;
  return (
    (products || []).find(
      (p) => String(p && p.name != null ? p.name : "").trim().toLowerCase() === wanted
    ) || null
  );
}

export function isSoldOut(row) {
  if (!row) return false;
  if (typeof row.in_stock === "boolean") return row.in_stock === false;
  const raw = String(row.in_stock == null ? "" : row.in_stock).toLowerCase();
  return raw === "false" || raw === "0" || raw === "no";
}

export function isFeatured(row) {
  if (!row) return false;
  if (typeof row.featured === "boolean") return row.featured;
  const v = String(row.featured != null ? row.featured : "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isVisible(row) {
  if (!row) return false;
  if (typeof row.is_visible === "boolean") return row.is_visible !== false;
  const v = String(row.is_visible == null ? "" : row.is_visible).toLowerCase();
  return v !== "false" && v !== "0";
}

export function isActiveRep(row) {
  if (!row) return false;
  const raw = row.is_active != null && row.is_active !== "" ? row.is_active : row.is_visible;
  if (typeof raw === "boolean") return raw;
  const v = String(raw || "").toLowerCase();
  return v !== "false" && v !== "0";
}

export function filterAndSort(rows) {
  const seen = new Set();
  return (rows || [])
    .filter((r) => {
      if (!isVisible(r)) return false;
      if (r.id != null && seen.has(`id::${r.id}`)) return false;
      if (r.slug && seen.has(`slug::${r.slug}`)) return false;
      const key = [r.name || r.title || r.caption || r.question, r.price, r.image_url]
        .map((x) => String(x == null ? "" : x).trim().toLowerCase())
        .join("::");
      if (seen.has(key)) return false;
      if (r.id != null) seen.add(`id::${r.id}`);
      if (r.slug) seen.add(`slug::${r.slug}`);
      seen.add(key);
      return true;
    })
    .sort((a, b) => (parseInt(a.display_order) || 999) - (parseInt(b.display_order) || 999));
}

// True only when srcVariant() actually produces different URLs per width.
// For plain external URLs (no size params) it returns the input unchanged, so
// emitting a srcset would just repeat one URL and make the browser pick the
// largest — a full-resolution download for no benefit.
export function hasResizableVariants(url) {
  const u = String(url || "").trim();
  if (!u) return false;
  return (
    /googleusercontent\.com\/d\//i.test(u) ||
    /[?&]sz=/i.test(u) ||
    /[?&](w|h)=/i.test(u)
  );
}

// True for images already hosted on Supabase Storage (the optimised path).
export function isSupabaseImage(url) {
  return /\.supabase\.co\/storage\/v1\/object\/public\//i.test(String(url || ""));
}

export function srcVariant(url, width, height) {
  const u = String(url || "").trim();
  if (!u) return "";
  const h = height == null ? width : height;

  if (/googleusercontent\.com\/d\//i.test(u)) {
    const cleanUrl = u.replace(/=[a-z0-9-]*$/i, "");
    return `${cleanUrl}=s${width}`;
  }

  if (/[?&]sz=/i.test(u)) {
    return u.replace(/([?&])sz=[^&]*/i, `$1sz=w${width}-h${h}`);
  }

  if (!/[?&](w|h)=/i.test(u)) return u;

  let out = u;
  if (/[?&]w=\d+/i.test(out)) out = out.replace(/([?&])w=\d+/i, `$1w=${width}`);
  else out += (out.includes("?") ? "&" : "?") + `w=${width}`;
  if (/[?&]h=\d+/i.test(out)) out = out.replace(/([?&])h=\d+/i, `$1h=${h}`);
  else out += `&h=${h}`;
  return out;
}

export function starRating(rating) {
  const n = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// Build a social-share (Open Graph / Twitter) image URL.
// Messenger crawlers (WhatsApp, Facebook) drop images larger than ~300 KB, so
// request a correctly-sized 1.91:1 crop from Google's CDN instead of the full
// original. Returns { url } for unknown hosts, or { url, width, height } when
// the size was applied so callers can emit og:image:width/height.
export function ogImage(url, { width = 1200, height = 630 } = {}) {
  const u = validateUrl(url);
  if (!u) return null;
  if (/googleusercontent\.com\/d\//i.test(u)) {
    const clean = u.replace(/=[a-z0-9-]*$/i, "");
    return { url: `${clean}=w${width}-h${height}`, width, height, type: "image/jpeg" };
  }
  return { url: u };
}

export function siteImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const video = videoUrl(raw);
  if (video && !isDriveUrl(raw)) return "";
  return validateUrl(directImageUrl(raw));
}

export function slugName(p, pid) {
  return slugify(p && p.name) || slugify(pid) || "product";
}

// Safely serialize structured data for a <script type="application/ld+json">.
// Escaping "<" prevents a value containing "</script>" from breaking out of
// the script tag (stored XSS).
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
