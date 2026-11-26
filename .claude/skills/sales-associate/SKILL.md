---
name: sales-associate
description: >-
  Change the STILLFORM studio sales associate, its IFM K2 Horizon calls, the
  /api/chat endpoint, or the Ask the studio panel. Use when the user mentions
  the associate, the chat, K2 Horizon, or IFM.
---

# Studio associate

Adapted from the Luxe sales chat: classify the message, answer from the catalogue, then attach the pieces and bag actions the reply named. Luxe used Groq, Pinecone, Mongo, and Redis. This store does not.

## Behaviour

- Greetings and shipping or returns questions are answered from `src/catalog/local` with no model call.
- Product questions go to `IFM/K2-Horizon-375B-A23B` at `https://api.ifm.ai/v1/chat/completions`. Sampling is temperature `1` and `top_p` `0.95`, with `chat_template_kwargs.reasoning_effort` set to `high`.
- The whole 20-piece collection is in the prompt. Do not add a vector database.
- The browser sends the last few turns. The server stores nothing. Do not replay `reasoning_content` to the browser or into later turns. Prior turns are pasted into the latest user message as a transcript, which avoids the K2 requirement to replay a reasoning trace.
- Only content tokens are streamed. Reasoning stays on the server.
- Piece ids, colourways, and bag SKUs from the model are checked against the catalogue. A sold-out size is not added. Invented ids are dropped.
- The panel lives in `src/components/SalesAssociate.tsx` and is mounted from `src/app/Layout.tsx`, so the dashboard does not show it.

## Files

- `src/associate/knowledge.ts` — intent, catalogue brief, selection checks
- `src/associate/ifm.ts` — the HTTP client
- `src/associate/handle.ts` — one request
- `api/chat.ts` — the Vercel function
- `vite.config.ts` — the same handler on `npm run dev`

## Environment

`IFM_API_KEY` in `.env.local` for dev, and as a server environment variable on the host. Optional `IFM_BASE_URL` and `IFM_MODEL`. Never put the key in the client.

## When you change it

Keep answers in the house voice: short, specific, no markdown. Run `npm test -- src/associate/knowledge.test.ts`. A missing key must leave the store usable and return "The studio associate is not configured."
