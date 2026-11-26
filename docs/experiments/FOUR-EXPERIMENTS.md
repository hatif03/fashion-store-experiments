# Four experiments

A plan only. Nothing here is built, and nothing here changes [EXP-001](EXP-001-homepage-merchandising.md), which is already running and frozen.

Each experiment is one feature, one flag, one primary metric. Four flags can run at once: Flagsmith allows one active experiment per flag, not one per project. The same visitor id is used everywhere, so a person can be in all four. Assignment is independent. That keeps each comparison fair, and it adds noise, which the power section accounts for.

## How an e-commerce test is scored

Kohavi, Tang and Xu's overall evaluation criterion is the one number that decides a test: measurable during the test, and believed to move the longer-term business. Dmitriev, Frasca, Gupta, Kohavi and Vaz (KDD 2017) split the scorecard into four jobs. Deng and Shi (KDD 2016) add two tests for the deciding number: it has to move in the direction of real value, and it has to move enough to see.

| Job | On this store | Event |
| --- | --- | --- |
| Data quality | The split matches 50/50, and the same person does not see both versions of one flag | Flagsmith exposures, sample-ratio warning, excluded identities |
| Deciding metric | One per experiment, named below | One event, one aggregation |
| Guardrail | Must not get worse, or the winner is not shipped | `engaged_visit`, `order_placed` sum |
| Diagnostic | Explains the deciding metric. Never ships a winner by itself | The other events |

The store's funnel, in order:

1. Visit (`page_viewed`, event log only)
2. Engaged visit (second page, or 30 seconds visible)
3. Product opened (`product_viewed`, once per product per visit)
4. Added to bag (`piece_added`)
5. Bag opened
6. Checkout started
7. Delivery step, then payment step
8. Demo order (`order_placed`, `value` in dollars)

For a real shop the deciding number is usually revenue per visitor, because conversion rate ignores basket size and average order value ignores people who bought nothing. Revenue per visitor is the wrong deciding number here. A demo order is intent, not a charge, and one coat at $300 swings a sum. Flagsmith also warns that a retried event can land twice, which inflates count, sum and mean. Occurrence (did this person do it at least once) is the aggregation to decide on. Sum of `order_placed` stays on every experiment as a guardrail.

Two further rules, both from the way Flagsmith scores:

- An event counts only after that person's first exposure to that experiment. The exposure is recorded where the feature is actually on screen, with `getExperimentFlag`. Anyone who never reaches that screen is not in the test.
- A metric shows no result until every version has 50 identities and, for an occurrence metric, 5 people who did the thing. A deciding metric whose control rate is near zero never appears. The control has to be able to fire it.

A metric the treatment itself fires is not a result. Hiding "Complete the look" makes `pairing_clicked` zero on that side because the control is the only side with the button. Opening the associate for someone makes `associate_opened` one on that side because the treatment did it. Neither number is a behaviour we learned.

Smallest absolute gap we can hope to see, at about 95% confidence and 80% power, 50/50 split: 2.8 × √(2p(1 − p) / n), for control rate p and n people per version.

