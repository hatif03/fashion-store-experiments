import { assignedVariant, sendFlagsmithEvent } from "./flagsmith";
import { currentVisit, isInternal, visitorId } from "./visitor";

/** Every event the store records. docs/METRICS.md defines each one; keep the two in step. */
export type EventName =
  | "page_viewed"
  | "engaged_visit"
  | "product_viewed"
  | "piece_added"
  | "bag_opened"
  | "checkout_started"
  | "checkout_step_completed"
  | "order_placed"
  | "associate_opened"
  | "associate_message_sent"
  | "shop_filtered"
  | "shop_sorted"
  | "size_guide_opened"
  | "pairing_clicked";

export interface TrackOptions {
  /** US dollars, for value metrics such as revenue per visitor. */
  value?: number;
  productId?: string;
  metadata?: Record<string, string | number | boolean>;
}

/** The experiment whose variant is attached to every event in our own log. */
export const HOMEPAGE_EXPERIMENT = "homepage_merchandising";

const EVENT_LOG_URL = "/api/track";
const eventLogEnabled = import.meta.env.VITE_EVENT_LOG !== "off";

function postToEventLog(payload: unknown) {
  // text/plain keeps sendBeacon a simple request; the function parses either.
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.(EVENT_LOG_URL, new Blob([body], { type: "text/plain" }))) return;
  void fetch(EVENT_LOG_URL, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => undefined);
}

/**
 * Records one event in Flagsmith (for experiment results) and in the store's
 * own anonymous event log (for the live page). Never throws.
 */
export function track(event: EventName, { value, productId, metadata = {} }: TrackOptions = {}): void {
  if (typeof window === "undefined") return;
  try {
    const internal = isInternal();
    sendFlagsmithEvent(event, value, productId ? { ...metadata, product_id: productId } : metadata);
    if (!eventLogEnabled || internal) return;
    const visit = currentVisit();
    postToEventLog({
      event,
      visitor: visitorId(),
      session: visit.sessionId,
      path: window.location.pathname,
      productId,
      value,
      variant: assignedVariant(HOMEPAGE_EXPERIMENT),
      source: visit.utmSource,
      medium: visit.utmMedium,
      campaign: visit.utmCampaign,
      referrer: visit.referrerHost,
      device: visit.device,
      metadata,
    });
  } catch {
    // Analytics must never break the store.
  }
}

export type ViewSource = "rail" | "grid" | "collection" | "shop" | "pairing" | "associate" | "direct";

const VIEWED_KEY = "stillform.viewed.v1";

/**
 * product_viewed, once per product per session, so a piece opened on the rail
 * and then on its own page counts once in either version of the homepage.
 */
export function trackProductView(productId: string, price: number, source: ViewSource): void {
  let seen: string[] = [];
  try {
    seen = JSON.parse(window.sessionStorage.getItem(VIEWED_KEY) ?? "[]") as string[];
    if (seen.includes(productId)) return;
    window.sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...seen, productId]));
  } catch {
    // No storage: count it.
  }
  track("product_viewed", { value: price, productId, metadata: { source } });
}

/** Catalogue prices are in cents; events carry dollars. */
export const dollars = (cents: number) => Math.round(cents) / 100;
