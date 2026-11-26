# EXP-005: The phone buy bar adds

**Status:** running in QA (experiment 849, since this build). Production is not created until this code is deployed. The reasoning is in [FOUR-EXPERIMENTS.md](FOUR-EXPERIMENTS.md).

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
| Run window | Production start: not yet. Read at Sunday 14:00 IST |

An add from the panel, before the bar appears, counts for EXP-002 only. An add from the bar counts for EXP-002 and EXP-005.

Review without enrolling: `?internal=1&preview.buy_bar=adds` on a phone.

## Flagsmith

| | QA | Production |
| --- | --- | --- |
| Experiment | 849, running | Not created |
| Add-to-bag metric | 827 | 834 |
| Checkout guardrail | 828 | 835 |
| Engaged visit | 831 | 838 |
| Revenue per visitor | 830 | 837 |
