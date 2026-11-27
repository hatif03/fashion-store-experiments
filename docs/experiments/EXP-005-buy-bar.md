# EXP-005: The phone buy bar adds

**Status:** running in production (experiment 857, started 05:32 IST, Friday 27 November 2026). QA experiment 849 is also running.

## Pre-registration

| Field | Value |
| --- | --- |
| Hypothesis | For people on a phone who have scrolled the purchase panel off the screen, a bar that adds the size they already chose will raise the share who add the piece by at least 10 percentage points. |
| Flag | `buy_bar` (306347). Control `return`. Variation `adds` (option 37577) |
| Exposure | `getExperimentFlag` when the phone bar appears. Desktop is not enrolled. Anyone who never scrolls the panel away is not enrolled |
| What changes | If a size is already selected and in stock, the bar says "Add to bag" and adds it, with `piece_added` source `buy_bar`. With no size, the bar still scrolls back. It never picks a size |
| Primary metric | `piece_added` occurrence, direction `increase` |
| Guardrails | `checkout_started`, `engaged_visit` and `order_placed` sum should not decrease |
| Population | Phone product-page visitors who scroll the panel away. This may stay under 50 per version. Then Flagsmith shows nothing, the event log supplies the rate, and no winner is called |
| Split | 100% of that population, 50/50 |
| Decision rule | Ship `adds` only above 95% with the credible interval clear of zero, and only with 50 people per version. Otherwise the bar keeps scrolling back |
| Run window | Started 05:32 IST, Friday 27 November 2026 (2026-11-27T00:02:07Z). Read at Sunday 14:00 IST |

An add from the panel, before the bar appears, counts for EXP-002 only. An add from the bar counts for EXP-002 and EXP-005.

Review without enrolling: `?internal=1&preview.buy_bar=adds` on a phone.

## Flagsmith

| | QA | Production |
| --- | --- | --- |
| Experiment | 849, running | 857, running since 05:32 IST |
| Add-to-bag metric | 827 | 834 |
| Checkout guardrail | 828 | 835 |
| Engaged visit | 831 | 838 |
| Revenue per visitor | 830 | 837 |

## Bug fixes

**01:45 IST, Saturday 28 November 2026.** The phone bar's "Add to bag" did not change when it was tapped, so a second tap added another copy. It now reads "Added" and ignores another tap for just over a second. One tap is still one piece. The metric is unchanged.
