---
name: stillform
description: >-
  Work in the STILLFORM fashion store. Use when changing the storefront, catalogue,
  bag, checkout, dashboard, deployment, or environment variables, and when an agent
  first opens this repository.
---

# STILLFORM

Luxury storefront. The clothing rail, product pages, bag, and studio associate are the product. Read `README.md` for the map and `docs/DEPLOY.md` before changing how it is hosted.

## Where things live

- `src/catalog` is the only content model. Components read a `Catalog`. They do not hardcode products or prices.
- `src/catalog/local` is the built-in collection, used when Supabase is not configured and as the seed for a new store.
- `src/bag` is browser-only. Adding a piece does not reserve stock.
- `src/associate` and `POST /api/chat` are the studio associate. Follow the `sales-associate` skill before changing them.
- `src/admin` is the real dashboard. `src/demo` is the showroom simulation and is absent unless the build is `npm run build:demo`.
- `vercel.json` sends every path except `/api/` to `index.html`. Do not point `/api/chat` at the SPA.

## Secrets

- `.env.local` is gitignored. Never commit it, print it, or copy a key into a skill, a test, or a client file.
- `IFM_API_KEY` is server-only. Never prefix it with `VITE_`.
- `VITE_` values are public in the browser bundle. Never put a service-role key, a Turnstile secret, or the IFM key behind that prefix.
- `npm run check:public` fails if an IFM key or other secret is in a file git would publish.

## Checks

- `npm test` for unit tests.
- `npm run build` typechecks, then builds the store.
- `npm run build:demo` is the public showroom. It blanks Supabase and Turnstile. The associate still calls `/api/chat` when someone writes to it.

## Flagsmith

The experimentation plan is in the `flagsmith-experiment` skill. Do not add the SDK, the flag, or the experiment until someone asks to start that work.
