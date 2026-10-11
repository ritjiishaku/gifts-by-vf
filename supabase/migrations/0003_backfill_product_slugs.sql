-- Backfill products.slug from the product name for rows that have none.
-- Mirrors lib/format.js slugify(): lowercase, non-alphanumeric sequences become
-- "-", leading/trailing dashes trimmed, capped at 60 chars.
-- Idempotent (only touches NULL/empty slugs). Rows whose computed slug would
-- collide with an existing different product are skipped — those still resolve
-- via the fallback name lookup in getProductBySlug().
-- Optional: the app resolves links without this, but keeping slugs populated
-- is cleaner. Run in the Supabase SQL editor if desired.
update products
set slug = left(btrim(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '-'), 60)
where (slug is null or slug = '')
  and not exists (
    select 1
    from products p2
    where p2.slug = left(btrim(regexp_replace(lower(products.name), '[^a-z0-9]+', '-', 'g'), '-'), 60)
      and p2.id <> products.id
  );