# EXP-002: A suggested size

**Status:** running in production (experiment 854, started 05:32 IST, Friday 27 November 2026). QA experiment 846 is also running.

## Pre-registration

| Field | Value |
| --- | --- |
| Hypothesis | For people who reach a product page during the run, starting with a suggested in-stock size will raise the share who add the piece by at least 10 percentage points. |
| Flag | `size_suggestion` (306344). Control `choose`. Variation `suggested` (option 37574) |
| Exposure | `getExperimentFlag` on the product page, when the purchase panel is on screen. The rail's detail panel does not enroll anyone |
| What changes | The middle in-stock size starts selected, labelled "suggested". The visitor can change it. The same rule for every piece |
| Primary metric | `piece_added` occurrence, direction `increase` |
| Guardrails | `checkout_started`, `engaged_visit` and `order_placed` sum should not decrease |
| Population | Product-page visitors. Homepage visitors who never open a product are not enrolled |
| Split | 100% of that population, 50/50 |
| Decision rule | Ship `suggested` only above 95% with the credible interval clear of zero. Below 5%, `choose` is confirmed. Otherwise today's behaviour stays |
| Run window | Started 05:32 IST, Friday 27 November 2026 (2026-11-27T00:02:02Z). Read at Sunday 14:00 IST |

Review without enrolling: `?internal=1&preview.size_suggestion=suggested` or `preview.size_suggestion=choose`.

## Flagsmith

| | QA | Production |
| --- | --- | --- |
| Experiment | 846, running | 854, running since 05:32 IST |
| Add-to-bag metric | 827 | 834 |
| Checkout guardrail | 828 | 835 |
| Engaged visit | 831 | 838 |
| Revenue per visitor | 830 | 837 |
