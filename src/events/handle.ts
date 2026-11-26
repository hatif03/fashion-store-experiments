// Server only: imported by api/track.ts, api/stats.ts and the dev server.
// EVENTS_SUPABASE_URL and EVENTS_SUPABASE_KEY are never prefixed with VITE_.

declare const process: { env: Record<string, string | undefined> };

export type Headers = Record<string, string | string[] | undefined>;
export type Environment = "production" | "preview" | "development";

const EVENTS = new Set([
  "page_viewed",
  "engaged_visit",
  "product_viewed",
  "piece_added",
  "bag_opened",
  "checkout_started",
  "checkout_step_completed",
  "order_placed",
  "associate_opened",
  "associate_message_sent",
  "shop_filtered",
  "shop_sorted",
  "size_guide_opened",
  "pairing_clicked",
]);

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|node-fetch/i;

export function currentEnvironment(): Environment {
  const env = process.env.VERCEL_ENV;
  return env === "production" || env === "preview" ? env : "development";
}

function header(headers: Headers, name: string): string {
  const value = headers[name];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function coordinate(value: string, limit: number): number | undefined {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? Math.round(number * 10) / 10 : undefined;
}

function decode(value: string): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value).slice(0, 80);
  } catch {
    return value.slice(0, 80);
  }
}

function metadata(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, entry] of Object.entries(value).slice(0, 12)) {
    if (!/^[a-z_]{1,32}$/.test(key)) continue;
    if (typeof entry === "string") out[key] = entry.slice(0, 80);
    else if (typeof entry === "number" && Number.isFinite(entry)) out[key] = entry;
    else if (typeof entry === "boolean") out[key] = entry;
  }
  return out;
}

async function rpc(name: string, body: unknown): Promise<Response> {
  const url = process.env.EVENTS_SUPABASE_URL;
  const key = process.env.EVENTS_SUPABASE_KEY;
  if (!url || !key) throw new Error("event log not configured");
  return fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Validates one event from the browser, adds the visitor's city from Vercel's
 * geolocation headers (rounded to ~11 km; the IP address is never read or
 * stored) and writes it. Returns the HTTP status for the browser.
 */
export async function recordEvent(raw: unknown, headers: Headers, environment: Environment = currentEnvironment()): Promise<number> {
  if (BOT.test(header(headers, "user-agent"))) return 204;
  let body: Record<string, unknown>;
  try {
    body = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>;
  } catch {
    return 400;
  }
  if (!body || typeof body !== "object") return 400;
  const event = text(body.event, 40);
  const visitor = text(body.visitor, 64);
  if (!event || !EVENTS.has(event) || !visitor || visitor.length < 8) return 400;
  const value = typeof body.value === "number" && Number.isFinite(body.value) && body.value >= 0 && body.value <= 100000 ? body.value : undefined;
  const device = body.device === "mobile" || body.device === "tablet" || body.device === "desktop" ? body.device : undefined;
  const country = header(headers, "x-vercel-ip-country").toUpperCase();

  const response = await rpc("record_event", {
    p: {
      environment,
      event,
      visitor_id: visitor,
      session_id: text(body.session, 64),
      path: text(body.path, 200),
      product_id: text(body.productId, 60),
      value,
      variant: text(body.variant, 40),
      utm_source: text(body.source, 60),
      utm_medium: text(body.medium, 60),
      utm_campaign: text(body.campaign, 60),
      referrer_host: text(body.referrer, 120),
      device,
      country: /^[A-Z]{2}$/.test(country) ? country : undefined,
      region: decode(header(headers, "x-vercel-ip-country-region")),
      city: decode(header(headers, "x-vercel-ip-city")),
      lat: coordinate(header(headers, "x-vercel-ip-latitude"), 90),
      lon: coordinate(header(headers, "x-vercel-ip-longitude"), 180),
      metadata: metadata(body.metadata),
    },
  });
  return response.ok ? 204 : 502;
}

/** Aggregates for the live page. Production data only, unless running locally. */
export async function readSummary(hours?: number, environment: Environment = currentEnvironment()): Promise<unknown> {
  const response = await rpc("analytics_summary", {
    p_hours: hours && hours > 0 && hours <= 24 * 30 ? Math.round(hours) : null,
    p_environment: environment === "development" ? "development" : "production",
  });
  if (!response.ok) throw new Error(`summary failed: ${response.status}`);
  return response.json();
}
