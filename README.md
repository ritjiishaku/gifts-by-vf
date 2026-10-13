# Gifts by VF

Bespoke gifts storefront — customised jewellery, acrylic frames/prints, brand signages and personalised keepsakes. The site is a **Next.js app with a Supabase (Postgres) content store** and a custom owner CMS at `/admin`. There is no checkout: every call-to-action opens a pre-filled WhatsApp chat.

**Live site:** https://giftsbyvf.vercel.app

---

## Features

**Storefront (`/`)**
- Server-rendered hero, catalogue, portfolio, Why Us, testimonials, How to Order and FAQ — content comes from Supabase, so the page is fully crawlable (not blank without JS)
- Product catalogue with keyword search, category & occasion filters, price ranges and sorting
- Featured products highlighted within their catalogue group
- Direct **WhatsApp ordering** — every card opens a pre-filled chat with the product, price and sales-rep referral
- Copy-a-link share buttons for individual products
- Referral tracking: visitors arriving via `?ref=<rep_id>` are attributed to a sales rep for 30 days

**Product pages (`/product/<slug>`)**
- Server-rendered with full SEO metadata (OpenGraph/Twitter), canonical URL and Product JSON-LD
- WhatsApp order CTA, shareable link, related products
- Deep-linked from the storefront via `/?p=<slug>`

**Sales-rep portal (`/reps`)**
- Login by `rep_id` + personal PIN (first-time reps set their PIN on first sign-in)
- Personalised WhatsApp + catalogue links, commission rule, and payout history

**Owner CMS (`/admin`)**
- Passphrase-gated (server-side) CRUD for all content types:
  - Settings (brand, hero, section labels, category images, footer, commission line)
  - Products, Sales reps, Testimonials, Portfolio, Why Us, How to Order, FAQ
- Searchable icon picker for product, portfolio and Why-Us icons
- Per-rep invite/share panel and PIN reset

---

## Tech stack

- **Next.js 15** (App Router, JavaScript) with **React 19**
- **Supabase** (`@supabase/supabase-js`) — Postgres as the content store; all reads/writes happen server-side
- **Plain global CSS** (`css/style.css`) — no CSS framework
- **Vercel** — auto-detected as Next.js; non-transactional brochure site (orders via WhatsApp)

---

## Content model (Supabase tables)

| Table | Purpose |
|---|---|
| `site_settings` | Key/value site copy: brand, hero, section labels, WhatsApp number, category images, footer |
| `products` | Catalogue: name, slug, description, image/video URL, price, category/subcategory/product type, stock, occasion, details, icon |
| `sales_reps` | `rep_id`, name, commission rate, active flag, scrypt `pin_hash` |
| `payouts` | Order/commission records shown in the rep portal |
| `testimonials` | Quote, name, source, rating |
| `portfolio` | Image URLs, caption, category, wide flag, optional icon badge |
| `why_us` | Heading, description, icon |
| `how_to_order` | Step title + description |
| `faqs` | Question, answer |

Conventions: `display_order` sorts content (blanks last), `is_visible` toggles visibility, `featured` promotes products, `in_stock`/`stock_label` handle Sold Out states.

### Migrations

SQL is kept in `supabase/migrations/` and versioned in git:

| File | Adds |
|---|---|
| `0001_init.sql` | All tables + RLS (deny-all for anon) |
| `0002_rep_pins.sql` | `sales_reps.pin_hash` |
| `0003_backfill_product_slugs.sql` | Populates `products.slug` (idempotent) |
| `0004_portfolio_icon.sql` | `portfolio.icon` |

Apply them in order, either in the **Supabase Dashboard → SQL Editor** (paste and run), or with the CLI after `supabase link`:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

---

## Environment variables

Copy `.env.example` to `.env.local` (gitignored) and fill in real values:

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Single source of truth for `metadataBase`, canonical URLs, `og:url`, Product JSON-LD, share and referral links |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | All DB reads/writes — never expose to the browser |
| `ADMIN_PASS_HASH` | **server only** | Passphrase for `/admin` (a 64-char SHA-256 hex digest, or the plaintext passphrase) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | public | Fallback WhatsApp number (also editable as a setting) |

Optional: `ADMIN_COOKIE_SECRET` to sign the admin session cookie independently of the passphrase (falls back to `ADMIN_PASS_HASH`).

