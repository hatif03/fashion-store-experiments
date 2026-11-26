# Decision log

Newest first. Each entry says what was decided, why, and what it rules out.

## 2026-11-27

**D-008. Traffic comes from real posts with UTM links to the homepage.** Channels and timing are in [`HACKATHON-PLAN.md`](HACKATHON-PLAN.md#traffic). Scripted traffic is a disclosed backup that runs only in its own Flagsmith environment, so production results stay real.

**D-007. QA runs in a separate Flagsmith environment.** Experiments are scoped to an environment, so our test clicks cannot reach production results.

**D-006. The store is frozen while an experiment runs.** Only bug fixes ship, each logged with a timestamp in the experiment file. Features and catalogue land before launch.

**D-005. The catalogue grows by about 12 pieces and 4 colourways, including womenswear.** Images are AI-generated with our own cut-outs as references, front view only, tagged `origin: "generated"`. Stock sites gave inconsistent images or unclear licences, and fashion datasets are non-commercial. A wider range and price ladder gives more varied visitors more to engage with.

**D-004. The showroom gets a demo checkout: no payment, no personal details.** Strangers would not place real cash-on-delivery orders with a demo store, and a real checkout means collecting names and addresses. A no-cost checkout lets visitors go through the whole funnel, which gives checkout, step drop-off, conversion and order-value metrics. The cost: demo orders measure intent, and the write-up says so.

**D-003. A metric's expected direction is the way that counts as good.** The earlier plan set `piece_added` to `decrease`, which would have made Flagsmith report a grid that lost add-to-bags as winning. All goal metrics here are `increase`; the hypothesis says which version we expect to win.

**D-002. EXP-001 stays rail vs grid, with `product_viewed` as the primary metric.** With a few hundred visitors per version, add-to-bag (about 10% of visitors) can only reveal changes of 40–70%. Opening a product (about 30–50%) can reveal 15–28%. Add-to-bag, checkout and orders become secondary metrics. The 10% threshold in the earlier plan is dropped as undetectable.

**D-001. Track 1, one experiment at a time.** The next experiment starts only after the previous one has ended and its decision is recorded. EXP-001 gets a stopping rule (minimum 24 hours, hard stop Saturday 22:00 IST) so a second experiment fits before Sunday.
