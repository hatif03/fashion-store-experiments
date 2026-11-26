# Decision log

Newest first. Each entry says what was decided, why, and what it rules out.

## 2026-11-27

**D-016. Four experiments, one feature each.** D-001's one-at-a-time rule is retired. Flagsmith allows one running experiment per flag, so four flags can run together. The set, the deciding metric for each, and the ones we refused are in [`experiments/FOUR-EXPERIMENTS.md`](experiments/FOUR-EXPERIMENTS.md). EXP-001 stays as registered. The other three are not built yet. They ship once, before public posts, and they do not change the homepage hero.

**D-015. EXP-001 started at 04:22 IST on Friday 27 November, ahead of the 19:00 target.** The showroom was deployed and a real visit had already arrived in the event log with a city, so waiting until evening would only have shortened the run. The hypothesis, split, metrics, decision rule and stopping rule are unchanged. The hard stop stays 22:00 IST on Saturday 28 November. The browser that opened the site before the start is excluded; see the experiment file.

**D-014. A hidden live page shows the real event data.** `/live`, linked from the © line in the footer, shows visitors, countries, cities on an animated world map, the funnel, the rail-vs-grid split, a live feed and traffic sources. It polls every 15 seconds and shows production data only. It gives judges and visitors a way to see the data is real without a Flagsmith login. It isn't linked from the navigation, so it doesn't pull homepage visitors away mid-experiment.

**D-013. We keep our own event log next to Flagsmith.** Flagsmith reads events only for exposed identities inside an experiment, and has no map or store-wide funnel. Each event also goes to a Supabase table through `/api/track`, with country and city from Vercel's headers. Coordinates are rounded to about 10 km, the IP address is never read, and the table can only be reached through two functions, one that inserts and one that returns aggregates. Flagsmith stays the source of truth for the experiment result; the log supports the cross-check and the live page. A free Supabase project was created for it.

**D-012. Our own browsers are excluded with `?internal=1`.** An internal browser never contacts Flagsmith and sends nothing to the event log, so our clicks can't reach production results. `?internal=0` clears it. Headless browsers and scripts are also dropped by the event log.

**D-011. The homepage waits at most 2.5 seconds for its version.** A neutral placeholder shows until flags arrive. On timeout the visitor sees the rail with no exposure recorded, and stays on the rail for the visit. Showing the rail and then switching would flash a version the visitor wasn't assigned to, and recording an exposure for a version they never saw would bias the result.

**D-010. Exposure goes through `getExperimentFlag`, called only on the homepage.** It records an exposure only for identities enrolled in a running experiment, so visitors who never see the homepage are not counted. Flag values elsewhere are read with analytics off. Flagsmith's docs also describe a React `useExperiment` hook; calling the SDK directly keeps the timeout and preview logic in one place.

**D-009. Every product view counts once per product per visit.** Re-opening the same piece in a visit doesn't inflate `product_viewed`, so its count metric measures how many different pieces a visitor looked at.

**D-008. Traffic comes from real posts with UTM links to the homepage.** Channels and timing are in [`HACKATHON-PLAN.md`](HACKATHON-PLAN.md#traffic). Scripted traffic is a disclosed backup that runs only in its own Flagsmith environment, so production results stay real.

**D-007. QA runs in a separate Flagsmith environment.** Experiments are scoped to an environment, so our test clicks cannot reach production results.

**D-006. The store is frozen while an experiment runs.** Only bug fixes ship, each logged with a timestamp in the experiment file. Features and catalogue land before launch.

**D-005. The catalogue grows by about 12 pieces and 4 colourways, including womenswear.** Images are AI-generated with our own cut-outs as references, front view only, tagged `origin: "generated"`. Stock sites gave inconsistent images or unclear licences, and fashion datasets are non-commercial. A wider range and price ladder gives more varied visitors more to engage with.

**D-004. The showroom gets a demo checkout: no payment, no personal details.** Strangers would not place real cash-on-delivery orders with a demo store, and a real checkout means collecting names and addresses. A no-cost checkout lets visitors go through the whole funnel, which gives checkout, step drop-off, conversion and order-value metrics. The cost: demo orders measure intent, and the write-up says so.

**D-003. A metric's expected direction is the way that counts as good.** The earlier plan set `piece_added` to `decrease`, which would have made Flagsmith report a grid that lost add-to-bags as winning. All goal metrics here are `increase`; the hypothesis says which version we expect to win.

**D-002. EXP-001 stays rail vs grid, with `product_viewed` as the primary metric.** With a few hundred visitors per version, add-to-bag (about 10% of visitors) can only reveal changes of 40–70%. Opening a product (about 30–50%) can reveal 15–28%. Add-to-bag, checkout and orders become secondary metrics. The 10% threshold in the earlier plan is dropped as undetectable.

**D-001. Track 1, one experiment at a time.** The next experiment starts only after the previous one has ended and its decision is recorded. EXP-001 gets a stopping rule (minimum 24 hours, hard stop Saturday 22:00 IST) so a second experiment fits before Sunday.
