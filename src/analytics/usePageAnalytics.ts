import * as React from "react";
import { useLocation } from "react-router";
import { startFlagsmith } from "./flagsmith";
import { track } from "./track";

const ENGAGED_KEY = "stillform.engaged.v1";
const ENGAGED_AFTER_MS = 30_000;

function markEngaged(reason: "second_page" | "time_on_page") {
  try {
    if (window.sessionStorage.getItem(ENGAGED_KEY)) return;
    window.sessionStorage.setItem(ENGAGED_KEY, "1");
  } catch {
    // Without storage this can fire twice in a session; Flagsmith counts occurrence per visitor anyway.
  }
  track("engaged_visit", { metadata: { reason } });
}

/** Starts Flagsmith, records each page view, and one engaged_visit per session. Mount once, in the layout. */
export function usePageAnalytics(): void {
  const { pathname } = useLocation();
  const pages = React.useRef(0);

  React.useEffect(() => {
    startFlagsmith();
  }, []);

  React.useEffect(() => {
    pages.current += 1;
    track("page_viewed", { metadata: { page: pathname.split("/")[1] || "home" } });
    if (pages.current === 2) markEngaged("second_page");
  }, [pathname]);

  React.useEffect(() => {
    let visibleFor = 0;
    let since = document.visibilityState === "visible" ? Date.now() : 0;
    const check = () => {
      if (since) visibleFor += Date.now() - since;
      since = document.visibilityState === "visible" ? Date.now() : 0;
      if (visibleFor >= ENGAGED_AFTER_MS) markEngaged("time_on_page");
    };
    const timer = window.setInterval(check, 5_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
}
