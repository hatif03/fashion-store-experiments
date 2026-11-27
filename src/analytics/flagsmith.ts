import * as React from "react";
import flagsmith from "@flagsmith/flagsmith";
import { currentVisit, isInternal, visitorId } from "./visitor";

const ENVIRONMENT_KEY: string = import.meta.env.VITE_FLAGSMITH_ENVIRONMENT_KEY ?? "";
const ASSIGNED_PREFIX = "stillform.exp.";
const FALLBACK_PREFIX = "stillform.exp-fallback.";

/** off: no key, an internal browser, or a server render. failed: the flags request did not succeed. */
export type FlagsmithStatus = "off" | "loading" | "ready" | "failed";

let status: FlagsmithStatus = typeof window !== "undefined" && ENVIRONMENT_KEY && !isInternal() ? "loading" : "off";
let started = false;
const listeners = new Set<() => void>();
const pending: Array<() => void> = [];

function setStatus(next: FlagsmithStatus) {
  status = next;
  if (next === "ready") for (const run of pending.splice(0)) run();
  else if (next !== "loading") pending.length = 0;
  for (const listener of listeners) listener();
}

/** Identifies the visitor and loads flags once per page load. Safe to call repeatedly. */
export function startFlagsmith(): void {
  if (started) return;
  started = true;
  if (typeof window === "undefined" || !ENVIRONMENT_KEY || isInternal()) {
    setStatus("off");
    return;
  }
  const visit = currentVisit();
  flagsmith
    .init({
      environmentID: ENVIRONMENT_KEY,
      identity: visitorId(),
      traits: {
        utm_source: visit.utmSource || visit.referrerHost || "direct",
        utm_medium: visit.utmMedium || "none",
        utm_campaign: visit.utmCampaign || "none",
        landing_path: visit.landingPath,
        device: visit.device,
        language: (navigator.language || "unknown").toLowerCase().slice(0, 16),
        timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown").slice(0, 40),
      },
      applicationMetadata: { name: "STILLFORM", version: "0.1.0" },
      enableEvents: true,
      // A short interval: the flush on pagehide is not guaranteed to leave before the page unloads.
      eventProcessorConfig: { flushInterval: 1000 },
    })
    .then(
      () => setStatus("ready"),
      () => setStatus("failed"),
    );
  // The SDK buffers events on a timer; send what is left when the tab goes away.
  window.addEventListener("pagehide", () => void flagsmith.flushEvents().catch(() => undefined));
}

/** Records a conversion event for the current identity. Waits for flags so the event carries the identity and its traits. */
export function sendFlagsmithEvent(event: string, value: number | undefined, metadata: Record<string, unknown>): void {
  const send = () =>
    flagsmith.trackEvent(event, {
      value,
      // Traits already travel with the identity. The variant tags and the page let a later read of the warehouse join an event to what the visitor had seen.
      metadata: { ...assignedFlags(), ...metadata, page: window.location.pathname.slice(0, 80) },
    });
  if (status === "ready") send();
  else if (status === "loading") pending.push(send);
}

function useFlagsmithStatus(): FlagsmithStatus {
  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
    () => "off" as FlagsmithStatus,
  );
}

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(store: Storage, key: string, value: string) {
  try {
    store.setItem(key, value);
  } catch {
    // Storage unavailable: the variant is not attached to later events in our own log.
  }
}

/** The variant this browser was exposed to, for tagging events in our own log. */
export function assignedVariant(feature: string): string | null {
  try {
    return window.localStorage.getItem(ASSIGNED_PREFIX + feature);
  } catch {
    return null;
  }
}

/** Every flag this browser has been exposed to. Keys stay inside the event-log's metadata rules. */
export function assignedFlags(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(ASSIGNED_PREFIX)) continue;
      const name = `flag_${key.slice(ASSIGNED_PREFIX.length)}`;
      const value = window.localStorage.getItem(key);
      if (/^[a-z_]{1,32}$/.test(name) && value) out[name] = value.slice(0, 80);
    }
  } catch {
    // Storage unavailable: events still go out, without the variant tags.
  }
  return out;
}

/**
 * `?preview=<value>` is the homepage hero, so the existing reviewer links keep
 * working. Any other flag uses `?preview.<flag>=<value>`.
 */
function previewFor(feature: string): string | null {
  const params = new URLSearchParams(window.location.search);
  const named = params.get(`preview.${feature}`);
  if (named) return named;
  if (feature === "homepage_merchandising") return params.get("preview");
  return null;
}

/**
 * The value of an experiment flag, decided once for this page view.
 *
 * Returns null while flags load, so the caller can hold a neutral placeholder.
 * When the flags arrive in time, the value is shown and getExperimentFlag
 * records the exposure (only if this identity is enrolled). When they do not
 * arrive within `timeoutMs`, the control is shown with no exposure, and the
 * rest of the session stays on the control so nobody sees both versions.
 * `?preview=<value>` shows the homepage hero without enrolling anyone.
 * `?preview.<flag>=<value>` does the same for any other flag.
 * Pass `enroll` false until the feature is actually on screen: the hook then
 * returns the control and records nothing.
 */
export function useExperimentValue(feature: string, control: string, timeoutMs = 2500, enroll = true): string | null {
  const current = useFlagsmithStatus();
  const [timedOut, setTimedOut] = React.useState(false);
  const decided = React.useRef<string | null>(null);
  const preview = typeof window === "undefined" ? null : previewFor(feature);
  const active = enroll || preview !== null;

  if (active && decided.current === null) {
    if (preview) decided.current = preview;
    else if (readSession(FALLBACK_PREFIX + feature)) decided.current = control;
    else if (current === "off" || current === "failed") decided.current = control;
    else if (current === "ready") decided.current = String(flagsmith.getValue(feature, { skipAnalytics: true }) ?? control);
    else if (timedOut) {
      decided.current = control;
      writeStore(window.sessionStorage, FALLBACK_PREFIX + feature, "1");
    }
  }
  const value = decided.current;

  React.useEffect(() => {
    if (!active || value !== null) return;
    const timer = window.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [active, value, timeoutMs]);

  // Exposure is recorded after the version is on screen, once per mount.
  const exposed = React.useRef(false);
  React.useEffect(() => {
    if (!enroll || value === null || exposed.current || current !== "ready") return;
    if (preview || readSession(FALLBACK_PREFIX + feature)) return;
    exposed.current = true;
    let flag: { value?: unknown; experiment?: { inExperiment?: boolean } } | undefined;
    try {
      flag = flagsmith.getExperimentFlag(feature) as typeof flag;
    } catch {
      return;
    }
    if (flag?.experiment?.inExperiment) writeStore(window.localStorage, ASSIGNED_PREFIX + feature, String(flag.value));
  }, [enroll, value, current, feature, preview]);

  if (preview) return preview;
  if (!enroll) return control;
  return value;
}
