# STILLFORM

Read this file before editing. Skills with the full procedures live in `.agents/skills/` (also copied to `.cursor/skills/`, `.claude/skills/`, and `.kiro/skills/`). After changing a skill, run `node scripts/sync-agent-skills.mjs`.

## What this is

A luxury fashion store: interactive clothing rail, shop, product pages, bag, checkout when Supabase is configured, and a studio associate on every storefront page. The associate is the sales chat, grounded in the eight-piece collection and answered by IFM K2 Horizon. Flagsmith is not integrated yet. The experiment to run, when asked, is in the `flagsmith-experiment` skill.

## Commands

- `npm run dev` — store and `POST /api/chat`
- `npm test` — unit tests
- `npm run build` — typecheck and production build
- `npm run build:demo` — public showroom, no Supabase and no checkout
- `npm run check:public` — fails if a secret would be committed

## Secrets

`IFM_API_KEY` is server-only. Never prefix it with `VITE_`, never commit `.env.local`, and never print the key. `flagsmith.env` is gitignored. `VITE_` variables are published in the browser bundle.

## Deploy

Vercel, output `dist`. The rewrite in `vercel.json` leaves `/api/` to the function in `api/chat.ts`. Set `IFM_API_KEY` on the host. The showroom build is `npm run build:demo`. Details are in `docs/DEPLOY.md`.

## Agents

- Cursor loads this file and `.cursor/skills/`.
- Claude Code loads `CLAUDE.md`, which points here, and `.claude/skills/`.
- Kiro loads `.kiro/steering/` and `.kiro/skills/`.
- Other agents that follow the Agent Skills spec load `.agents/skills/`.
