---
name: flagsmith-experiment
description: >-
  Run, change or read the Flagsmith A/B tests for STILLFORM on the Toggle Wars
  hackathon Track 1. Use when the user mentions Flagsmith, an experiment, a
  feature flag, a metric, the event log, the /live page, or rolling out a
  winner.
---

# Flagsmith experiment

Track 1 is judged on one experiment done well. Experiments run one at a time: the next starts only after the previous one has ended and its decision is recorded. The plan is `docs/HACKATHON-PLAN.md`, the rules are `docs/experiments/README.md`, events are `docs/METRICS.md`, and decisions are `docs/DECISIONS.md`. Update those files, the experiment file and `CHANGELOG.md` with every change.

## EXP-001, already decided

The full pre-registration is `docs/experiments/EXP-001-homepage-merchandising.md`. Do not change it after launch.

- Flag: `homepage_merchandising`, multivariate. The flag's own value is the reserved control `rail` (today's `RailHero`). The variation key is `grid`: the same rail pieces, same order, as a static grid.
- Primary metric: event `product_viewed`, aggregation `occurrence`, expected direction `increase`. Expected direction is the way that counts as good, never the way we predict the treatment moves. Add-to-bag is too rare for our traffic to decide the test, so `piece_added`, `checkout_started` and `order_placed` are secondary.
- Split: 100% of homepage visitors, even split. Do not change it after the experiment starts.
- Identity: one id in `localStorage`, shared by the flag read and every event. The homepage reads the flag with `useExperimentValue` from `src/analytics/flagsmith.ts`, which calls `getExperimentFlag` (it records an exposure only for enrolled identities) and shows a neutral placeholder for at most 2.5 seconds. On timeout the visitor gets the rail with no exposure. Read flags anywhere else with `getValue(name, { skipAnalytics: true })`.
- SDK: `@flagsmith/flagsmith` 12.6, `enableEvents: true`, flushed every second and on `pagehide`. Client environment key in `VITE_FLAGSMITH_ENVIRONMENT_KEY`. The showroom build reads no `.env` files, so that key is passed into its `define` from the build environment.
- Events: always send through `track()` in `src/analytics/track.ts`, which feeds Flagsmith and our event log together. Names must match `docs/METRICS.md` exactly.
- `?internal=1` marks a browser as internal: it never contacts Flagsmith and sends no events. Use it on every browser of ours that opens the production site. `?preview=grid` shows a version without enrolling.
- Ids: project 56697. QA `S7XdcYEJmwHsrATg4CWvgT` (experiment 789, running for verification). Production `EtSGzCGxfgVyDbvNSTp8vR` (experiment 790, running since 04:22 IST, 27 Nov 2026). Feature 306276. Creating an experiment publishes its 50/50 rollout before it starts, and assignments are redrawn at the start, so never send public traffic to an environment whose experiment is created but not started.
- Winner: chance to beat control above 95% and a 95% credible interval that does not cross zero. Below 5%, the rail is confirmed. Otherwise leave the rail and say the result is inconclusive.
- Stopping rule: minimum 24 hours, then the first 6-hourly snapshot that is decisive, with a hard stop at Saturday 28 November, 22:00 IST.
- The scorecard stays blank until each side has 50 identities and 5 conversions. A sample-ratio warning means the numbers are not a result.
- Test in the QA environment. Production results take only real visits.

## The CLI, and creating a new experiment

Use the Flagsmith CLI v2, not the Flagsmith MCP server. The MCP server cannot start an experiment. From this repo, `npm run flagsmith -- --version` runs the binary in `~/.local/bin`. Windows Defender blocks the official release zip (`Trojan:Win32/Bearfoos.A!ml` on that unsigned build), so this machine uses a source build of tag v2.0.0, which Go installs as `flagsmith-cli.exe`. The npm script accepts that name or `flagsmith.exe`.

1. If the command fails, with Go 1.24 or newer run `go install github.com/Flagsmith/flagsmith-cli/v2@v2.0.0` with `GOBIN` set to `%USERPROFILE%\.local\bin`. Do not download the release zip, and do not pipe a remote install script into a shell.
2. `npm run flagsmith -- login` for Flagsmith Cloud. Add `--no-browser` to print the URL instead of opening a browser. Never print or commit the admin key. `flagsmith.env` is gitignored.
3. `npm run flagsmith -- init` writes `flagsmith.json`, which is safe to commit.
4. Confirm the environment has a warehouse. If it does not, stop and point at the warehouse docs. Events are dropped without one.
5. Create the multivariate flag with a key on every variation, then the metrics, then the experiment. Follow https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent and https://docs.flagsmith.com/experimentation/run-an-experiment. `npm run flagsmith -- api <path>` calls any endpoint; for example `api/v1/environments/<key>/experiments/` and `api/v1/environments/<key>/experiment-metrics/`. With feature versioning on, flag changes go through `api/v1/environments/<numeric id>/features/<id>/versions/`.
6. Start the experiment only after the deployed store records exposures and the primary event in QA.
7. Traffic has to be real visits to the deployed site, both versions, before Sunday. Scripted sessions are allowed only in a separate environment and only if the write-up says they were scripted. Do not post conversion events by hand.

## Reading the result

Flagsmith is Bayesian. Peeking is safe, but stop only by the pre-registered rule. The event log (`supabase/events/001_event_log.sql`, read through `GET /api/stats` and shown on `/live`) has the same events with country, city, source and variant, for the store-wide funnel and the cross-check. Report lift, the credible interval, and the chance the grid beats the rail for every metric, then the frequentist cross-check in `analysis/`. Roll the winner out by ending the experiment and setting that value on the same flag. Record the result and decision in the experiment file before choosing the next experiment from `docs/experiments/BACKLOG.md`.
