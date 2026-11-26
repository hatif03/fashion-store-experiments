import { recordEvent, type Headers } from "../src/events/handle";

interface ServerResponse {
  status(code: number): { json(body: unknown): void; end(): void };
}

/** Vercel Node function: one anonymous store event into the event log. */
export default async function handler(req: { method?: string; body?: unknown; headers: Headers }, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST only" });
    return;
  }
  try {
    res.status(await recordEvent(req.body, req.headers)).end();
  } catch {
    res.status(503).end();
  }
}
