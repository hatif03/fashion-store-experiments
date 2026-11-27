import * as React from "react";
import { Link } from "react-router";
import { useCatalog } from "@/catalog/CatalogProvider";
import { productById } from "@/catalog/selectors";
import { useDocumentTitle } from "@/lib/hooks";
import { WorldMap, type Ping, type Place } from "./WorldMap";

interface Summary {
  generated_at: string;
  first_event_at: string | null;
  totals: { visitors: number; sessions: number; page_views: number; product_views: number; adds: number; orders: number; demo_revenue: number; associate_messages: number; countries: number; cities: number };
  funnel: { step: string; event: string; visitors: number }[];
  countries: { code: string; visitors: number }[];
  places: (Place & { last_seen: string })[];
  recent: { event: string; city: string | null; country: string | null; lat: number | null; lon: number | null; product_id: string | null; created_at: string }[];
  sources: { source: string; visitors: number }[];
  devices: { device: string; visitors: number }[];
  variants: { variant: string; visitors: number; viewers: number; adders: number }[];
  experiments: { flag: string; variant: string; visitors: number; viewers: number; views: number; adders: number; repliers: number }[];
  products: { product_id: string; viewers: number; adders: number }[];
  hourly: { hour: string; visitors: number }[];
}

type Recent = Summary["recent"][number];

