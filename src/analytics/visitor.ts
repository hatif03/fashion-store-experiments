const VISITOR_KEY = "stillform.visitor.v1";
const VISIT_KEY = "stillform.visit.v1";
const INTERNAL_KEY = "stillform.internal";

export type Device = "mobile" | "tablet" | "desktop";

/** Where this browser session came from. Captured once, on the first page of the session. */
export interface Visit {
  sessionId: string;
  landingPath: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  device: Device;
}

function read(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}

function write(store: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {
    // Private mode or a full quota: the id lives for this page only.
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

let memoryVisitor: string | null = null;

/** An anonymous id for this browser. It is the Flagsmith identity, so it must not change between visits. */
export function visitorId(): string {
  memoryVisitor ??= read(local, VISITOR_KEY);
  if (!memoryVisitor) {
    memoryVisitor = newId();
    write(local, VISITOR_KEY, memoryVisitor);
  }
  return memoryVisitor;
}

function device(): Device {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

function clip(value: string | null, max = 60): string {
  return (value ?? "").trim().toLowerCase().slice(0, max);
}

let memoryVisit: Visit | null = null;

export function currentVisit(): Visit {
  if (memoryVisit) return memoryVisit;
  const stored = read(session, VISIT_KEY);
  if (stored) {
    try {
      memoryVisit = JSON.parse(stored) as Visit;
      return memoryVisit;
    } catch {
      // Fall through and start a new visit.
    }
  }
  const params = new URLSearchParams(window.location.search);
  let referrerHost = "";
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    referrerHost = host === window.location.hostname ? "" : host.replace(/^www\./, "");
  } catch {
    referrerHost = "";
  }
  memoryVisit = {
    sessionId: newId(),
    landingPath: window.location.pathname.slice(0, 200),
    referrerHost: clip(referrerHost, 120),
    utmSource: clip(params.get("utm_source")),
    utmMedium: clip(params.get("utm_medium")),
    utmCampaign: clip(params.get("utm_campaign")),
    device: device(),
  };
  write(session, VISIT_KEY, JSON.stringify(memoryVisit));
  return memoryVisit;
}

/**
 * The team's own browsers. `?internal=1` marks a browser until `?internal=0`:
 * it is never enrolled in an experiment and its events are left out of the live page.
 */
export function isInternal(): boolean {
  const flag = new URLSearchParams(window.location.search).get("internal");
  if (flag === "1") write(local, INTERNAL_KEY, "1");
  if (flag === "0") write(local, INTERNAL_KEY, null);
  return read(local, INTERNAL_KEY) === "1";
}
