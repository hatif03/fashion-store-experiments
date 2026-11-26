---
name: flagsmith-experiment
description: >-
  Plan or implement the Flagsmith A/B test for STILLFORM on the Toggle Wars
  hackathon Track 1. Use when the user mentions Flagsmith, an experiment, a
  feature flag, a metric, or rolling out a winner. Do not start this work
  unless they asked to add Flagsmith.
---

# Flagsmith experiment

Track 1 is judged on one experiment done well. Experiments run one at a time: the next starts only after the previous one has ended and its decision is recorded. The plan is `docs/HACKATHON-PLAN.md`, the rules are `docs/experiments/README.md`, events are `docs/METRICS.md`, and decisions are `docs/DECISIONS.md`. Update those files, the experiment file and `CHANGELOG.md` with every change.

## EXP-001, already decided

The full pre-registration is `docs/experiments/EXP-001-homepage-merchandising.md`. Do not change it after launch.

- Flag: `homepage_merchandising`, multivariate. The flag's own value is the reserved control `rail` (today's `RailHero`). The variation key is `grid`: the same rail pieces, same order, as a static grid.
- Primary metric: event `product_viewed`, aggregation `occurrence`, expected direction `increase`. Expected direction is the way that counts as good, never the way we predict the treatment moves. Add-to-bag is too rare for our traffic to decide the test, so `piece_added`, `checkout_started` and `order_placed` are secondary.
- Split: 100% of homepage visitors, even split. Do not change it after the experiment starts.
- Identity: one id in `localStorage`, shared by the flag read and every event. Read the flag with `useExperiment` only on the homepage, and show a neutral placeholder until flags load so no visitor sees both versions.
- SDK: `@flagsmith/flagsmith` `^12.4.0`, `enableEvents: true`. Client environment key in `VITE_FLAGSMITH_ENVIRONMENT_KEY`. The showroom build reads no `.env` files, so that key has to be passed into its `define` from the build environment.
- Winner: chance to beat control above 95% and a 95% credible interval that does not cross zero. Below 5%, the rail is confirmed. Otherwise leave the rail and say the result is inconclusive.
- Stopping rule: minimum 24 hours, then the first 6-hourly snapshot that is decisive, with a hard stop at Saturday 28 November, 22:00 IST.
- The scorecard stays blank until each side has 50 identities and 5 conversions. A sample-ratio warning means the numbers are not a result.
- Test in the QA environment. Production results take only real visits.

## How to create it, once asked

Use the Flagsmith CLI v2, not the Flagsmith MCP server. The MCP server cannot start an experiment. From this repo, `npm run flagsmith -- --version` runs the binary in `~/.local/bin`. Windows Defender blocks the official release zip (`Trojan:Win32/Bearfoos.A!ml` on that unsigned build), so this machine uses a source build of tag v2.0.0, which Go installs as `flagsmith-cli.exe`. The npm script accepts that name or `flagsmith.exe`.

1. If the command fails, with Go 1.24 or newer run `go install github.com/Flagsmith/flagsmith-cli/v2@v2.0.0` with `GOBIN` set to `%USERPROFILE%\.local\bin`. Do not download the release zip, and do not pipe a remote install script into a shell.
2. `npm run flagsmith -- login` for Flagsmith Cloud. Add `--no-browser` to print the URL instead of opening a browser. Never print or commit the admin key. `flagsmith.env` is gitignored.
3. `npm run flagsmith -- init` writes `flagsmith.json`, which is safe to commit.
4. Confirm the environment has a warehouse. If it does not, stop and point at the warehouse docs. Events are dropped without one.
5. Create the multivariate flag with a key on every variation, then the metric, then the experiment in the stopped state. Follow https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent and https://docs.flagsmith.com/experimentation/run-an-experiment for the React calls.
6. Show the code changes and wait for confirmation before editing. Start the experiment only after the store records exposures and `piece_added`.
7. Traffic has to be real visits to the deployed site, both versions, before Sunday. Scripted sessions are allowed only in a separate environment and only if the write-up says they were scripted. Do not post conversion events by hand.

## Reading the result

Flagsmith is Bayesian. Peeking is safe, but stop only by the pre-registered rule. Report lift, the credible interval, and the chance the grid beats the rail for every metric, then the frequentist cross-check in `analysis/`. Roll the winner out by ending the experiment and setting that value on the same flag. Record the result and decision in the experiment file before choosing the next experiment from `docs/experiments/BACKLOG.md`.
