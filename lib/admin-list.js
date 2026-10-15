import { slugify } from "./format";

/* ── Shared helpers for the admin lists (search / sort / visibility / duplicates) ── */

// Case-insensitive substring search across the given fields. Every whitespace
// separated term must match somewhere ("silver necklace" matches a row that
// has "silver" in one field and "necklace" in another).
export function matchesQuery(row, keys, q) {
  const query = String(q || "").trim().toLowerCase();
  if (!query || !row) return true;
  const haystack = (keys || [])
    .map((k) => String(row[k] ?? ""))
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  return query.split(/\s+/).every((term) => haystack.includes(term));
}

function labelOf(row) {
  return String(row?.name || row?.title || row?.caption || row?.question || "");
}

function byLabel(a, b) {
  return labelOf(a).localeCompare(labelOf(b), undefined, { sensitivity: "base" });
}

// mode: "order" (display_order, default) | "name" (A–Z) | "newest" (highest id first)
export function sortRows(rows, mode = "order") {
  const list = [...(rows || [])];
  if (mode === "name") return list.sort(byLabel);
  if (mode === "newest") return list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  return list.sort(
    (a, b) =>
      (parseInt(a.display_order, 10) || 999) - (parseInt(b.display_order, 10) || 999) ||
      byLabel(a, b)
  );
}

function boolOf(value) {
  if (typeof value === "boolean") return value;
  const v = String(value ?? "").toLowerCase();
  return v !== "false" && v !== "0" && v !== "";
}

// mode: "all" | "visible" | "hidden" (based on the row's is_visible flag)
export function visFilter(rows, mode = "all") {
  if (!mode || mode === "all") return rows || [];
  return (rows || []).filter((r) => {
    const visible = boolOf(r?.is_visible);
    return mode === "visible" ? visible : !visible;
  });
}

// Duplicate products are the same (normalized) name in the same category —
// images and slugs may differ. Used both in the list and in saveProductAction.
export function dupKey(product) {
  const name = slugify(product?.name || "");
  if (!name) return "";
  return `${name}::${slugify(product?.category || "")}`;
}

// Returns a Set of dupKeys shared by more than one row (empty names ignored).
export function duplicateKeySet(rows, keyFn = dupKey) {
  const counts = new Map();
  (rows || []).forEach((row) => {
    const key = keyFn(row);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
}
