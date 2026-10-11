# Migration Plan: Gift By VF to Next.js + Supabase + Tailwind

## Goal

Convert the current vanilla HTML/CSS/JS storefront (Google-Sheet-driven, WhatsApp
checkout) into a modern Next.js application with a Supabase database and a custom
admin CMS, restyled mobile-first with Tailwind CSS. Preserve the existing design,
copy, and behavior.

- **Live site (new):** https://giftsbyvf.vercel.app/
- **Old domain (to be replaced everywhere):** https://vf-gift-shop.vercel.app

---

## Decisions (locked)

| Area | Decision |
|---|---|
| Framework | Next.js 15, App Router, JavaScript (no TypeScript) |
| Hosting | Vercel Hobby (free) — non-transactional brochure site (orders via WhatsApp only) |
| Data / CMS | Supabase (free tier) — Postgres as content store |
| Admin | Custom `/admin` CRUD built with the site; replaces 8 Google Forms |
| Admin gate | Moved server-side (env hash + httpOnly cookie); same passphrase UX |
| Styling | Tailwind CSS — full restyle, design kept identical |
| Layout approach | Mobile-first across every page |
| Images | Plain `<img>` tags (no `next/image` optimizer) |
| Content migration | One-time script: Google Sheet tabs to Supabase. Sheet no longer used after |
| Reps / referrals | Ported as-is (rep_id login, localStorage referral) |
| Product pages | Rendered directly at `/product/[slug]` (no redirect); full SEO metadata |

---

## Mobile-First Requirements

Every component is built base-mobile first, then scaled up with Tailwind
breakpoints (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). No desktop-default markup.

- Storefront: single-column sections, stacked/ mobile nav, catalogue grid
  `grid-cols-1 -> sm:2 -> lg:3/4`, filter pills horizontally scrollable on mobile,
  full-screen lightbox, buttons >= 44px, inputs at 16px (no zoom-on-focus).
- Product pages: stacked image/info; sticky WhatsApp CTA in the thumb zone on mobile.
- Reps page: single-column stats; tables wrapped in horizontal scroll (never squished).
- Admin CRUD: phone-first forms, full-width inputs, card/list views instead of wide
  tables, sticky save button; usable one-handed.
- Verify at 360, 390, 768, 1024, and 1280px. Test real tap targets and keyboard/zoom.

---

## Target Stack

- **Next.js 15, App Router, JavaScript** — `app/` directory
- **Supabase** (`@supabase/supabase-js`) — Postgres + client; reads server-side
- **Tailwind CSS** — full restyle
- **next/font** — Playfair Display + Inter (replaces Google Fonts `<link>`)
- Deployment: Vercel, auto-detected as Next.js (remove custom `vercel.json` rewrites)

---

## Routes

| Route | Type | Notes |
|---|---|---|
| `/` | Server shell + client components | Sections server-rendered from Supabase (SEO fixed; no longer blank without JS). Catalogue, search/sort/filter, lightbox, referral banner are client components. `revalidate = 60` (replaces 60s localStorage cache). |
| `/product/[slug]` | Server component | Rendered directly. `generateMetadata` + Product JSON-LD, WhatsApp CTA, shareable. Replaces `api/product/[slug].js` and its JS-redirect. |
| `/reps` | Client component | rep_id lookup against `sales_reps` + `payouts`; ported as-is. |
| `/admin` | Client UI + server actions | Passphrase gate (server-side), then CRUD for all content types. |
| `/api/settings` | Removed | No longer needed with server components. |

Preserved URL params: `/?p=<slug>` (deep link), `?ref=<rep_id>` (referral),
`?clearref=1`. `?refresh=1` becomes unnecessary (revalidate handles freshness).

---

## Database Schema (from the 9 sheet tabs)

```sql
site_settings(key text primary key, value text)

products(
  id bigint generated always as identity primary key,
  slug text unique not null,
  name text not null,
  description text,
  image_url text,
  video_url text,
  price text,
  category text,
  display_order int,
  is_visible boolean default true,
  in_stock boolean default true,
  stock_label text,
  occasion text,
  featured boolean default false,
  material text,
  size text,
  turnaround text,
  delivery_note text,
  payment_note text,
  sales_caption text,
  created_at timestamptz default now()
)

sales_reps(
  id bigint generated always as identity primary key,
  rep_id text unique not null,
  name text,
  commission_rate numeric,
  is_active boolean default true
)

payouts(
  id bigint generated always as identity primary key,
  rep_id text,
  product text,
  order_amount numeric,
  commission numeric,
  status text,
  date text,
  created_at timestamptz default now()
)

testimonials(
  id bigint generated always as identity primary key,
  name text, quote text, source text, rating int,
  display_order int, is_visible boolean default true
)

portfolio(
  id bigint generated always as identity primary key,
  image_url text, caption text, category text, is_wide boolean default false,
  display_order int, is_visible boolean default true
)

why_us(
  id bigint generated always as identity primary key,
  heading text, description text, icon text,
  display_order int, is_visible boolean default true
)

how_to_order(
  id bigint generated always as identity primary key,
  title text, description text,
  display_order int, is_visible boolean default true
)

faqs(
  id bigint generated always as identity primary key,
  question text, answer text,
  display_order int, is_visible boolean default true
)
```

