import { activeProducts, formatPrice } from "@/catalog/selectors";
import type { Catalog, Product } from "@/catalog/types";

export type Intent = "greeting" | "store_info" | "product";

export interface PiecePick {
  id: string;
  colorwayId: string;
}

export interface BagAdd {
  sku: string;
  productId: string;
  colorwayId: string;
  size: string;
}

const GREETING = /^(hi|hello|hey|hiya|good (morning|afternoon|evening)|thanks|thank you|bye|goodbye)[!.?\s]*$/i;
const POLICY = /\b(shipping|delivery|dispatch|returns?|refunds?|exchanges?|policies|policy|contact|e-?mail|where (are you|is the studio))\b/i;

/** A budget written as "under $200" or "below 150". A bare price is not a budget. */
export function budgetUsd(message: string): number | null {
  const match = message.match(/\b(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*(\d{2,5})\b/i);
  if (!match?.[1]) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

export function classify(message: string, catalog: Catalog): Intent {
  const text = message.trim();
  if (GREETING.test(text)) return "greeting";
  const lower = text.toLowerCase();
  const namesAPiece = activeProducts(catalog).some((product) => {
    const name = product.name.toLowerCase();
    if (lower.includes(name) || lower.includes(product.id.replaceAll("-", " "))) return true;
    return name.split(/\s+/).some((word) => word.length > 4 && lower.includes(word));
  });
  if (POLICY.test(text) && !namesAPiece) return "store_info";
  return "product";
}

export function greeting(catalog: Catalog): string {
  return `Welcome to ${catalog.settings.name}. Ask about a cloth, a colour, or what to wear with a piece.`;
}

export function storeInfo(catalog: Catalog): string {
  const { settings } = catalog;
  const lines = [settings.policies?.shipping, settings.policies?.returns, settings.shipping?.note, settings.contact?.email ? `Write to the studio at ${settings.contact.email}.` : ""]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line));
  return lines.join(" ");
}

function inStockSizes(product: Product, colorwayId: string): string {
  const available = product.variants.filter((variant) => variant.colorwayId === colorwayId && variant.stock > 0).map((variant) => variant.size);
  const gone = product.variants.filter((variant) => variant.colorwayId === colorwayId && variant.stock <= 0).map((variant) => variant.size);
  const stock = available.length > 0 ? available.join(", ") : "none";
  return gone.length > 0 ? `${stock} (sold out: ${gone.join(", ")})` : stock;
}

/** The whole collection, small enough to sit in one prompt. Names and ids are the only ones the model may use. */
export function catalogueBrief(catalog: Catalog): string {
  const names = new Map(activeProducts(catalog).map((product) => [product.id, product.name]));
  return activeProducts(catalog)
    .map((product) => {
      const colours = product.colorways
        .map((colorway) => `${colorway.name} (id ${colorway.id}): sizes ${inStockSizes(product, colorway.id)}`)
        .join("; ");
      const wornWith = (product.pairsWith ?? []).map((id) => names.get(id)).filter((name): name is string => Boolean(name));
      return [
        `${product.name} (id ${product.id}) — ${catalog.categories.find((category) => category.id === product.category)?.label ?? product.category} — ${formatPrice(catalog, product.price)}`,
        product.summary,
        product.fabric ?? product.description,
        `Fit: ${product.fit}`,
        `Cloth: ${product.composition}`,
        `Colours: ${colours}`,
        wornWith.length > 0 ? `Worn with: ${wornWith.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function replyInstructions(catalog: Catalog, budget: number | null): string {
  const house = catalog.settings.name;
  const limit = budget ? ` The customer set a ceiling of ${formatPrice(catalog, budget * 100)}. Recommend only pieces at or below it.` : "";
  return `You are the sales associate for ${house}, a small house of heavyweight garments. Speak the way the store is written: calm, specific, no exclamation marks, no emoji, no markdown, no bullet lists.

Rules:
- Recommend only pieces from the catalogue below. Never invent a garment, a price, a colour, or a size.
- Use the conversation for follow-ups such as "the cheaper one" or "in black".
- Name the piece, the colour, and the price in plain sentences.
- If nothing fits, say so and offer the closest piece the house does make.
- Two to four sentences. Plain text only.${limit}`;
}

export interface RawSelection {
  id?: unknown;
  colorwayId?: unknown;
  size?: unknown;
  addToBag?: unknown;
}

/** Keeps only real pieces, and only adds a size that is actually in stock. */
export function sanitizeSelection(catalog: Catalog, products: RawSelection[], compareIds: unknown): { products: PiecePick[]; adds: BagAdd[]; compare: PiecePick[] } {
  const byId = new Map(activeProducts(catalog).map((product) => [product.id, product]));
  const picks: PiecePick[] = [];
  const adds: BagAdd[] = [];
  for (const raw of products) {
    if (picks.length >= 4) break;
    const product = typeof raw.id === "string" ? byId.get(raw.id) : undefined;
    if (!product) continue;
    const colorway = product.colorways.find((candidate) => candidate.id === raw.colorwayId) ?? product.colorways[0];
    if (!colorway) continue;
    if (!picks.some((pick) => pick.id === product.id && pick.colorwayId === colorway.id)) picks.push({ id: product.id, colorwayId: colorway.id });
    if (raw.addToBag !== true) continue;
    const wanted = typeof raw.size === "string" ? raw.size : "";
    const exact = product.variants.find((variant) => variant.colorwayId === colorway.id && variant.size.toLowerCase() === wanted.toLowerCase() && variant.stock > 0);
    const fallback = wanted ? undefined : product.variants.find((variant) => variant.colorwayId === colorway.id && variant.stock > 0);
    const variant = exact ?? fallback;
    if (variant && !adds.some((add) => add.sku === variant.sku)) adds.push({ sku: variant.sku, productId: product.id, colorwayId: colorway.id, size: variant.size });
  }

  const compare: PiecePick[] = [];
  if (Array.isArray(compareIds)) {
    for (const id of compareIds) {
      const product = typeof id === "string" ? byId.get(id) : undefined;
      const colorway = product?.colorways[0];
      if (product && colorway) compare.push({ id: product.id, colorwayId: colorway.id });
    }
  }
  return { products: picks, adds, compare: compare.length === 2 ? compare : [] };
}

/** When the extractor returns nothing, cards still follow pieces the reply actually named. */
export function mentionedPieces(text: string, catalog: Catalog): PiecePick[] {
  const lower = text.toLowerCase();
  const picks: PiecePick[] = [];
  for (const product of activeProducts(catalog)) {
    if (!lower.includes(product.name.toLowerCase())) continue;
    const colorway = product.colorways.find((candidate) => lower.includes(candidate.name.toLowerCase())) ?? product.colorways[0];
    if (colorway) picks.push({ id: product.id, colorwayId: colorway.id });
    if (picks.length >= 4) break;
  }
  return picks;
}

export function cleanHistory(raw: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(raw)) return [];
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const item of raw.slice(-8)) {
    if (!item || typeof item !== "object") continue;
    const role = "role" in item ? item.role : undefined;
    const content = "content" in item ? item.content : undefined;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim().slice(0, 600);
    if (text) turns.push({ role, content: text });
  }
  return turns;
}