Changing domains later is a one-variable change: update `NEXT_PUBLIC_SITE_URL` and redeploy.

---

## Local development

Requires Node.js 18.18+ (20+ recommended).

```bash
npm install
cp .env.example .env.local        # then fill in the values (Windows: copy .env.example .env.local)
npm run dev                       # http://localhost:3000
```

Other scripts:

```bash
npm run build     # production build
npm run start     # serve the production build
npm run lint      # ESLint
```

Pages revalidate every 60 seconds, so CMS edits appear on the storefront within about a minute (no cache-busting query params needed).

---

## Referral system

- Reps share links like `https://giftsbyvf.vercel.app/?ref=VF001`
- The referral is stored in `localStorage` (`vf_referral`) for **30 days** and appended to the WhatsApp order message so the right rep is credited
- The "You were referred by …" banner shows **once** on first arrival and has a dismiss (×) button
- Appending **`?clearref=1`** to the URL wipes any stored referral on that device

---

## Routes

| Route | Type | Notes |
|---|---|---|
| `/` | Server + client components | Storefront; `revalidate = 60` |
| `/product/[slug]` | Server component | Product detail + JSON-LD + WhatsApp CTA; `revalidate = 60` |
| `/reps` | Client component | Rep portal (login + dashboard) |
| `/admin` | Client UI + server actions | Passphrase gate, then CMS |
| `/api/reps` | Route handler | Rep login / first-time PIN setup (POST) and status check (GET) |

Preserved URL params: `/?p=<slug>` (deep link), `?ref=<rep_id>` (referral), `?clearref=1` (clear referral).

---

## Project structure

```
.
├── app/
│   ├── (site)/                     # Public storefront
│   │   ├── layout.js               # Navbar / referral banner / footer shell
│   │   ├── page.js                 # Home sections + ItemList JSON-LD
│   │   └── product/[slug]/page.js  # Product page + metadata + Product JSON-LD
│   ├── admin/                      # Owner CMS (passphrase-gated)
│   │   ├── page.js
│   │   ├── actions.js              # Server actions (all writes)
│   │   └── components/            # AdminDashboard, forms, IconPicker, AdminLogin
│   ├── reps/                       # Sales-rep portal
│   ├── api/reps/route.js           # Rep auth + PIN setup
│   ├── layout.js                   # Root layout, global CSS, site metadata
│   ├── not-found.js
│   └── icon.svg
├── components/                     # Storefront & shared UI (Navbar, Hero, Catalogue, …)
├── css/style.css                   # Global styles
├── lib/
│   ├── supabase.js                 # Server-side Supabase client (service role)
│   ├── data.js                     # Data-access helpers
│   ├── format.js                   # slugify, price formatting, image/video URL helpers
│   ├── site.js                     # Site defaults, SITE_URL, WhatsApp link builder
│   ├── taxonomy.js / taxonomy.json # Category / subgroup / product-type taxonomy
│   ├── auth.js                     # Admin session cookie (HMAC-signed)
│   ├── rep-pin.js                  # Rep PIN hashing (scrypt)
│   └── settings-schema.js          # Admin settings field definitions
├── supabase/migrations/            # Versioned SQL migrations
├── .github/workflows/secret-scan.yml  # gitleaks secret scan on push/PR
├── next.config.mjs                 # Security headers
├── jsconfig.json                   # @/* path alias
└── package.json
```

---

## Deployment

1. Push to the GitHub repo — Vercel auto-deploys `main` (GitHub integration)
2. Set all environment variables in **Vercel → Project → Settings → Environment Variables**
3. No `vercel.json` is needed; Vercel detects Next.js automatically

---

## Security

- `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASS_HASH` are used **server-side only** and never shipped to the browser
- RLS is enabled on every table with **no policies**, so the public anon key can read nothing; all data access goes through the service-role client on the server
- The `/admin` gate is enforced server-side via a signed, httpOnly session cookie (12-hour TTL)
- Rep PINs are hashed with scrypt (`salt:hash`) and verified in constant time
- A gitleaks workflow scans pushes and PRs for committed secrets

---

*Content is managed from the `/admin` area (backed by Supabase); the repo contains only the site code.*
