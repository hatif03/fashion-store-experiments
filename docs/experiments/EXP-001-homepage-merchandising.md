# EXP-001: Homepage merchandising, rail vs grid

**Status:** draft, not started. Fill in the blanks at launch, then freeze this section.

## Question

The clothing rail is the brand's signature and its most expensive component: physics, three photos per piece, and the heaviest page on mobile. Does it get more visitors into the products than a conventional grid of the same pieces? If it does not, it is a cost we should drop.

## Pre-registration

| Field | Value |
| --- | --- |
| Hypothesis | For visitors who land on the homepage of the public showroom during the run window, replacing the interactive rail with a static grid of the same pieces in the same order will lower the share who open at least one product by at least 20% relative. |
| Flag | `homepage_merchandising`, multivariate. Flag value and control: `rail`. Variation key: `grid` |
| Exposure | `useExperiment("homepage_merchandising")` on the homepage only, after flags load. A neutral placeholder shows until then |
| Identity | One visitor id in `localStorage`, shared by flags and events |
| Population | 100% of homepage visitors in the production environment |
| Split | 50 / 50. Not changed after launch |
| Primary metric | `product_viewed`, occurrence, direction `increase` |
| Secondary metrics | `piece_added` occurrence (`increase`), `checkout_started` occurrence (`increase`), `order_placed` occurrence (`increase`) and sum of `value` (`increase`) |
| Guardrail | `engaged_visit` occurrence, should not decrease |
| Run window | Starts: ____ (Fri 27 Nov, target 19:00 IST). Minimum 24 hours |
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

## Setup checklist

- [ ] Warehouse connected in production and QA
- [ ] Flag created with a key on every variation
- [ ] Metrics created, names matching [`../METRICS.md`](../METRICS.md) exactly
- [ ] Experiment created in QA and verified: exposures and every event arrive
- [ ] Experiment created in production, start time recorded above
- [ ] Store frozen

## Run log

Snapshots every ~6 hours: identities per version, primary metric per version, chance to beat control, sample ratio warning (yes or no), excluded identities, notes.

| Time (IST) | Rail ids | Grid ids | Rail rate | Grid rate | Chance grid wins | SRM | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Results

To be written when the experiment ends: lift, 95% credible interval, chance to beat control for every metric, the frequentist cross-check, and what we did.

## Decision

To be written.
