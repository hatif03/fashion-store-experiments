# Changelog

Every change to the store, newest first. Experiment runs and decisions are in `docs/experiments/` and `docs/DECISIONS.md`.

## 2026-11-27

- Started EXP-001 in production at 04:22 IST. The showroom is at https://stillform-sepia.vercel.app and the visitor map is at `/live`. The store is frozen until the experiment ends.
- Started EXP-002 to EXP-005 in production at 05:32 IST, Friday 27 November, after the code was deployed. Experiments 854, 855, 856 and 857. The homepage hero is unchanged.
- Fixed the Vercel functions, which crashed on Vercel because Node couldn't resolve the `@/` alias, extensionless imports or JSON imports. `npm run build:vercel` now bundles each function from `server/` into `.vercel/output`.
- Deployed the showroom to Vercel at https://stillform-sepia.vercel.app.
- Fixed `npm run preflight -- --demo` on Windows, where it couldn't start the build.
- On phones, the associate's button moves up while the product page's buy bar shows, so it no longer covers "Choose a size".
- Updated the end-to-end tests for the ten-piece rail and the demo checkout. Test runs never contact Flagsmith or the event log.
- Added the hidden live page at `/live`, linked from the © line in the footer: visitors, countries and cities on an animated world map, the funnel, the rail-vs-grid split, a live feed, sources, devices, top pieces and visitors per hour. Production data only, refreshed every 15 seconds.
- Added the event log: `POST /api/track` writes each event with the visitor's country and city from Vercel's headers into a separate Supabase project; `GET /api/stats` returns aggregates for `/live`. No IP addresses are stored.
- Added the demo checkout to the showroom: delivery, payment preference and review, then a `DEMO-` order reference. Nothing is charged and no personal details are asked.
- Added the grid version of the homepage hero behind the `homepage_merchandising` flag, with a neutral placeholder while flags load. `?preview=grid` and `?preview=rail` show a version without enrolment.
- Added Flagsmith: one anonymous visitor id for flags and events, UTM and device traits, and the events in [`docs/METRICS.md`](docs/METRICS.md). `?internal=1` turns tracking off in our own browsers. The footer says the store runs anonymous tests.
- Added a sort to the shop (featured, newest, price), "Complete the look" pairings and a size guide on product pages.
- Added 12 pieces and 4 colourways, including womenswear, with generated images. The collection is now 20 pieces; the rail shows ten.
- Added the Toggle Wars plan, experiment process, EXP-001 pre-registration draft, experiment backlog, metrics and events, decision log and traffic log under `docs/`.
- Updated the `flagsmith-experiment` skill: `product_viewed` as EXP-001's primary metric, `increase` as the direction for goal metrics, experiments one at a time.
