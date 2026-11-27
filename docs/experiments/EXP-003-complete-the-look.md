# EXP-003: Complete the look

**Status:** running in production (experiment 855, started 05:32 IST, Friday 27 November 2026). QA experiment 847 is also running.

## Pre-registration

| Field | Value |
| --- | --- |
| Hypothesis | For people on a product page during the run, hiding Complete the look will lower the number of pieces they open. The block is removed only if `hidden` wins on the count with the interval clear of zero. We expect it to lose. |
| Flag | `complete_the_look` (306345). Control `shown`. Variation `hidden` (option 37575) |
| Exposure | `getExperimentFlag` on the product page of a piece that has companions. Every current piece does |
| What changes | `hidden` removes the companion block. The piece, the size control and the associate stay |
| Primary metric | `product_viewed` count, direction `increase` |
| Guardrails | `piece_added`, `engaged_visit` and `order_placed` sum should not decrease |
| Population | Product-page visitors |
| Split | 100% of that population, 50/50 |
| Decision rule | Ship `hidden` only above 95% with the credible interval clear of zero. Otherwise the block stays |
| Run window | Started 05:32 IST, Friday 27 November 2026 (2026-11-27T00:02:04Z). Read at Sunday 14:00 IST |

`pairing_clicked` stays a check that `hidden` rendered. It is zero on that side because the button is absent, so it is not a result.

Review without enrolling: `?internal=1&preview.complete_the_look=hidden`.

## Flagsmith

| | QA | Production |
| --- | --- | --- |
| Experiment | 847, running | 855, running since 05:32 IST |
| Products viewed per visitor | 832 | 839 |
| Add-to-bag guardrail | 827 | 834 |
| Engaged visit | 831 | 838 |
| Revenue per visitor | 830 | 837 |
