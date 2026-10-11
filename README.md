# Gifts by VF

Bespoke gifts storefront — customised jewellery, acrylic frames/prints and personalised pieces. The shop is a **static site driven by a Google Sheet as its content management system**: the owner edits the spreadsheet and the storefront (and sales-rep tools) update automatically.

**Live site:** https://vf-gift-shop.vercel.app

---

## Features

**Storefront (`index.html`)**
- Product catalogue with search, category & occasion filters, price ranges, and sorting
- Four stacked product collections with category navigation and grouped product types
- Featured products (flagged `featured = TRUE`) are highlighted within their catalogue category
- Direct **WhatsApp ordering** — every product card opens a pre-filled chat with the product, price, and sales-rep referral
- Copy-a-link share buttons for individual products (`/product/<slug>`)
- Referral tracking: visitors arriving via `?ref=<rep_id>` are attributed to a sales rep for 30 days
- Testimonials section (first 6 shown, "See more" expands the rest)
- Portfolio / recent work gallery, Why Us, How to Order steps, FAQ (all content-driven)

**Sales-rep tools (`reps.html`)**
- Rep login by `rep_id`, personalised WhatsApp + catalogue links, commission check
- Ready-made sales pitch copy per product

**Admin (`admin.html`)**
- Quick links to set up the Google Form, App Script, and content, with copy-able URLs

---

## Tech stack

- **Vanilla HTML / CSS / JavaScript** — no framework or runtime dependencies
- **Google Sheets** — content source, read via the public `gviz`/CSV export endpoints
- **Vercel** — static-site build and hosting; `/product/:slug` uses a serverless function to read the Products sheet

## How the spreadsheet "CMS" works

The sheet exposes a set of named tabs that the site fetches and renders client-side:

| Tab | Purpose |
|---|---|
| `Site Settings` | Site title, brand, hero copy, section labels, WhatsApp number |
| `Products` | Name, description, image URL, optional video URL, price, category, order, visibility, stock, occasion, featured, material/size/processing time/delivery/payment notes, sales caption |
| `Sales Reps` | `rep_id`, name, commission rate, active flag |
| `Payouts` | Order/commission records used by the rep tools |
| `Testimonials` | Quote, name, source, star rating |
| `Portfolio` | Image URLs, captions, category, wide flag |
| `Why Us` | Heading, description, icon |
| `How to Order` | Numbered step title + description |
| `FAQs` | Question, answer, order, visibility |

**Column conventions:** `display_order` sorts content (blanks last), `is_visible` toggles visibility (`TRUE`/blank), `featured` promotes products, `in_stock`/`stock_label` handle Sold Out states.

**Caching & refresh:** tab data is cached in the browser for 60 seconds (`CACHE_TTL`). Append **`?refresh=1`** to any page to bypass the cache and load the latest sheet values immediately.

## Referral system

- Reps share links like `https://vf-gift-shop.vercel.app/?ref=VF001`
- The referral is stored in `localStorage` (`vf_referral`) for **30 days** and appended to the WhatsApp order message so the right rep gets credited
- The "You were referred by …" banner shows **once** on first arrival and has a dismiss (×) button that clears the stored referral
- Appending **`?clearref=1`** to the URL wipes any stored referral on that device

## Project structure

```
.
├── index.html          # Storefront
├── reps.html           # Sales-rep tools
├── css/style.css       # All styles (responsive, no framework)
├── js/
│   ├── shared.js       # VFUtils: sheet fetch, CSV parsing, caching, slugify, helpers
│   ├── app.js          # Storefront logic (settings, products, collections, referral)
│   ├── product-taxonomy.json # Category, subgroup, and product-type definitions
│   └── reps.js         # Sales-rep logic
├── api/
│   ├── settings.js     # Serverless: site settings (used by /product pages)
│   └── product/[slug].js# Serverless: product page data for /product/<slug>
├── scripts/build-site.cjs # Copies static site files to public/
├── vercel.json         # Routing, rewrites, cache headers
└── .gitignore
```

## Local development

Build the static deployment output:

```bash
npm run build
```

For local development, serve the folder directly:

```bash
npx serve .
# or any static server
python -m http.server 8080
```

Open `http://localhost:8080` and the site will read the live spreadsheet as-is. Edit `js/app.js` / `css/style.css` and reload — since assets are versioned (`?v=N`), bump the `?v=` on the changed asset in `index.html`/`reps.html`/`admin.html` when deploying.

## Deployment

1. Push to the GitHub repo — Vercel auto-deploys `main` (GitHub integration)
2. `vercel.json` sets `no-cache` on HTML and routes `/product/:slug` to the product serverless function
3. Verify with `https://vf-gift-shop.vercel.app/?refresh=1`

---

*Content is managed from the private Google Sheet belonging to Gifts by VF; the repo contains only the site code.*