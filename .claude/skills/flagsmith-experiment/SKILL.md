---
name: flagsmith-experiment
description: >-
  Plan or implement the Flagsmith A/B test for STILLFORM on the Toggle Wars
  hackathon Track 1. Use when the user mentions Flagsmith, an experiment, a
  feature flag, a metric, or rolling out a winner. Do not start this work
  unless they asked to add Flagsmith.
---

# Flagsmith experiment

Track 1 is one experiment. The store and the studio associate already exist. Flagsmith is not in the app yet.

## The test, already decided

Hypothesis: replacing the homepage rail with a static grid will reduce the share of visitors who add a piece at least once, by at least 10%, by the end of Sunday 29 November 2026.

- Flag: `homepage_merchandising`, multivariate. The flag's own value is the reserved control `rail` (today's `RailHero`). The variation key is `grid`.
- Metric: event `piece_added`, aggregation `occurrence`, expected direction `decrease`. Send it on the first add in `src/components/PurchasePanel.tsx`, and when the associate adds a piece. That is early in the visit. Nothing sends this event yet.
- Split: 100% of visitors, even split. Do not change the split after the experiment starts.
- Identity: one id in `localStorage`, shared by the flag read and the event. Read the flag with `useExperiment` only where the homepage is actually shown.
- SDK: `@flagsmith/flagsmith` `^12.4.0`, `enableEvents: true`. Client environment key in `VITE_FLAGSMITH_ENVIRONMENT_KEY`.
- Winner: chance to beat control above 95% and a 95% credible interval that does not cross zero. Otherwise leave the rail in place and say the result is inconclusive.
- The scorecard stays blank until each side has 50 visitors and 5 adds. A sample-ratio warning means the numbers are not a result.

## How to create it, once asked

Use the Flagsmith CLI v2, not the Flagsmith MCP server. The MCP server cannot start an experiment. From this repo, `npm run flagsmith -- --version` runs the binary at `~/.local/bin` (on Windows, `%USERPROFILE%\.local\bin\flagsmith.exe`). On the machine this repo was prepared on, that binary is v2.0.0. A new terminal will not find `flagsmith` on `PATH` until that directory is added; the npm script does not need that.

1. If `npm run flagsmith -- --version` fails, download `flagsmith_2.0.0_windows_amd64.zip` from the Flagsmith CLI v2 GitHub release and check it against `checksums.txt` before unpacking it into that folder. Do not pipe a remote install script into a shell.
2. `npm run flagsmith -- login` for Flagsmith Cloud. This is interactive and has not been done yet. Never print or commit the admin key. `flagsmith.env` is gitignored.
3. `npm run flagsmith -- init` writes `flagsmith.json`, which is safe to commit.
4. Confirm the environment has a warehouse. If it does not, stop and point at the warehouse docs. Events are dropped without one.
5. Create the multivariate flag with a key on every variation, then the metric, then the experiment in the stopped state. Follow https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent and https://docs.flagsmith.com/experimentation/run-an-experiment for the React calls.
6. Show the code changes and wait for confirmation before editing. Start the experiment only after the store records exposures and `piece_added`.
7. Traffic has to be real visits to the deployed site, both versions, before Sunday. Simulated browser sessions are allowed only if the write-up says they were scripted. Do not post conversion events by hand.

## Reading the result

Flagsmith is Bayesian. Peeking is safe. Report lift, the credible interval, and the chance the grid beats the rail. Roll the winner out by ending the experiment and setting that value on the same flag.
