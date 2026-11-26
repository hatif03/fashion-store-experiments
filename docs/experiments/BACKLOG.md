# Experiment backlog

Hypotheses not yet run, ranked by how likely they are to give a clear answer with our traffic (base rate and expected effect size) and how much the answer matters to the store. EXP-002 is picked from here once EXP-001 has ended, in light of its result.

| Rank | Change | Page | Primary metric | Why it matters | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | The studio associate speaks first: a one-line greeting after about 8 seconds, vs today's passive button | Product page | `associate_message_sent` occurrence; guardrail `piece_added` should not decrease | Tests whether an AI sales associate earns its cost when it starts the conversation, as a shop assistant would | Low base rate, but the expected effect is large. The greeting is canned text, so it costs no model call until the visitor replies |
| 2 | The worn photo first in the product gallery, vs the studio cut-out first | Product page | `piece_added` occurrence | Whether context sells the piece better than the clean product shot | Only pieces with a worn photo enter the test |
| 3 | One-step checkout vs three steps | Checkout | `order_placed` occurrence among checkout starters | Friction vs reassurance at the last step | Needs enough checkout starters; likely too few in one day |
| 4 | "Complete the look" shown vs hidden | Product page | `order_placed` sum of `value` | Cross-sell and order value | Revenue metrics need orders, so power is low |
| 5 | Rail caption "Take it down" vs "Try it on" | Homepage (rail) | `product_viewed` occurrence | Copy on the rail's main action | Small expected effect. Only relevant if the rail wins EXP-001 |
| 6 | A shipping fee with a free-shipping threshold and a progress bar in the bag | Bag | `order_placed` sum of `value` | Order value | Shipping is included in every price today, so this first needs a pricing decision |
