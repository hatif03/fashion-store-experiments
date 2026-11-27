# Metrics and events

Every event goes to two places from one call, `track()` in [`src/analytics/track.ts`](../src/analytics/track.ts):

1. **Flagsmith**, with `trackEvent`, under the same visitor id used for flags. Flagsmith counts an event toward an experiment only after that visitor's first exposure, and only if the name matches the metric's event name exactly (case-sensitive). This is where experiment results are read.
2. **Our event log**, through `POST /api/track` into a Supabase table. This feeds the store-wide funnel and the live page at `/live`, which Flagsmith can't show outside an experiment. The function adds the visitor's country and city from Vercel's request headers, with the coordinates rounded to one decimal place (about 10 km). It never reads or stores the IP address. Headless browsers and scripts are dropped by user agent.

Visits marked internal with `?internal=1` (cleared with `?internal=0`) send nothing to either, and never contact Flagsmith. We use this on our own browsers.

## Identity

- Visitor id: a random id in `localStorage`, created on the first visit. No personal data.
- Visit id: a random id in `sessionStorage`, with the landing page, referrer host, UTM tags and device of that visit.
- Traits set on identify, and copied onto every Flagsmith event: `utm_source` (falls back to the referrer's host, then `direct`), `utm_medium`, `utm_campaign`, `landing_path`, `device` (`mobile`, `tablet` or `desktop`), `language` and `timezone`. These do not change who sees which version. Flagsmith's scorecard cannot filter by them; the live page can, for source and device.
- Every Flagsmith event also carries metadata: the page, the product when there is one, and `flag_<name>` for each experiment the visitor has already been exposed to.

## Events

`value` is a number in US dollars (for example `85` for $85.00), because Flagsmith's sum and mean metrics read it directly.

| Event | Fires when | `value` | Metadata |
| --- | --- | --- | --- |
| `page_viewed` | The route changes | — | `page` |
| `product_viewed` | A product page mounts, or a piece is taken down from the rail. Once per product per visit | Price | `product_id`, `source` (`rail`, `grid`, `collection`, `shop`, `pairing`, `associate`, `direct`) |
| `piece_added` | A piece is added to the bag | Price | `product_id`, `source` (`rail_detail`, `product_page`, `associate`, `buy_bar`) |
| `bag_opened` | The bag drawer opens | Bag subtotal | — |
| `checkout_started` | The checkout page opens with items in the bag | Bag subtotal | `items` |
| `checkout_step_completed` | A checkout step is completed | — | `step` (`delivery`, `payment`) |
| `order_placed` | A demo order is placed | Order total | `items` |
| `associate_opened` | The associate panel opens | — | `page` |
| `associate_message_sent` | The visitor sends the associate a message | — | `page` |
| `engaged_visit` | The second page view, or 30 seconds with the page visible, whichever comes first. Once per visit | — | — |
| `shop_filtered` | A category filter is chosen on the shop page | — | `category` |
| `shop_sorted` | A sort order is chosen on the shop page | — | `sort` |
| `size_guide_opened` | The size guide opens | — | `product_id` |
| `pairing_clicked` | A "Complete the look" piece is opened | — | `product_id` |

Exposures are recorded by the SDK when the homepage calls `getExperimentFlag("homepage_merchandising")`, and only for identities enrolled in a running experiment. The exposure event's value is the variant key (`control` or `grid`). Our code never sends an exposure itself. The SDK doesn't flush its queue when a tab closes, so the store flushes on `pagehide` and every second.

## Flagsmith metrics

The same seven metrics exist in QA and production. Production ids:

| Id | Name | Event | Aggregation | Expected direction |
| --- | --- | --- | --- | --- |
| 833 | Product view rate | `product_viewed` | occurrence | increase |
| 834 | Add-to-bag rate | `piece_added` | occurrence | increase |
| 835 | Checkout start rate | `checkout_started` | occurrence | increase |
| 836 | Conversion rate | `order_placed` | occurrence | increase |
| 837 | Revenue per visitor | `order_placed` | sum | increase |
| 838 | Engaged visit rate | `engaged_visit` | occurrence | not decrease |
| 839 | Products viewed per visitor | `product_viewed` | count | increase |
| 897 | Associate reply rate | `associate_message_sent` | occurrence | increase |

Six more metrics are informational: their own direction is `informational`, so a lift on them stays neutral and they are not the primary metric. Flagsmith's attach field has no informational choice, so they are attached as `increase` only to put them on the scorecard. Do not ship from them. `pairing_clicked` is zero on the hidden side of EXP-003 because the button is absent, and the greeting does not fire `associate_opened`.

| Id | Name | Event |
| --- | --- | --- |
| 1212 | Bag open rate | `bag_opened` |
| 1213 | Size guide rate | `size_guide_opened` |
| 1214 | Checkout step rate | `checkout_step_completed` |
| 1215 | Shop filter rate | `shop_filtered` |
| 1216 | Pairing click rate | `pairing_clicked` |
| 1217 | Associate open rate | `associate_opened` |

QA ids are 1205 to 1210 in the same order. QA ids for the original seven are 826 to 832. The associate reply metric is 891 in QA.

## KPIs

| KPI | Built from | Where it is read |
| --- | --- | --- |
| Product view rate | `product_viewed` occurrence | Flagsmith metric |
| Products viewed per visitor | `product_viewed` count | Flagsmith metric |
| Add-to-bag rate | `piece_added` occurrence | Flagsmith metric |
| Checkout rate | `checkout_started` occurrence | Flagsmith metric |
| Conversion rate | `order_placed` occurrence | Flagsmith metric |
| Revenue per visitor | `order_placed` sum of `value` | Flagsmith metric |
| Average order value | `order_placed` mean of `value` | Flagsmith metric |
| Cart abandonment | 1 − (`order_placed` ÷ `checkout_started`) | Computed from the counts |
| Checkout step drop-off | `checkout_step_completed` by `step` | Computed from the counts |
| Engaged visit rate (inverse of bounce) | `engaged_visit` occurrence | Flagsmith metric |
| Associate engagement | `associate_opened`, `associate_message_sent` occurrence | Flagsmith metric |
| Traffic by source, country, city, device | `page_viewed` with visit details | Event log, shown on `/live` |
| Store-wide funnel | Distinct visitors per step | Event log, shown on `/live` |

Demo orders measure purchase intent, not real purchases: nothing is charged, so absolute rates will be higher than in a real store. Comparisons between versions stay fair, because both versions have the same checkout.

## Answered questions

- **Can one experiment carry secondary and guardrail metrics?** Yes. EXP-001 has all seven metrics attached, with one primary.
- **Can we export raw events from the managed warehouse?** We didn't depend on it. Our own event log holds the same events with visit details, so store-wide numbers and the frequentist cross-check come from there.

## The event log

Table `public.events` in the Supabase project `stillform-events`. Row-level security is on with no policies, so nobody can read or write the table directly. Two functions are the only way in, both called from our server functions:

- `record_event(p jsonb)` validates and inserts one event. At most 300 events per visitor per 10 minutes.
- `analytics_summary(p_hours, p_environment)` returns aggregates only: totals, funnel, countries, cities, recent events, sources, devices, the homepage split, the five experiment arms, top products and visitors per hour. No visitor ids leave the database.

Each row records `VERCEL_ENV` (`production`, `preview` or `development`). The live page and the analysis read production only, so local and preview testing never mixes in. The schema is [`supabase/events/001_event_log.sql`](../supabase/events/001_event_log.sql).
