import { handleAssociate } from "../src/associate/handle";

export const config = { maxDuration: 60 };

interface ServerResponse {
  statusCode?: number;
  status(code: number): { json(body: unknown): void };
  setHeader(name: string, value: string): void;
  write(chunk: string): void;
  end(): void;
}

/** Vercel Node function. The SPA rewrite does not apply to /api. */
export default async function handler(req: { method?: string; body?: unknown }, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST only" });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  try {
    await handleAssociate(req.body, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  } catch {
    res.write(`data: ${JSON.stringify({ type: "error", message: "The studio associate is unavailable." })}\n\n`);
  }
  res.end();
}
