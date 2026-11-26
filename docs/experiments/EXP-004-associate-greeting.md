# EXP-004: The associate speaks first

**Status:** running in QA (experiment 848, since this build). Production is not created until this code is deployed. The reasoning is in [FOUR-EXPERIMENTS.md](FOUR-EXPERIMENTS.md).

## Pre-registration

| Field | Value |
| --- | --- |
| Hypothesis | For people who stay 8 seconds on a product page, a canned greeting will at least double the share who send a message. |
| Flag | `associate_greeting` (306346). Control `silent`. Variation `speaks` (option 37576) |
| Exposure | `getExperimentFlag` on a product page, after 8 seconds. Both versions wait those 8 seconds before anyone is enrolled. The homepage is not enrolled. Leaving before 8 seconds enrolls nobody |
| What changes | The panel opens with one canned line and one question. No model call until the visitor writes back. Opening the panel does not send `associate_opened` |
| Primary metric | `associate_message_sent` occurrence, direction `increase` (metric 891 in QA) |
| Guardrails | `piece_added`, `engaged_visit` and `order_placed` sum should not decrease |
| The floor | If the silent side sends fewer than 5 messages, Flagsmith shows nothing. The event log then supplies the rate. A winner is called only when both sides have at least 5 messages and the interval is clear of zero |
| Population | Product-page visitors who stay 8 seconds |
| Split | 100% of that population, 50/50 |
| Decision rule | Ship `speaks` only above 95% with the credible interval clear of zero. Otherwise the button stays silent |
| Run window | Production start: not yet. Read at Sunday 14:00 IST |

Review without enrolling: `?internal=1&preview.associate_greeting=speaks`. The preview opens at once, without the 8 second wait.

## Flagsmith

| | QA | Production |
| --- | --- | --- |
| Experiment | 848, running | Not created |
| Associate reply rate | 891 | Created with the production experiment |
| Add-to-bag guardrail | 827 | 834 |
| Engaged visit | 831 | 838 |
| Revenue per visitor | 830 | 837 |
