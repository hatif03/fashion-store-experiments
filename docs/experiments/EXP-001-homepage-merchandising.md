# EXP-001: Homepage merchandising, rail vs grid

**Status:** running. This section was filled in at launch and is frozen.

## Question

The clothing rail is the brand's signature and its most expensive component: physics, three photos per piece, and the heaviest page on mobile. Does it get more visitors into the products than a conventional grid of the same pieces? If it does not, it is a cost we should drop.

## Pre-registration

| Field | Value |
| --- | --- |
| Hypothesis | For visitors who land on the homepage of the public showroom during the run window, replacing the interactive rail with a static grid of the same pieces in the same order will lower the share who open at least one product by at least 20% relative. |
| Flag | `homepage_merchandising`, multivariate. Flag value and control: `rail`. Variation key: `grid` |
| Exposure | `getExperimentFlag("homepage_merchandising")` on the homepage only, after flags load. A neutral placeholder shows until then, for at most 2.5 seconds. If flags haven't loaded by then, the visitor sees the rail with no exposure recorded, and stays on the rail for the rest of the visit so the page never switches under them |
| Identity | One visitor id in `localStorage`, shared by flags and events |
| Population | 100% of homepage visitors in the production environment, except our own browsers marked `?internal=1` and headless browsers |
| Split | 50 / 50. Not changed after launch |
| Primary metric | `product_viewed`, occurrence, direction `increase` |
| Secondary metrics | `piece_added` occurrence (`increase`), `checkout_started` occurrence (`increase`), `order_placed` occurrence (`increase`) and sum of `value` (`increase`) |
| Guardrail | `engaged_visit` occurrence, should not decrease |
| Run window | Started 04:22 IST, Friday 27 Nov 2026 (Flagsmith `started_at` 2026-11-26T22:52:35Z). Ahead of the 19:00 target, recorded in [D-015](../DECISIONS.md). Minimum 24 hours, so the first snapshot that can decide it is 04:22 IST, Saturday 28 Nov |
| Stopping rule | At the first 6-hourly snapshot after 24 hours where the trust checks pass and the grid's chance to beat the rail is above 95% or below 5%. Otherwise at a hard stop of Sat 28 Nov, 22:00 IST |
| Decision rule | Ship the grid only above 95% with a credible interval clear of zero. Below 5%, the rail is confirmed. In between, inconclusive, and the rail stays |

## Why this metric

The metric has to fire early in a visit, and our traffic will be a few hundred visitors per version. Smallest relative change detectable at roughly 95% confidence and 80% power, with a 50/50 split:

| Visitors per version | Base rate 10% (adds a piece) | Base rate 40% (opens a product) |
| --- | --- | --- |
| 300 | ~69% | ~28% |
| 1,000 | ~38% | ~15% |

Detecting a 10% change in add-to-bag at a 10% base rate would take about 14,000 visitors per version. Opening a product is the step the homepage exists to drive, and most visitors take it, so it is the primary metric. Add-to-bag, checkout and orders are secondary: closer to revenue, but too rare to decide this test on their own.

Formula: smallest absolute change ≈ 2.8 × √(2p(1 − p) / n), for base rate p and n visitors per version.

## What counts as `product_viewed`

- The product page mounts (from a grid card, the shop, a pairing or the associate).
- A piece is taken down from the rail into its detail view.

Both versions can produce the event, so the comparison is fair. The `source` metadata records which path it came from.

## The two versions

- **Control, `rail`:** today's homepage. Ten pieces hang on the interactive rail. Pulling one down opens its detail view, which counts as `product_viewed` with source `rail`.
- **Variant, `grid`:** the same ten pieces in the same order, as product cards in a grid (two columns on phones, five on wide screens). The heading, piece count and everything below the hero are unchanged. Opening a card goes to the product page, which counts as `product_viewed` with source `grid`.

Any version can be seen without being enrolled by adding `?preview=rail` or `?preview=grid` to the homepage address.

## Flagsmith setup

| Item | QA | Production |
| --- | --- | --- |
| Environment key | `S7XdcYEJmwHsrATg4CWvgT` | `EtSGzCGxfgVyDbvNSTp8vR` |
| Feature | `homepage_merchandising` (306276), control `rail`, variation `grid` (option 37513) | Same feature |
| Metrics | 826 to 832 | 833 to 839, listed in [`../METRICS.md`](../METRICS.md#flagsmith-metrics) |
| Experiment | 789, running since 03:02 IST, 27 Nov, for verification | 790, running since 04:22 IST, 27 Nov |

Environment keys are public by design: they ship in the browser bundle and only read flags.

### Finding: creating an experiment changes assignments before it starts

Creating experiment 789 in QA immediately published its rollout: a segment `experiment-789-rollout` with a 50/50 split on the feature. Identities got split values straight away, but with no enrolment metadata and no exposures, because the experiment hadn't started. When it started, assignments were drawn again. A visitor seen before the start could switch version at the start.

This doesn't affect production results. One browser opened the production site before the start (visitor `1ff52a21-8c37-483f-bd3b-8a4636188964`, this machine, Kolkata, `/` and `/shop`). It is excluded from the result, and our own browsers use `?internal=1` from here on. After the start, the raw flags response carries `metadata.experiment.in_experiment: true`, which is what the SDK uses to decide whether to record an exposure. A sample of 60 new identities in QA got 24 `grid` and 36 `rail`, within what a fair 50/50 coin gives at that size.

## Setup checklist

- [x] Warehouse connected in production and QA
- [x] Flag created with a key on every variation
- [x] Metrics created, names matching [`../METRICS.md`](../METRICS.md) exactly
- [x] Experiment created in QA and verified: exposures and every event arrive
- [x] Deployed to production at https://stillform-sepia.vercel.app with the production environment key. The event log recorded a real visit in Kolkata, and `/live` showed it on the map
- [x] Experiment 790 created in production with the same flag, metrics and hypothesis
- [x] Experiment 790 started at 04:22 IST, Friday 27 Nov 2026. Rollout 100%, split 50/50
- [x] Store frozen. Bug fixes only, each logged here with a timestamp

## Run log

Snapshots every ~6 hours: identities per version, primary metric per version, chance to beat control, sample ratio warning (yes or no), excluded identities, notes.

| Time (IST) | Rail ids | Grid ids | Rail rate | Grid rate | Chance grid wins | SRM | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fri 27 Nov, 04:22 | — | — | — | — | — | — | Started. Excluded visitor `1ff52a21-8c37-483f-bd3b-8a4636188964` (our browser, before the start, no exposure). |

## Results

To be written when the experiment ends: lift, 95% credible interval, chance to beat control for every metric, the frequentist cross-check, and what we did.

## Decision

To be written.
