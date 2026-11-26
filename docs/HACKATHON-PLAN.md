# Toggle Wars plan (Track 1, Test Something Real)

Hackathon: [Toggle Wars](https://www.wemakedevs.org/hackathons/flagsmith), 26 to 29 November 2026. Submissions close at **20:00 IST on Sunday 29 November**. All times below are IST.

Track 1 is judged on one experiment done well: a clear hypothesis, versions behind a flag, a metric from real events, and results we can explain. The store only has to be real enough to run the test on. Decisions behind this plan are in [`DECISIONS.md`](DECISIONS.md).

## Constraints

- About 66 hours were left when this plan was written (02:00, Friday 27 November). Every hour before launch is data we lose.
- Traffic is the bottleneck. A few hundred visitors per version can only detect large effects, so the primary metric has to be one most visitors trigger. The numbers are in [`experiments/EXP-001-homepage-merchandising.md`](experiments/EXP-001-homepage-merchandising.md).
- A store change during an experiment muddies its result. Store features and the catalogue land before launch; after launch only bug fixes ship.
- Experiments run one at a time. The next starts only after the previous one has ended and its decision is recorded.
- The showroom build had checkout switched off, so add-to-bag was the deepest measurable step. A demo checkout fixes that.

## Phases

| When | Phase | Done when |
| --- | --- | --- |
| Fri morning | 0. Accounts | Flagsmith Cloud login through the CLI, a warehouse connected in the production and QA environments, Vercel project linked, `IFM_API_KEY` set on the host |
| Fri daytime | 1. Instrumentation | Tracking module, visitor id, UTM capture, the `homepage_merchandising` flag and the grid variant, all events in [`METRICS.md`](METRICS.md) firing in QA |
| Fri daytime | 2. Store features | Demo checkout, then the optional features below if time allows |
| Fri daytime | 3. Catalogue | New pieces and colourways live, rail lineup frozen |
| Done 04:22, Fri 27 Nov | 4. Launch | Deployed at https://stillform-sepia.vercel.app, events seen on QA and in the production event log, EXP-001 started, store frozen |
| Fri night to Sun 14:00 | 5. Run | Traffic rounds, snapshot every ~6 hours, EXP-001 stopping rule, then EXP-002 |
| Sun 14:00–18:00 | 6. Results | Scorecards read, frequentist cross-check, winner rolled out on the same flag, write-up, demo video, submission |

## Store changes

All of these ship before launch. Each one emits the events listed in [`METRICS.md`](METRICS.md).

**Must have**

1. Tracking module over the Flagsmith SDK: a visitor id in `localStorage` shared by flags and events, UTM and landing page as traits, and a footer line saying the store runs anonymous tests.
2. The `homepage_merchandising` flag: `rail` (control) and `grid`. A neutral placeholder shows until flags load, so no visitor sees both versions.
3. Demo checkout in the showroom: delivery method, review, then "Place demo order". No payment and no name, email or address. A confirmation page says nothing was charged or shipped. This gives checkout start, step drop-off, conversion rate, order value and revenue per visitor.

**If time allows**

4. Sort on the shop page (featured, price, newest).
5. "Complete the look" on product pages from the existing `pairsWith` data.
6. A size guide on product pages.

**Not now** (backlog): search, wishlist, accounts, reviews, promo codes, email capture, a shipping fee with a free-shipping threshold.

## Catalogue expansion

The supplied rail component shipped 10 garments. We use 9; the tenth (an ochre tee) carries a large third-party back print. A bigger catalogue needs new images.

Sources checked:

| Source | Verdict |
| --- | --- |
| CC0 photo sites (ISO Republic, Pikwizard) | Boutique scenes, not cut-outs on our hanger. Inconsistent on the rail |
| CleanPNG | Allows commercial use, but the licence terms are vague and most images are illustrations |
| Fashion datasets (DeepFashion, Kaggle H&M, Myntra) | Research or non-commercial licences. Not for a public site |
| AI generation with our own cut-outs as references | Matches the hanger, hook, light and framing. Chosen |

Two samples are in `assets/generated-source/samples/` (gitignored, local only): a navy chore jacket on white, and an ecru silk slip dress on grey.

Plan: about 12 new pieces and about 4 colourways, front view only (the rail already handles a piece with no back photo), across new categories and a wider price range.

| Category | Pieces |
| --- | --- |
| Outerwear | Chore jacket, wool overcoat, quilted liner jacket |
| Trousers | Pleated wool trouser, wide chino |
| Shirts and knitwear | Linen camp shirt, merino crew |
| Womenswear | Silk slip dress, ribbed knit midi dress, wide-leg trouser, and one or two more |
| New colourways | Heavyweight Tee in olive, Fleece Hoodie in black, and two more |

Pipeline:

1. Generate each piece against the existing cut-outs, on a flat background that contrasts with the garment.
2. Remove the background. `rembg` is not installed and may not support Python 3.14; test it, or use another tool.
3. Place each piece on the 645 × 1000 rail canvas with the hook tip at the top centre and the same hanger width as the existing pieces.
4. Write WebP copies to `public/media/products/<product>/<colourway>-front.webp`.
5. Add the products to `src/catalog/local/products.ts` and the media to `media.ts` with `origin: "generated"` and a `replaceNote`. Update the image table in the README. Run `npm test`.

The rail keeps about 10 curated hangers, and the grid variant shows exactly those pieces in the same order. Everything else is on `/shop`.

## Traffic

Real visits to the deployed showroom, https://stillform-sepia.vercel.app. Every link carries `utm_source` for its channel and points at the homepage: someone who lands straight on a product page never enters EXP-001. Posts say it is a demo store running an experiment, and they do not say what the versions are. The ready-to-post links, the reviewer links, and where to put each one are in [`TRAFFIC.md`](TRAFFIC.md).

| When | Channels |
| --- | --- |
| Fri evening | WeMakeDevs and Flagsmith Discords, X (tag @flagsmith and @WeMakeDevs), LinkedIn, trading test visits with other hackers |
| Sat | r/webdev Showoff Saturday (Saturdays only), r/SideProject, Peerlist, a dev.to post, daily.dev, Show HN around 19:30 |
| Sun morning | A reminder round |

Backup: if either version of a running experiment is below Flagsmith's floor (50 identities and 5 conversions) by Sunday 10:00, scripted traffic runs in a separate Flagsmith environment and is disclosed in the write-up. It is never mixed into the production results.

## Documentation

| File | Holds |
| --- | --- |
| [`experiments/README.md`](experiments/README.md) | How we run experiments, and the index |
| `experiments/EXP-NNN-*.md` | Pre-registration, run log, results and decision for each experiment |
| [`experiments/BACKLOG.md`](experiments/BACKLOG.md) | Ranked hypotheses not yet run |
| [`METRICS.md`](METRICS.md) | Event names, values and the KPIs built from them |
| [`DECISIONS.md`](DECISIONS.md) | Dated decision log |
| [`TRAFFIC.md`](TRAFFIC.md) | Every post, with its UTM link and visits |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Every change to the store |
