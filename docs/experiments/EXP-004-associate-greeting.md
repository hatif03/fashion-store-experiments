# EXP-004: The associate speaks first

**Status:** running in production (experiment 856, started 05:32 IST, Friday 27 November 2026). QA experiment 848 is also running.

## Pre-registration

| Field | Value |
| --- | --- |
| Hypothesis | For people who stay 8 seconds on a product page, a canned greeting will at least double the share who send a message. |
| Flag | `associate_greeting` (306346). Control `silent`. Variation `speaks` (option 37576) |
| Exposure | `getExperimentFlag` on a product page, after 8 seconds. Both versions wait those 8 seconds before anyone is enrolled. The homepage is not enrolled. Leaving before 8 seconds enrolls nobody |
| What changes | The panel opens with one canned line and one question. No model call until the visitor writes back. Opening the panel does not send `associate_opened` |
| Primary metric | `associate_message_sent` occurrence, direction `increase` (metric 897 in production, 891 in QA) |
| Guardrails | `piece_added`, `engaged_visit` and `order_placed` sum should not decrease |
| The floor | If the silent side sends fewer than 5 messages, Flagsmith shows nothing. The event log then supplies the rate. A winner is called only when both sides have at least 5 messages and the interval is clear of zero |
| Population | Product-page visitors who stay 8 seconds |
| Split | 100% of that population, 50/50 |
| Decision rule | Ship `speaks` only above 95% with the credible interval clear of zero. Otherwise the button stays silent |
| Run window | Started 05:32 IST, Friday 27 November 2026 (2026-11-27T00:02:06Z). Read at Sunday 14:00 IST |

Review without enrolling: `?internal=1&preview.associate_greeting=speaks`. The preview opens at once, without the 8 second wait.

## Flagsmith

| | QA | Production |
| --- | --- | --- |
| Experiment | 848, running | 856, running since 05:32 IST |
| Associate reply rate | 891 | 897 |
| Add-to-bag guardrail | 827 | 834 |
| Engaged visit | 831 | 838 |
| Revenue per visitor | 830 | 837 |

## Bug fixes

**01:45 IST, Saturday 28 November 2026.** The speaks variation was opening on every product page, staying open on the way to checkout, and rewriting its question when the visitor moved to another piece while the previous reply stayed on screen. It still opens once, after 8 seconds, with the same canned line, on the first product page where someone stays that long. Closing it, leaving that piece, or reaching checkout keeps it shut for the rest of the visit. The question stays the one that was asked. A reviewer preview still opens on each product. The exposure rule is unchanged: 8 seconds on a product page, and leaving before that enrolls nobody.