| Control rate | 50 people / version | 100 / version | 200 / version | Control events at 100 |
| --- | --- | --- | --- | --- |
| 8% | 15 pp (needs a near-doubling, and 50 people yields only 4 control events, under Flagsmith's floor of 5) | 11 pp | 8 pp | 8 |
| 15% | 20 pp | 14 pp | 10 pp | 15 |
| 40% | 27 pp | 19 pp | 14 pp | 40 |

Planning assumption, not a forecast: a few hundred homepage visitors by Sunday 14:00 IST if the posts in [`../TRAFFIC.md`](../TRAFFIC.md) work. Product-page tests only enroll people who open a product, so their sample is smaller than EXP-001's, and it depends on how good the homepage is at that job.

## Shared rules

- Multivariate flag. The flag's own value is the control, which is today's behaviour. One variation key.
- 100% of people who reach the feature, split 50/50. Not changed after start.
- Expected direction `increase` means more of the deciding event is better. The hypothesis says which version we think will do that.
- Ship the variation only above 95% chance to beat control, with the 95% credible interval clear of zero. Below 5%, the control is confirmed. In between, inconclusive, and today's behaviour stays.
- Guardrails on every experiment: `engaged_visit` should not decrease, `order_placed` sum should not decrease. A winner that fails a guardrail is not shipped.
- Our browsers stay on `?internal=1`. Reviewers use `?preview=<value>` with that flag.
- QA first. Production experiments are created only when the code is already deployed, then started. Creating one publishes its split before the start.
- Read them at the hard stop, Sunday 14:00 IST, ahead of the write-up. EXP-001 keeps its own earlier stopping rule. No early ship on a friendly snapshot.
- Each result is cross-checked with a frequentist interval on the same counts.

## EXP-001. Homepage merchandising

Already running since 04:22 IST, Friday 27 November. Full pre-registration: [EXP-001-homepage-merchandising.md](EXP-001-homepage-merchandising.md).

| | |
| --- | --- |
| Feature | The homepage hero only. The heading, the piece count and everything below it stay put |
| Flag | `homepage_merchandising`. Control `rail`. Variation `grid` |
| Exposed | Homepage visitors |
| Deciding metric | `product_viewed` occurrence. The hero's job is to get a piece opened. Both versions can do it |
| Why not revenue | Orders are too rare, and too heavy-tailed, to decide a homepage test this weekend |

The other three must not change this hero. Their code can ship while EXP-001 is running only if the homepage path is untouched, and only before public posts go out. A deploy after strangers have arrived is a change in the middle of EXP-001.

## EXP-002. A suggested size

| | |
| --- | --- |
| Feature | The size control on the purchase panel. Gallery, copy, price and the associate stay put |
| Flag | `size_suggestion`. Control `choose` (today: nothing selected, adding without a size is refused). Variation `suggested` |
| Variation | The middle in-stock size starts selected, labelled as a suggestion. The visitor can change it. The same rule for every piece, not a personalised guess |
| Exposed | The product page, when the purchase panel is on screen. A homepage visitor who never opens a product is not enrolled |
| Deciding metric | `piece_added` occurrence, direction `increase` |
| Driver | `checkout_started` occurrence |
| Guardrail, this feature | `checkout_started` should not decrease. A bad default size can raise adds and then die at checkout |
| Hypothesis | For people who reach a product page during the run, starting with a suggested in-stock size will raise the share who add the piece by at least 10 percentage points |
| Why this metric | Apparel tests fail at the size step more often than at the photograph. The add is the visitor's own act. The treatment makes it easier and does not perform it |
| Why this can be read | At a 15% control add rate, 100 product viewers per version is enough for Flagsmith to show the metric (about 15 control adds) and enough to see a 14 point gap. A 3 point gap will not show, and the write-up will say so |
| Effect on EXP-001 | `product_viewed` happens before the size control, so EXP-001's deciding metric is untouched. EXP-001's add-to-bag secondary gets noisier. It stays descriptive while EXP-002 is running |

## EXP-003. Complete the look

| | |
| --- | --- |
| Feature | The companion block on the product page. The piece itself, the size control and the associate stay put |
| Flag | `complete_the_look`. Control `shown` (today). Variation `hidden` |
| Exposed | The product page of a piece that has companions. Every current piece does |
| Deciding metric | `product_viewed` count, direction `increase`. Pieces looked at per exposed visitor |
| Driver | `pairing_clicked` occurrence, descriptive. It will be zero on `hidden` because the button is absent. That is a check that the variation rendered, not a result |
| Guardrail, this feature | `piece_added` should not decrease. The block can pull attention off the piece in hand |
| Hypothesis | For people on a product page during the run, hiding Complete the look will lower the number of pieces they open. We remove the block only if `hidden` still wins on the count, with the interval clear of zero. We expect it to lose |
| Why count, not occurrence | Everyone enrolled has already opened a product, so occurrence sits near 100% on both sides and cannot move. Count can |
| Why this can be read | A lift from about 1.2 pieces to 1.6 is large enough to see near 100 people per version. A lift of 0.1 will not. The hypothesis is the large one |
| Effect on the others | Same page as EXP-002, different flag, different deciding metric. Each contrast stays valid. The write-up names both assignments when it talks about the product page. It does not change the homepage hero |

## EXP-004. The associate speaks first

| | |
| --- | --- |
| Feature | Whether the associate starts. The model, the prompt and the catalogue stay put |
| Flag | `associate_greeting`. Control `silent` (today's button, panel closed). Variation `speaks` |
| Variation | On a product page, after 8 seconds, the panel opens with one canned line and one question. No model call until the visitor writes back. Both versions wait 8 seconds before anyone is enrolled, so the test is the greeting, not the wait |
| Exposed | Product page only, and only at 8 seconds. The homepage is out, so the greeting cannot sit on top of the rail. Anyone who leaves before 8 seconds is not enrolled |
| Deciding metric | `associate_message_sent` occurrence, direction `increase` |
| Guardrail, this feature | `piece_added` should not decrease. A panel over the purchase controls can cost a sale. The panel keeps clear of "Choose a size", which is already how the phone layout works |
| Hypothesis | For people who stay 8 seconds on a product page, a canned greeting will at least double the share who send a message |
| The floor | Message rate on the silent side may be under 5%, so 100 people can produce fewer than 5 control messages and Flagsmith will show nothing. That absence is part of the pre-registration. We then report the rate from the event log, with an interval, and we do not call a winner from the log unless both sides have at least 5 messages and the interval is clear of zero |
| Why not `associate_opened` | The variation opens the panel itself. That event would crown the variation by construction |
| Effect on the others | No homepage change. On the product page it can distract from the size control and the companion block, which is what the add-to-bag guardrail is there to catch |

## What was left out

| Idea | Why it is not one of the four |
| --- | --- |
| One-step checkout, or a shipping threshold | Checkout starters on a weekend will not reach 50 per version. A deciding metric that cannot appear is not a test |
| Shop sort, or the rail caption "Try it on" | The likely effect is a few points. The table above says a few points are invisible at this sample |
| Worn photograph first | Many colourways have no worn photograph, so the enrolled population would be a subset that is easy to misread |
| Revenue per visitor as the deciding metric | Right for a real shop. Too heavy-tailed on demo orders, and sum metrics can double-count a retried event |

## Order of work, when building starts

1. Copy EXP-002, EXP-003 and EXP-004 from this page into their own pre-registration files. Those files freeze at start, as EXP-001 did.
2. Build the three flags. Exposure only at the feature, as the tables say.
3. Prove in QA that each exposure and each deciding event arrives, and that the homepage hero is unchanged for both EXP-001 versions.
4. Deploy, create the three production experiments, start them, and only then post the public links.
5. Freeze again. Bug fixes only, logged with a time in the experiment file.
