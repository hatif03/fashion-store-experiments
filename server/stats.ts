import { readSummary } from "../src/events/handle";

interface ServerResponse {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

/** Vercel Node function: aggregates for the /live page. Cached briefly at the edge. */
export default async function handler(req: { method?: string; query?: Record<string, string | string[]> }, res: ServerResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ message: "GET only" });
    return;
  }
  const hours = Number(Array.isArray(req.query?.hours) ? req.query.hours[0] : req.query?.hours);
  try {
    const summary = await readSummary(Number.isFinite(hours) ? hours : undefined);
    res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
    res.status(200).json(summary);
  } catch {
    res.setHeader("Cache-Control", "no-store");
    res.status(503).json({ message: "The event log is unavailable." });
  }
}
