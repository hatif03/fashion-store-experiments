# STILLFORM

A luxury fashion store built around an interactive clothing rail: a storefront, a Supabase backend with real checkout (manual payment methods) and a protected dashboard for the store owner.

- **Set up your own store:** [`docs/SETUP.md`](docs/SETUP.md) (`npm run setup` guides you; about 20 minutes, no code changes)
- **Deploy your store, or the backend-free showroom:** [`docs/DEPLOY.md`](docs/DEPLOY.md)
- **How the backend works:** [`docs/BACKEND.md`](docs/BACKEND.md) (schema, security rules, functions, checkout protection)
- **Experiments (Toggle Wars):** [`docs/HACKATHON-PLAN.md`](docs/HACKATHON-PLAN.md), [`docs/experiments/`](docs/experiments/), [`docs/METRICS.md`](docs/METRICS.md), [`docs/DECISIONS.md`](docs/DECISIONS.md)
- **Screenshots:** [`docs/screenshots/`](docs/screenshots/) (storefront) and [`docs/screenshots/phase-2/`](docs/screenshots/phase-2/) (dashboard, checkout)

## Try the running experiment

The public showroom is [stillform-sepia.vercel.app](https://stillform-sepia.vercel.app). [EXP-001](docs/experiments/EXP-001-homepage-merchandising.md) is running: the homepage is one of two versions, assigned at random. The record of real visits, with cities on a map, is [stillform-sepia.vercel.app/live](https://stillform-sepia.vercel.app/live). Checkout on this site is a demo. Nothing is charged and no personal details are asked.

**If you are reviewing, open these.** They show each version and leave you out of the result.

| What | Link |
| --- | --- |
| Mark this browser as a reviewer | https://stillform-sepia.vercel.app/?internal=1 |
| The control | https://stillform-sepia.vercel.app/?internal=1&preview=rail |
| The other version | https://stillform-sepia.vercel.app/?internal=1&preview=grid |
| The live map | https://stillform-sepia.vercel.app/live?internal=1 |

`?internal=1` sticks in this browser until `?internal=0`. A visit with no parameters is a real participant, so use the table above while reviewing.

**If you are sending visitors,** link to the homepage, never a product page, and don't describe the two versions. Each channel has its own link. The posting notes are in [`docs/TRAFFIC.md`](docs/TRAFFIC.md).

| Channel | Link |
| --- | --- |
| WeMakeDevs | https://stillform-sepia.vercel.app/?utm_source=wemakedevs&utm_medium=chat&utm_campaign=togglewars |
| Flagsmith | https://stillform-sepia.vercel.app/?utm_source=flagsmith&utm_medium=chat&utm_campaign=togglewars |
| X | https://stillform-sepia.vercel.app/?utm_source=x&utm_medium=post&utm_campaign=togglewars |
| LinkedIn | https://stillform-sepia.vercel.app/?utm_source=linkedin&utm_medium=post&utm_campaign=togglewars |

## The store

Without Supabase configured, the store runs on its built-in collection and a demo checkout. With it, products, stock and orders live in your database and are managed at `/admin`.

The shoot list for replacing the demo photography is in [`docs/ASSET-PLAN.md`](docs/ASSET-PLAN.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run build:demo` | The showroom: built-in collection, bag, demo checkout, no Studio, no backend settings read |
| `npm run preview` | Serve the production build locally |
| `npm run setup` | Connect the store to your Supabase project, step by step (`-- --check` to only report) |
| `npm run admin:grant -- you@example.com` | Make an existing account an administrator |
| `npm run verify:remote` | Read-only security checks against your project, as a visitor |
| `npm run preflight` | Launch gate: fails if the store would go live with test protection or open sign-ups (`-- --demo` for the showroom) |
| `npm run check:public` | Before pushing to a public repository: scans for keys, project references and personal data |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (bag logic, catalogue integrity) |
| `npm run test:db` | Database tests: migrations, security rules and checkout against a real Postgres 17 |
| `npm run test:e2e` | Browser tests: storefront (demo mode) plus dashboard and checkout against a local test backend. Run `npx playwright install chromium` once first |
| `npm run db:build` | Regenerate `supabase/seed.sql` and `supabase/setup.sql` from the demo catalogue and migrations |
| `npm run test:demo` | The Demo Studio at `/demo/admin` in the production showroom build, on desktop and a phone: edits reach the store, Reset Demo, no backend requests |
| `npm run test:showroom` | The production showroom build in a browser: every route, direct links, the bag, the demo checkout, no Studio, no backend requests |
| `npm run test:permissions` | Exact database grants, checked on a strict and a legacy Supabase project |

Testing against a real Supabase project (`remote:users`, `test:remote`, `remote:cleanup`) is for developers only, on a separate test project; see the end of [`docs/SETUP.md`](docs/SETUP.md).

In development, `/lab/original-rail` renders the untouched original component and demo for side-by-side comparison. It is excluded from production builds. Add `?slots` to any page in development to outline where photography is still missing.

## Pages

- `/` — rail hero, brand statement, featured collection, lookbook, footer
- `/shop` — all pieces, filterable by category (`?category=knitwear`)
- `/products/:slug` — product page; `?colour=black` selects a colourway
- `/checkout`, `/order/:reference` — checkout and confirmation. On the public showroom this is a demo: nothing is charged and no personal details are asked. A configured store takes a real order
- `/live` — visitors, countries and cities from the anonymous event log. Hidden from the navigation; the © line in the footer links here
- `/info` — shipping, returns and contact, from the store settings
- `/demo/admin` — the Demo Studio, only in the showroom build (`build:demo`): the real dashboard over fictional, browser-local data, no login and no backend. Edits to products, prices, stock, the rail, collections, the lookbook, orders and settings show in the demo store; **Reset demo** restores the original. Code in `src/demo/`; the production build never includes it
- `/admin` — the dashboard (sign-in required; administrators only). Left out of the showroom build, and of any build with `VITE_STUDIO_ENABLED=false`
- The bag is a drawer available everywhere
- Ask the studio — a sales associate on every storefront page. It answers from the built-in collection (cloth, colour, what to wear together, shipping and returns) and can place a piece in the bag. The browser talks to `POST /api/chat`; the key for [K2 Horizon](https://docs.ifm.ai/docs/quickstart.md) stays in `IFM_API_KEY` on the server. See [`.env.example`](.env.example)

## Architecture

```
src/
  catalog/            content model and data access
    types.ts          Catalog, Product, Colorway, Variant, MediaAsset, settings…
    local/            the demo collection (used when Supabase isn't configured, and to build the seed)
    selectors.ts      pure lookups: rail entries, stock, prices, paths
    CatalogProvider   loads the catalogue: demo data, or storefront_catalog() from Supabase
  bag/                bag reducer (stock-capped) + provider (localStorage)
  associate/          studio sales associate: catalogue briefing, IFM K2 Horizon, selection checks
  checkout/           checkout availability, validation, Turnstile, the place-order call and error handling
  admin/              the dashboard (lazy-loaded): pages, image tools, rail photo editor
  lib/supabase.ts     the Supabase client (anon key only) and RPC helper
  components/
    ui/product-rail-gallery.tsx   the clothing rail (see below)
    PurchasePanel, ProductCard, BagDrawer, SiteHeader, SiteFooter
    Photo             responsive photograph (srcset, focal-point crops, fade-in)
    AssetSlot         dev-only outline of a missing photograph
    StillLife         lookbook fallback when a look has no photograph
  sections/           home page sections
  pages/              routes
  baseline/           verbatim copy of the original component (dev comparison only)
assets/               full-size image sources (not published; see assets/README.md)
scripts/setup.mjs     guided setup; preflight.mjs, check-public.mjs, grant-admin.mjs, build-seed.mjs
scripts/prepare-supplied-images.mjs    retouch pipeline → public/media/products
scripts/prepare-editorial-images.mjs   640–2048 px WebP variants → public/media/editorial
supabase/migrations/  versioned SQL: schema, security, storage, storefront and admin APIs, checkout protection
supabase/functions/place-order/  the checkout Edge Function (throttle, Turnstile, then place_order)
supabase/seed.sql     the demo collection as starter data (generated)
supabase/setup.sql    migrations + seed in one file, for the SQL editor (generated)
tests/db/             database tests (embedded Postgres 17)
tests/harness/        local test backend for the browser tests
tests/remote/         optional checks against a real test project
docs/                 setup and deployment guides, backend reference, asset plan and screenshots
```

### Data and the backend

Presentation components never contain product details or image URLs; everything comes from one `Catalog` object (`src/catalog/types.ts`). In demo mode it comes from `src/catalog/local`. With Supabase configured it comes from the `storefront_catalog()` function, which returns the same shape, built from the tables described in [`docs/BACKEND.md`](docs/BACKEND.md). The dashboard writes through `admin_*` functions; checkout through the `place-order` Edge Function, which checks Cloudflare Turnstile and a per-connection limit before calling `place_order()`. There is one source of truth at a time: live mode never falls back to demo data.

### The clothing rail

`src/components/ui/product-rail-gallery.tsx` is the supplied component. The physics engine (spring rail, collisions, swing, hang-tag lag, rotation, lift-to-detail transition) is unchanged. The integration changes are:

- `renderCaption` and `renderDetail` slots, so the rail stays commerce-agnostic while the store adds prices, sizes and add-to-bag; the caption slot can also open the front piece ("Take it down")
- `header`, `aside`, `backdrop` and `footerClassName` slots for the editorial hero composition
- moving the pointer from the rail into its caption keeps the piece turned, so the caption's controls are reachable
- `maxHeight`, so the rail can scale to the viewport
- an image-decode gate, so garments fade in and the opening "brush" plays on loaded photos
- a fix so the opening brush also runs under React StrictMode
- a focus trap that covers links and form inputs, with arrow keys left to form controls
- a detail overlay that scrolls on short screens without clipping
- typography aligned to the house type system
- a front-photo-only fallback: without a back photo, the close-up doesn't invent a back view (no Back toggle; dragging gives a gentle turn that springs home)

## Images

| Set | Source | Notes |
| --- | --- | --- |
| Rail cut-outs (27) | Supplied with the rail component, hosted locally | Third-party prints retouched out of 6 pieces; lilac crew toned to oat; the ochre tee left out. 645 px wide. |
| Campaign frames (4) and fabric close-ups (5) | AI-generated (Nano Banana 2.1 via Higgsfield) using the cut-outs as garment references | Faithful to the products, but stand-ins for a real shoot. Served as 640–2048 px WebP with `srcset`; never upscaled. |

All are tagged with `origin` and `replaceNote` in `src/catalog/local/media.ts`. **[`docs/ASSET-PLAN.md`](docs/ASSET-PLAN.md)** lists exactly what to shoot, at what size, and where each photo appears.

## What works, and what is deferred

**Working**
- Storefront: rail (hover, drag, swipe, keyboard, turn, lift-to-detail), product pages, bag, editorial lookbook, demo mode
- Supabase backend: schema, row level security, storage policies, starter data, one-file setup
- Checkout: cash on delivery, bank transfer or pay-at-pickup (configurable); server-side pricing and stock; atomic, oversell-proof orders; bot protection (Cloudflare Turnstile, verified server-side) and a per-connection limit; confirmation with reference
- Dashboard: sign-in for administrators only; products (create from one front photo, align and preview on the rail, publish, archive, delete), stock per size and colour, rail order, collections and homepage selection, lookbook spreads and photos, orders (confirm, ship, deliver, paid, cancel with restock, notes), settings, unused-image clean-up

**Deliberately deferred**
- Online card payments (Stripe or similar) and refunds through a payment provider
- Order emails to customers and the owner (the notification address is stored, nothing is sent)
- Customer accounts and order history
- Discounts, tax calculation by region, multiple currencies, shipping zones
- Search, inventory history, CSV import and export
- "Complete the look" purchasing (the pairings data model is ready for it)

## Licence

MIT for STILLFORM's code: free to use, modify and sell, including commercially. See [`LICENSE`](LICENSE) and [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