- SQL migrations kept in `supabase/migrations/` (versioned in git).
- RLS enabled on all tables: **public read only**; all writes go through server
  actions using the service-role key (never exposed to the browser).
- Migration coerces `TRUE`/blank to booleans and generates `slug` from `name`.

---

## Environment Variables

Create `.env.local` (gitignored) and `.env.example` (committed):

```
NEXT_PUBLIC_SITE_URL=https://giftsbyvf.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASS_HASH=
NEXT_PUBLIC_WHATSAPP_NUMBER=2348127252004
```

`NEXT_PUBLIC_SITE_URL` becomes the single source of truth for canonical URLs,
`og:url`, Product JSON-LD, share links, and referral links (via `metadataBase`).
Changing domains later is a one-variable change.

---

## Execution Phases

1. **Scaffold** — `create-next-app` (JS, Tailwind, App Router, `app/`). Remove
   `scripts/build-site.cjs`, `vercel.json` rewrites, and old `api/` functions.
2. **Supabase** — create project; add SQL migrations under `supabase/migrations/`;
   add `.env.local` + `.env.example`.
3. **Data migration** — a one-time script reads all 9 sheet tabs via the existing
   CSV endpoints, coerces types, generates slugs, bulk-inserts. (Run locally;
   the script itself is not committed.)
4. **`lib/`** — unify the triplicated helpers:
   - `lib/supabase.js` (server + browser clients)
   - `lib/format.js` (`slugify`, `formatNaira`, `priceNumber`, `directImageUrl`, `filterAndSort`)
   - `lib/taxonomy.js` (from `js/product-taxonomy.json`)
5. **Storefront** — components: `Navbar`, `Hero`, `CategoryExplorer`, `Catalogue`,
   `ProductCard`, `Portfolio`, `WhyUs`, `Testimonials`, `HowToOrder`, `Faq`, `Footer`,
   `Lightbox`, `ReferralBanner`. Tailwind replaces `css/style.css`; custom keyframes
   move to the Tailwind theme. Port referral logic (`?ref` / `?clearref`, 30-day
   localStorage) unchanged.
6. **Reps page** — port `js/reps.js` logic to a client component reading Supabase.
7. **Admin** — server-side passphrase gate (env hash + httpOnly cookie), then CRUD
   sections with server actions for all 9 content types. Keep field-reference help
   (reworded to "field help"); remove all Google Forms / Apps Script / setup steps.
8. **Product pages** — server-rendered at `/product/[slug]` with `generateMetadata`,
   Product JSON-LD, WhatsApp CTA, and share link.
9. **Config + env** — wire all env vars; set `metadataBase`; remove hardcoded domain,
   WhatsApp number, sheet ID, and admin hash.
10. **Deploy + docs** — Vercel auto-detects Next.js; set env vars in dashboard;
    rewrite README for the new stack and URL.

---

## Preserved Behavior

- WhatsApp checkout flow (every CTA opens `wa.me` with a pre-filled message).
- Referral attribution: `?ref=<rep_id>` stored 30 days in localStorage and appended
  to WhatsApp messages; banner shows once; `?clearref=1` clears it.
- Rep login by `rep_id`; commission stats and payout history.
- Admin passphrase entry (semantics preserved, now enforced server-side).
- Product taxonomy, all copy/content, and `/?p=<slug>` deep links.

---

## Removed

- Google Sheets as data source; Google Forms; `form-sync.gs`; Apps Script docs.
- `scripts/build-site.cjs` and the manual `?v=N` cache-busting scheme.
- Client-side CSV fetching, hand-rolled CSV parser, localStorage data cache.
- The client-only admin gate (replaced by a server-side gate guarding writes).
- Duplicated helpers (`parseCSV`/`slugify`/`directImageUrl` in 3 files).

---

## Verification

- `npm run build` and `next lint` pass.
- Visual parity for every section vs the live site at mobile + desktop widths
  (360/390/768/1024/1280px).
- Manual tests: search/filter/sort, lightbox, referral banner + dismissal,
  `/product/[slug]` share preview + meta tags (OpenGraph validator), rep login,
  admin CRUD writes reflected on the storefront within the revalidate window.
- Confirm no secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASS_HASH`) reach the
  browser bundle.

---

## File Footprint (approx)

~40 new files: 5 route groups, ~15 components, `lib/` (3), migration script,
SQL migrations, env examples. Old HTML/CSS/JS removed once parity is confirmed.

---

## Open Items

- Provide Supabase project URL + keys at Phase 2.
- Confirm final domain remains `https://giftsbyvf.vercel.app` before go-live.
