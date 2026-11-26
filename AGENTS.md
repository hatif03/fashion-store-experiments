# STILLFORM

Read this file before editing. Skills with the full procedures live in `.agents/skills/` (also copied to `.cursor/skills/`, `.claude/skills/`, and `.kiro/skills/`). After changing a skill, run `node scripts/sync-agent-skills.mjs`.

## What this is

A luxury fashion store: interactive clothing rail, shop, product pages, bag, checkout when Supabase is configured, and a studio associate on every storefront page. The associate is the sales chat, grounded in the 20-piece collection and answered by IFM K2 Horizon. Flagsmith serves the homepage experiment (`src/analytics/flagsmith.ts`) and receives every event (`src/analytics/track.ts`). The same events go to our event log through `POST /api/track`, which feeds the hidden live page at `/live`. The experiment process is in the `flagsmith-experiment` skill and `docs/experiments/`.

## Commands

- `npm run dev` — store, `POST /api/chat`, `POST /api/track` and `GET /api/stats`
- `npm test` — unit tests
- `npm run build` — typecheck and production build
- `npm run build:demo` — public showroom: no store database, and a demo checkout that charges nothing and asks for no personal details
- `npm run check:public` — fails if a secret would be committed

## Secrets

`IFM_API_KEY` is server-only. Never prefix it with `VITE_`, never commit `.env.local`, and never print the key. `EVENTS_SUPABASE_URL` and `EVENTS_SUPABASE_KEY` are server-only too. `flagsmith.env` is gitignored. `VITE_` variables are published in the browser bundle; `VITE_FLAGSMITH_ENVIRONMENT_KEY` is a public client key by design.

Never post experiment events by hand or from scripts into the production Flagsmith environment. Mark your own browser with `?internal=1` before using the live site.

## Records

Every change, experiment and decision is written down. The Toggle Wars plan is `docs/HACKATHON-PLAN.md`. Experiments live in `docs/experiments/`, events and KPIs in `docs/METRICS.md`, decisions in `docs/DECISIONS.md`, posts in `docs/TRAFFIC.md`, and store changes in `CHANGELOG.md`. Update the relevant file in the same change.

## Deploy

Vercel, output `dist`. The rewrite in `vercel.json` leaves `/api/` to the functions in `api/`. Set `IFM_API_KEY`, `EVENTS_SUPABASE_URL`, `EVENTS_SUPABASE_KEY` and `VITE_FLAGSMITH_ENVIRONMENT_KEY` on the host. The showroom build is `npm run build:demo`. Details are in `docs/DEPLOY.md`.

## Agents

- Cursor loads this file and `.cursor/skills/`.
- Claude Code loads `CLAUDE.md`, which points here, and `.claude/skills/`.
- Kiro loads `.kiro/steering/` and `.kiro/skills/`.
- Other agents that follow the Agent Skills spec load `.agents/skills/`.
