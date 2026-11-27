import * as React from "react";
import { Link, useLocation } from "react-router";
import { GREETING_EXPERIMENT, dollars, track } from "@/analytics/track";
import { useExperimentValue } from "@/analytics/flagsmith";
import { useBag } from "@/bag/BagProvider";
import { useCatalog } from "@/catalog/CatalogProvider";
import { colorwayOf, formatPrice, productById, productBySlug, productPath, variantBySku } from "@/catalog/selectors";
import type { Product } from "@/catalog/types";
import { GarmentImage } from "./GarmentImage";
import { useFocusTrap } from "@/lib/hooks";

interface PieceRef {
  id: string;
  colorwayId: string;
}

interface Turn {
  id: string;
  role: "user" | "assistant";
  text: string;
  products: PieceRef[];
  adds: { sku: string }[];
  compare: PieceRef[];
  streaming: boolean;
}

const WELCOME = "Ask about a cloth, a colour, or what to wear with a piece.";
const SUGGESTIONS = ["A heavy tee in bone", "Something warm under $200", "What sits with the moss cardigan?", "How do returns work?"];

const pageName = () => window.location.pathname.split("/")[1] || "home";

function sessionId(): string {
  const key = "stillform.associate";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(key, created);
  return created;
}

function PieceLink({ piece }: { piece: PieceRef }) {
  const catalog = useCatalog();
  const product = productById(catalog, piece.id);
  if (!product) return null;
  const colorway = colorwayOf(product, piece.colorwayId);
  return (
    <Link to={productPath(product, colorway.id)} state={{ source: "associate" }} className="flex items-center gap-3 border border-border bg-background p-2 outline-none focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-ring">
      <span className="tone-bone relative block h-16 w-12 shrink-0">
        <GarmentImage mediaId={colorway.media.front} alt="" decorative className="absolute inset-0 size-full" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px]">{product.name}</span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">
          {colorway.name}
          <span className="tabular"> · {formatPrice(catalog, product.price)}</span>
        </span>
      </span>
    </Link>
  );
}

function Compare({ pieces }: { pieces: PieceRef[] }) {
  const catalog = useCatalog();
  const products = pieces.map((piece) => productById(catalog, piece.id)).filter((product): product is Product => Boolean(product));
  if (products.length !== 2) return null;
  return (
    <div className="grid grid-cols-2 gap-2 text-[12px]">
      {products.map((product) => (
        <div key={product.id} className="border border-border p-2">
          <p className="font-medium">{product.name}</p>
          <p className="tabular mt-1">{formatPrice(catalog, product.price)}</p>
          <p className="mt-2 text-muted-foreground">{product.composition}</p>
          <p className="mt-1 text-muted-foreground">{product.fit}</p>
        </div>
      ))}
    </div>
  );
}

