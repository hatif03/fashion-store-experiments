# Experiments

Every experiment on STILLFORM runs on Flagsmith Experimentation: a multivariate flag holds the versions, the app records exposures and events with one visitor id, and Flagsmith's Bayesian engine reports lift, a 95% credible interval and the chance each version beats control.

## Rules

1. **Five features, five flags.** The set is [FOUR-EXPERIMENTS.md](FOUR-EXPERIMENTS.md). EXP-001 is already running. The other four start together, before public posts, and none of them changes the homepage hero. A flag still has only one experiment at a time.
2. **Pre-register.** Hypothesis, primary metric and direction, secondary metrics, split, run window, stopping rule and decision rule are written here before the experiment starts. They do not change after.
3. **Direction means "good".** In Flagsmith, a metric's expected direction is the way that counts as better. More product views is `increase`. The hypothesis is where we say which version we expect to win.
4. **Decision rule.** A treatment ships only if its chance to beat control is above 95% and its credible interval does not cross zero. Below 5%, control is confirmed. In between is inconclusive, and control stays.
5. **Trust checks first.** No result is read until every version has 50 identities and 5 conversions. A sample ratio mismatch warning means the numbers are not a result; investigate first.
6. **Freeze.** EXP-002, EXP-003, EXP-004 and EXP-005 ship once, before public posts, without changing the homepage hero. After that, only bug fixes, each logged with a timestamp in the experiment file.
7. **QA is separate.** We test in the QA environment. Our own clicks never reach production results.
8. **Real traffic.** Scripted traffic, if ever used, runs in its own environment and is disclosed. Conversion events are never posted by hand.
9. **Roll out on the same flag.** End the experiment, then set the winning value on the flag.
10. **Cross-check.** Each result is re-checked with a frequentist test on the same counts (`analysis/`), following the `AB-Testing-main` reference.

## Index

| Id | Question | Status | Result |
| --- | --- | --- | --- |
| [EXP-001](EXP-001-homepage-merchandising.md) | Does the interactive rail get more visitors into products than a static grid? | Running since 04:22 IST, 27 Nov | — |
| [EXP-002](EXP-002-suggested-size.md) | Does a suggested size get more pieces into the bag? | Running in QA (846) | — |
| [EXP-003](EXP-003-complete-the-look.md) | Does Complete the look get people to open more pieces? | Running in QA (847) | — |
| [EXP-004](EXP-004-associate-greeting.md) | Does the associate starting the conversation get more replies? | Running in QA (848) | — |
| [EXP-005](EXP-005-buy-bar.md) | On a phone, does a buy bar that adds the chosen size get more pieces into the bag? | Running in QA (849) | — |