const POLL_MS = 15_000;
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string | null) => {
  if (!code) return null;
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};
const recentKey = (entry: Recent) => `${entry.created_at}|${entry.event}|${entry.city}|${entry.product_id}`;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useSummary(hours: number | null) {
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/stats${hours ? `?hours=${hours}` : ""}`);
        if (!response.ok) throw new Error(String(response.status));
        const next = (await response.json()) as Summary;
        if (!cancelled) {
          setSummary(next);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    void load();
    const timer = window.setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [hours]);
  return { summary, failed };
}

/** Counts up to the latest value instead of jumping. */
function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString("en-US") }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = React.useState(0);
  const from = React.useRef(0);
  React.useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{format(shown)}</>;
}

/** New events since the last poll flash on the map; the first load replays the latest few. */
function usePings(recent: Recent[] | undefined) {
  const [pings, setPings] = React.useState<Ping[]>([]);
  const seen = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    if (!recent) return;
    const fresh = recent.filter((entry) => entry.lat !== null && entry.lon !== null && !seen.current?.has(recentKey(entry)));
    const replay = seen.current === null ? fresh.slice(0, 10).reverse() : fresh.reverse();
    seen.current = new Set(recent.map(recentKey));
    const timers = replay.map((entry, i) =>
      window.setTimeout(() => {
        const ping: Ping = { id: `${recentKey(entry)}-${Date.now()}`, lat: entry.lat!, lon: entry.lon!, strong: entry.event === "order_placed" || entry.event === "piece_added" };
        setPings((current) => [...current.slice(-30), ping]);
        window.setTimeout(() => setPings((current) => current.filter((candidate) => candidate.id !== ping.id)), 2400);
      }, i * 700),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [recent]);
  return pings;
}

function ago(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function useNow(interval = 10_000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
}

const percent = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : "—");
const mean = (part: number, whole: number) => (whole ? (part / whole).toFixed(2) : "—");

const EXPERIMENTS: { flag: string; title: string; control: string; variation: string; caption: string; field: "viewers" | "views" | "adders" | "repliers"; mean?: boolean }[] = [
  { flag: "homepage_merchandising", title: "Homepage", control: "rail", variation: "grid", caption: "opened a product", field: "viewers" },
  { flag: "size_suggestion", title: "Suggested size", control: "choose", variation: "suggested", caption: "added the piece", field: "adders" },
  { flag: "complete_the_look", title: "Complete the look", control: "shown", variation: "hidden", caption: "pieces opened each", field: "views", mean: true },
  { flag: "associate_greeting", title: "Associate", control: "silent", variation: "speaks", caption: "sent a message", field: "repliers" },
  { flag: "buy_bar", title: "Phone bar", control: "return", variation: "adds", caption: "added the piece", field: "adders" },
];

export default function LivePage() {
  const catalog = useCatalog();
  useDocumentTitle(`Live — ${catalog.settings.name}`);
  const [hours, setHours] = React.useState<number | null>(null);
  const { summary, failed } = useSummary(hours);
  const pings = usePings(summary?.recent);
  const now = useNow();
  const productName = (id: string | null) => (id ? (productById(catalog, id)?.name ?? id) : "a piece");

  const totals = summary?.totals;
  const funnelTop = summary?.funnel[0]?.visitors ?? 0;
  const hourly = React.useMemo(() => {
    const slots = new Array<number>(72).fill(0);
    const thisHour = Math.floor(Date.now() / 3_600_000);
    for (const entry of summary?.hourly ?? []) {
      const index = 71 - (thisHour - Math.floor(new Date(entry.hour).getTime() / 3_600_000));
      if (index >= 0 && index < 72) slots[index] = entry.visitors;
    }
    return slots;
  }, [summary?.hourly]);
  const hourlyMax = Math.max(1, ...hourly);
  const sourceTotal = (summary?.sources ?? []).reduce((sum, entry) => sum + entry.visitors, 0);
  const deviceTotal = (summary?.devices ?? []).reduce((sum, entry) => sum + entry.visitors, 0);

  const describe = (entry: Recent) => {
    switch (entry.event) {
      case "product_viewed":
        return `opened the ${productName(entry.product_id)}`;
      case "piece_added":
        return `added the ${productName(entry.product_id)} to the bag`;
      case "order_placed":
        return "placed a demo order";
      case "associate_message_sent":
        return "asked the studio associate a question";
      default:
        return "is browsing the store";
    }
  };

  return (
    <div className="tone-ink min-h-svh">
      <header className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <Link to="/" className="type-wide text-[15px] tracking-[0.3em]">
          {catalog.settings.name}
        </Link>
        <div className="flex items-center gap-6">
          <div role="group" aria-label="Time range" className="label flex gap-4">
            {[
              { label: "All time", value: null },
              { label: "24 hours", value: 24 },
            ].map((option) => (
              <button key={option.label} type="button" aria-pressed={hours === option.value} onClick={() => setHours(option.value)} className={`link-draw py-1 ${hours === option.value ? "text-foreground [background-size:100%_1px]" : "text-muted-foreground hover:text-foreground"}`}>
                {option.label}
              </button>
            ))}
          </div>
          <p className="label hidden items-center gap-2 sm:flex">
            <span className="relative flex size-2">
              <span className={`absolute inline-flex size-full rounded-full ${failed ? "bg-muted-foreground" : "animate-ping bg-[#e8c27a] opacity-75 motion-reduce:animate-none"}`} />
              <span className={`relative inline-flex size-2 rounded-full ${failed ? "bg-muted-foreground" : "bg-[#e8c27a]"}`} />
            </span>
            {failed ? "Reconnecting" : "Live"}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-20 sm:px-6 lg:px-10">
        <section className="grid gap-8 pb-10 pt-6 md:grid-cols-12 md:pt-12">
          <div className="md:col-span-7">
            <p className="label text-muted-foreground">The store, live</p>
            <h1 className="type-wide mt-4 text-balance text-[clamp(2.4rem,5vw,4.75rem)] font-extralight leading-[0.98] tracking-[-0.03em]">Who is in the store.</h1>
          </div>
          <p className="max-w-[48ch] self-end text-[14px] leading-relaxed text-muted-foreground md:col-span-5">
            Every visit to this showroom{summary?.first_event_at ? ` since ${new Date(summary.first_event_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` : ""}, from real people who found it on public forums. Counted from the store's own anonymous event log and refreshed every few seconds.
          </p>
        </section>

        <dl className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Visitors", value: totals?.visitors ?? 0 },
            { label: "Countries", value: totals?.countries ?? 0 },
            { label: "Cities", value: totals?.cities ?? 0 },
            { label: "Products opened", value: totals?.product_views ?? 0 },
            { label: "Added to bag", value: totals?.adds ?? 0 },
            { label: "Demo orders", value: totals?.orders ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-3 bg-background p-5 md:p-6">
              <dt className="label text-muted-foreground">{stat.label}</dt>
              <dd className="type-wide tabular text-[clamp(1.8rem,3vw,2.75rem)] font-extralight leading-none">
                <CountUp value={stat.value} />
              </dd>
            </div>
          ))}
        </dl>

        <section aria-label="Visitors on the map" className="relative mt-10">
          <WorldMap places={summary?.places ?? []} pings={pings} className="h-auto w-full" />
          {summary && summary.places.length === 0 && (
            <p className="label absolute inset-x-0 top-1/2 text-center text-muted-foreground">The first visitors will appear here.</p>
          )}
          <div className="label pointer-events-none mt-4 flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground md:absolute md:bottom-2 md:left-0 md:mt-0">
            <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-chalk" /> A city with visitors</span>
            <span className="flex items-center gap-2"><span className="size-2 rounded-full border border-chalk" /> Something just happened</span>
            <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e8c27a]" /> A bag or an order</span>
          </div>
        </section>

        <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-3">
          <section className="flex flex-col gap-6 bg-background p-6">
            <h2 className="label text-muted-foreground">From visit to order</h2>
            <ol className="flex flex-col gap-4">
              {(summary?.funnel ?? []).map((step) => (
                <li key={step.event} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-4 text-[14px]">
                    <span>{step.step}</span>
                    <span className="tabular text-muted-foreground">
                      {step.visitors.toLocaleString("en-US")} · {percent(step.visitors, funnelTop)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-border">
                    <div className="h-full bg-chalk transition-[width] duration-1000 ease-(--ease-settle)" style={{ width: funnelTop ? `${(step.visitors / funnelTop) * 100}%` : "0%" }} />
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-auto text-[12px] leading-relaxed text-muted-foreground">Distinct visitors at each step. Orders are demo orders: nothing is charged, so they measure intent.</p>
          </section>

          <section className="flex flex-col gap-4 bg-background p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="label text-muted-foreground">Five experiments</h2>
              <span className="label text-[#e8c27a]">Running</span>
            </div>
            <ul className="flex flex-col gap-3">
              {EXPERIMENTS.map((experiment) => {
                const arms = (name: string) => {
                  if (experiment.flag === "homepage_merchandising") {
                    const arm = summary?.variants.find((entry) => entry.variant === name);
                    return { visitors: arm?.visitors ?? 0, value: arm?.viewers ?? 0 };
                  }
                  const arm = summary?.experiments?.find((entry) => entry.flag === experiment.flag && entry.variant === name);
                  return { visitors: arm?.visitors ?? 0, value: arm?.[experiment.field] ?? 0 };
                };
                const control = arms(experiment.control);
                const variation = arms(experiment.variation);
                const show = experiment.mean ? mean : percent;
                return (
                  <li key={experiment.flag} className="border-t border-border pt-3">
                    <p className="text-[13px]">{experiment.title}</p>
                    <p className="mt-1 flex justify-between gap-3 text-[12px] text-muted-foreground">
                      <span>{experiment.control} <span className="tabular text-foreground">{show(control.value, control.visitors)}</span></span>
                      <span>{experiment.variation} <span className="tabular text-foreground">{show(variation.value, variation.visitors)}</span></span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{experiment.caption}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-auto text-[12px] leading-relaxed text-muted-foreground">Counts from this log. Flagsmith decides, and only after the pre-registered rule. Source and device are below; Flagsmith does not slice a result by them.</p>
          </section>

          <section className="flex min-h-[22rem] flex-col gap-4 bg-background p-6">
            <h2 className="label text-muted-foreground">Just now</h2>
            <ul className="flex flex-col divide-y divide-border overflow-hidden">
              {(summary?.recent ?? []).slice(0, 9).map((entry) => {
                const place = entry.city ? `${entry.city}, ${countryName(entry.country)}` : countryName(entry.country);
                return (
                  <li key={recentKey(entry)} className="animate-in fade-in slide-in-from-top-1 flex items-baseline justify-between gap-4 py-2.5 text-[13px] [animation-duration:600ms] motion-reduce:animate-none">
                    <span>
                      <span className="text-foreground">{place ? `Someone in ${place}` : "Someone"}</span> <span className="text-muted-foreground">{describe(entry)}</span>
                    </span>
                    <span className="tabular shrink-0 text-[12px] text-muted-foreground">{ago(entry.created_at, now)}</span>
                  </li>
                );
              })}
              {summary && summary.recent.length === 0 && <li className="py-2.5 text-[13px] text-muted-foreground">Waiting for the first visitor.</li>}
            </ul>
          </section>
        </div>

        <div className="mt-px grid gap-px overflow-hidden border border-t-0 border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          <section className="flex flex-col gap-4 bg-background p-6">
            <h2 className="label text-muted-foreground">Where they came from</h2>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {(summary?.sources ?? []).slice(0, 7).map((entry) => (
                <li key={entry.source} className="flex justify-between gap-4">
                  <span className="truncate">{entry.source}</span>
                  <span className="tabular text-muted-foreground">{percent(entry.visitors, sourceTotal)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-4 bg-background p-6">
            <h2 className="label text-muted-foreground">Top countries</h2>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {(summary?.countries ?? []).slice(0, 7).map((entry) => (
                <li key={entry.code} className="flex justify-between gap-4">
                  <span className="truncate">{countryName(entry.code)}</span>
                  <span className="tabular text-muted-foreground">{entry.visitors}</span>
                </li>
              ))}
            </ul>
            {deviceTotal > 0 && (
              <p className="mt-auto text-[12px] text-muted-foreground">
                {(summary?.devices ?? []).map((entry) => `${percent(entry.visitors, deviceTotal)} ${entry.device}`).join(" · ")}
              </p>
            )}
          </section>
          <section className="flex flex-col gap-4 bg-background p-6">
            <h2 className="label text-muted-foreground">Most opened pieces</h2>
            <ol className="flex flex-col gap-2.5 text-[13px]">
              {(summary?.products ?? []).slice(0, 7).map((entry) => (
                <li key={entry.product_id} className="flex justify-between gap-4">
                  <span className="truncate">{productName(entry.product_id)}</span>
                  <span className="tabular text-muted-foreground">
                    {entry.viewers}
                    {entry.adders ? ` · ${entry.adders} bagged` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section className="flex flex-col gap-4 bg-background p-6">
            <h2 className="label text-muted-foreground">Visitors per hour · last 3 days</h2>
            <div className="flex h-28 items-end gap-px border-b border-border" aria-hidden="true">
              {hourly.map((visitors, i) => (
                <div key={i} className="flex-1 bg-chalk/70 transition-[height] duration-700" style={{ height: visitors ? `${Math.max(6, (visitors / hourlyMax) * 100)}%` : "0%" }} />
              ))}
            </div>
            <p className="mt-auto text-[12px] text-muted-foreground">
              <span className="tabular">{totals?.associate_messages ?? 0}</span> questions asked of the studio associate.
            </p>
          </section>
        </div>

        <footer className="mt-12 flex flex-col gap-3 text-[12px] leading-relaxed text-muted-foreground md:flex-row md:justify-between">
          <p className="max-w-[80ch]">
            Anonymous by design: a random id kept in the visitor's browser, a city worked out from the network by our host and rounded to about 11 km, and no IP address, name or email stored. The team's own visits are excluded.
          </p>
          <Link to="/" className="label link-draw shrink-0 self-start py-1 text-foreground">
            Back to the store
          </Link>
        </footer>
      </main>
    </div>
  );
}