export function SalesAssociate() {
  const catalog = useCatalog();
  const bag = useBag();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [prompted, setPrompted] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const panel = React.useRef<HTMLDivElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const field = React.useRef<HTMLTextAreaElement>(null);
  const session = React.useRef("");
  const openedFor = React.useRef("");
  const greeted = React.useRef(false);
  const turnsRef = React.useRef(turns);
  const [noticeName, setNoticeName] = React.useState<string | null>(null);
  const [due, setDue] = React.useState(false);
  turnsRef.current = turns;
  const onProduct = location.pathname.startsWith("/products/");
  const slug = onProduct ? location.pathname.split("/")[2] ?? "" : "";
  const pageProduct = slug ? productBySlug(catalog, decodeURIComponent(slug)) : undefined;
  const greeting = useExperimentValue(GREETING_EXPERIMENT, "silent", 2500, onProduct && due);

  const currentSession = () => {
    if (!session.current) session.current = sessionId();
    return session.current;
  };
  useFocusTrap(panel, open, () => setOpen(false));

  React.useEffect(() => {
    if (!onProduct) {
      setDue(false);
      return;
    }
    const timer = window.setTimeout(() => setDue(true), 8000);
    return () => {
      window.clearTimeout(timer);
      setDue(false);
    };
  }, [onProduct, location.pathname]);

  React.useEffect(() => {
    const leftProduct = openedFor.current !== "" && openedFor.current !== location.pathname;
    if (location.pathname.startsWith("/checkout") || leftProduct) setOpen(false);
    if (leftProduct && turnsRef.current.length === 0) {
      setPrompted(false);
      setNoticeName(null);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("preview.associate_greeting") === "speaks";
    if (greeting !== "speaks" || !pageProduct || openedFor.current === location.pathname) return;
    if (!preview && greeted.current) return;
    if (turnsRef.current.length > 0 && noticeName) {
      openedFor.current = location.pathname;
      greeted.current = true;
      setOpen(true);
      return;
    }
    openedFor.current = location.pathname;
    greeted.current = true;
    setNoticeName(pageProduct.name);
    setPrompted(true);
    setOpen(true);
  }, [greeting, pageProduct, location.pathname, noticeName]);

  React.useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [turns, open]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    const history = turns.filter((turn) => turn.text && !turn.streaming).map((turn) => ({ role: turn.role, content: turn.text }));
    const userId = crypto.randomUUID();
    const replyId = crypto.randomUUID();
    setTurns((current) => [
      ...current,
      { id: userId, role: "user", text: message, products: [], adds: [], compare: [], streaming: false },
      { id: replyId, role: "assistant", text: "", products: [], adds: [], compare: [], streaming: true },
    ]);
    setInput("");
    setLoading(true);
    track("associate_message_sent", { metadata: { page: pageName(), turn: history.length / 2 + 1 } });
    const apply = (patch: (turn: Turn) => Turn) => setTurns((current) => current.map((turn) => (turn.id === replyId ? patch(turn) : turn)));
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, sessionId: currentSession() }),
      });
      if (!response.ok || !response.body) throw new Error("unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          let data: { type?: string; content?: string; message?: string; products?: PieceRef[]; adds?: { sku: string }[]; compare?: PieceRef[] };
          try {
            data = JSON.parse(line.slice(5));
          } catch {
            continue;
          }
          if (data.type === "token" && data.content) apply((turn) => ({ ...turn, text: turn.text + data.content }));
          if (data.type === "done") apply((turn) => ({ ...turn, streaming: false, products: data.products ?? [], adds: data.adds ?? [], compare: data.compare ?? [] }));
          if (data.type === "error") apply((turn) => ({ ...turn, streaming: false, text: data.message || "The studio associate is unavailable." }));
        }
      }
      apply((turn) => ({ ...turn, streaming: false, text: turn.text || "The studio associate is unavailable." }));
    } catch {
      apply((turn) => ({ ...turn, streaming: false, text: "The studio associate is unavailable." }));
    } finally {
      setLoading(false);
    }
  };

  const add = (sku: string) => {
    const found = variantBySku(catalog, sku);
    if (!found || found.variant.stock <= 0) return;
    bag.dispatch({ type: "add", sku });
    track("piece_added", { value: dollars(found.product.price), productId: found.product.id, metadata: { source: "associate", size: found.variant.size, colorway: found.variant.colorwayId } });
    bag.setOpen(true);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="label fixed bottom-5 right-5 z-50 transition-[bottom] duration-500 max-md:[html[data-buybar]_&]:bottom-24 border border-foreground/20 bg-background px-4 py-3 text-foreground shadow-[0_12px_40px_rgb(18_17_16/0.12)] hover:border-foreground"
        aria-expanded={open}
        aria-controls="studio-associate"
        onClick={() => {
          if (!open) track("associate_opened", { metadata: { page: pageName() } });
          setOpen(!open);
        }}
      >
        {open ? "Close" : "Ask the studio"}
      </button>
      {open && (
        <div
          ref={panel}
          id="studio-associate"
          role="dialog"
          aria-label="Studio associate"
          className="fixed bottom-20 right-5 z-50 flex w-[min(24rem,calc(100vw-2.5rem))] flex-col border border-border bg-card text-card-foreground shadow-[0_24px_80px_rgb(18_17_16/0.16)] max-md:[html[data-buybar]_&]:bottom-40"
          style={{ height: "min(34rem, calc(100dvh - 7.5rem))" }}
        >
          <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
            <div>
              <p className="label text-muted-foreground">Studio</p>
              <p className="mt-1 text-[15px]">Associate</p>
            </div>
            <button type="button" className="label text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div ref={scroller} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            {prompted && noticeName ? (
              <p className="text-[14px] leading-relaxed">{`The ${noticeName} is in front of you. What should I tell you about it?`}</p>
            ) : (
              <p className="text-[14px] leading-relaxed text-muted-foreground">{WELCOME}</p>
            )}
            {turns.length === 0 && prompted && noticeName && (
              <button type="button" className="self-start border border-border px-3 py-2 text-left text-[13px] hover:border-foreground" onClick={() => void send(`How does the ${noticeName} fit?`)}>
                {`How does the ${noticeName} fit?`}
              </button>
            )}
            {turns.length === 0 && !prompted && (
              <div className="flex flex-col items-start gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} type="button" className="border border-border px-3 py-2 text-left text-[13px] hover:border-foreground" onClick={() => void send(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {turns.map((turn) => (
              <div key={turn.id} className={turn.role === "user" ? "ml-8 border border-foreground/15 bg-background px-3 py-2 text-[14px] leading-relaxed" : "mr-4 text-[14px] leading-relaxed"}>
                {turn.streaming && !turn.text ? <span className="text-muted-foreground">Looking through the collection</span> : <span className="whitespace-pre-wrap">{turn.text}</span>}
                {turn.compare.length === 2 && (
                  <div className="mt-3">
                    <Compare pieces={turn.compare} />
                  </div>
                )}
                {turn.products.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {turn.products.map((piece) => (
                      <PieceLink key={`${piece.id}-${piece.colorwayId}`} piece={piece} />
                    ))}
                  </div>
                )}
                {turn.adds.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {turn.adds.map((item) => {
                      const found = variantBySku(catalog, item.sku);
                      if (!found) return null;
                      return (
                        <button key={item.sku} type="button" className="label border border-foreground px-3 py-2 text-left hover:bg-foreground hover:text-background" onClick={() => add(item.sku)}>
                          Add {found.product.name}, {found.variant.size}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <form
            className="flex items-end gap-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label className="sr-only" htmlFor="associate-message">
              Message the studio
            </label>
            <textarea
              ref={field}
              id="associate-message"
              data-autofocus
              rows={2}
              value={input}
              disabled={loading}
              placeholder="A cloth, a colour, a piece"
              className="min-w-0 flex-1 resize-none bg-transparent px-1 py-1 text-[14px] outline-none placeholder:text-muted-foreground"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
            />
            <button type="submit" className="label px-2 py-2 disabled:text-muted-foreground" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
