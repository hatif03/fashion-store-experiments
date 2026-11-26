# Metrics and events

The store sends events to Flagsmith with `trackEvent`, under the same visitor id used for flags. Flagsmith counts an event toward an experiment only after that visitor's first exposure, and only if the name matches the metric's event name exactly (case-sensitive).

## Identity

- Visitor id: a random id in `localStorage`, created on the first visit. No personal data.
- Traits set on identify: `utm_source`, `utm_medium`, `utm_campaign`, `landing_path`, `device` (`mobile` or `desktop`).

## Events

`value` is a number in US dollars (for example `85` for $85.00), because Flagsmith's sum and mean metrics read it directly.

| Event | Fires when | `value` | Metadata |
| --- | --- | --- | --- |
| `product_viewed` | A product page mounts, or a piece is taken down from the rail | Price | `product_id`, `source` (`rail`, `grid`, `shop`, `pairing`, `associate`, `direct`) |
| `piece_added` | A piece is added to the bag | Price | `product_id`, `source` (`rail_detail`, `product_page`, `associate`) |
| `bag_opened` | The bag drawer opens | Bag subtotal | — |
| `checkout_started` | The checkout page opens with items in the bag | Bag subtotal | `items` |
| `checkout_step_completed` | A checkout step is completed | — | `step` (`delivery`, `review`) |
| `order_placed` | A demo order is placed | Order total | `items` |
| `associate_opened` | The associate panel opens | — | `page` |
| `associate_message_sent` | The visitor sends the associate a message | — | `page` |
| `engaged_visit` | The second page view, or 30 seconds with the page visible, whichever comes first. Once per visit | — | — |
| `shop_filtered` | A category filter is chosen on the shop page | — | `category` |
| `shop_sorted` | A sort order is chosen on the shop page | — | `sort` |
| `size_guide_opened` | The size guide opens | — | `product_id` |
| `pairing_clicked` | A "Complete the look" piece is opened | — | `product_id` |

Exposures are recorded by the SDK (`useExperiment`), not by our code.

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
| Traffic by source, page views, pages per visit | Page views and referrers | Vercel Web Analytics |

Demo orders measure purchase intent, not real purchases: nothing is charged, so absolute rates will be higher than in a real store. Comparisons between versions stay fair, because both versions have the same checkout.

## Open questions

- Whether one Flagsmith experiment can carry secondary and guardrail metrics alongside the primary. Check during setup; if not, secondary metrics are read from a second scorecard or computed from counts.
- Whether the managed warehouse lets us export raw events. If not, store-wide funnel numbers outside an experiment need our own event log.
