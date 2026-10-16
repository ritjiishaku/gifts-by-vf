-- Backfill a unique products.slug for every row 0003 skipped: rows left with a
-- NULL/empty slug because their name-derived slug would have collided with an
-- existing product.
--
-- Mirrors lib/format.js slugify() for the base: lowercase, non-alphanumeric runs
-- become "-", leading/trailing dashes trimmed, capped at 60 chars. Then mirrors
-- the app's uniqueSlug() suffixing: "slug", "slug-2", "slug-3", … — the suffix
-- shortens the stem so the result never exceeds the 60-char cap.
--
-- Idempotent: only rows whose slug is NULL or '' are touched, processed in id
-- order (so a repeated run, or two rows with the same name, resolves
-- deterministically). Rows that already carry a slug are never rewritten.
-- Run in the Supabase SQL editor; the app keeps working either way (old links
-- resolve via the name fallback in getProductBySlug()).

do $$
declare
  r record;
  base text;
  candidate text;
  suffix text;
  n int;
begin
  for r in
    select id, name
    from products
    where slug is null or slug = ''
    order by id
  loop
    base := left(btrim(regexp_replace(lower(coalesce(r.name, '')), '[^a-z0-9]+', '-', 'g'), '-'), 60);
    if base = '' then
      base := 'product';
    end if;

    candidate := base;
    n := 2;
    while exists (
      select 1
      from products p
      where p.slug = candidate
        and p.id <> r.id
    ) loop
      exit when n > 999; -- unreachable in practice; fails loudly rather than duplicating
      suffix := '-' || n;
      candidate := left(base, 60 - length(suffix));
      candidate := rtrim(candidate, '-');
      if candidate = '' then
        candidate := 'product';
      end if;
      candidate := candidate || suffix;
      n := n + 1;
    end loop;

    update products set slug = candidate where id = r.id;
  end loop;
end;
$$;
