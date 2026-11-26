import { localCatalog } from "@/catalog/local";
import { budgetUsd, catalogueBrief, classify, cleanHistory, greeting, mentionedPieces, replyInstructions, sanitizeSelection, storeInfo, type BagAdd, type PiecePick, type RawSelection } from "./knowledge";
import { extractSelection, ifmConfigured, streamContent } from "./ifm";

export type AssociateEvent =
  | { type: "token"; content: string }
  | { type: "done"; products: PiecePick[]; adds: BagAdd[]; compare: PiecePick[] }
  | { type: "error"; message: string };

const EMPTY = { products: [] as PiecePick[], adds: [] as BagAdd[], compare: [] as PiecePick[] };

function transcriptOf(history: { role: string; content: string }[], message: string, reply: string): string {
  const earlier = history.map((turn) => `${turn.role === "user" ? "Customer" : "Associate"}: ${turn.content}`).join("\n");
  return `${earlier ? `${earlier}\n` : ""}Customer: ${message}\nAssociate: ${reply}`;
}

/**
 * The Luxe associate's shape: classify, answer from the catalogue, then
 * attach the pieces and bag actions the reply referred to. The collection
 * is twenty pieces, so the catalogue is the prompt — no vector index.
 * History is sent by the browser. Nothing is stored on the server.
 */
export async function handleAssociate(body: unknown, emit: (event: AssociateEvent) => void | Promise<void>, signal?: AbortSignal): Promise<void> {
  const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
  if (!message) {
    await emit({ type: "error", message: "A message is required." });
    return;
  }
  const history = cleanHistory(body && typeof body === "object" && "history" in body ? body.history : []);
  const sessionId = body && typeof body === "object" && "sessionId" in body && typeof body.sessionId === "string" ? body.sessionId.slice(0, 80) : undefined;
  const intent = classify(message, localCatalog);

  if (intent === "greeting") {
    await emit({ type: "token", content: greeting(localCatalog) });
    await emit({ type: "done", ...EMPTY });
    return;
  }
  if (intent === "store_info") {
    await emit({ type: "token", content: storeInfo(localCatalog) });
    await emit({ type: "done", ...EMPTY });
    return;
  }

  if (!ifmConfigured()) {
    await emit({ type: "error", message: "The studio associate is not configured." });
    return;
  }

  const catalogue = catalogueBrief(localCatalog);
  const budget = budgetUsd(message);
  const historyBlock = history.length > 0 ? `\n\nConversation so far:\n${history.map((turn) => `${turn.role === "user" ? "Customer" : "Associate"}: ${turn.content}`).join("\n")}` : "";
  let reply = "";
  try {
    reply = await streamContent(
      [
        { role: "system", content: `${replyInstructions(localCatalog, budget)}\n\nCatalogue:\n${catalogue}` },
        { role: "user", content: `${message}${historyBlock}` },
      ],
      sessionId,
      (content) => emit({ type: "token", content }),
      signal,
    );
  } catch (error) {
    await emit({ type: "error", message: error instanceof Error && error.message.startsWith("The studio") ? error.message : "The studio associate is unavailable." });
    return;
  }

  if (!reply.trim()) {
    await emit({ type: "error", message: "The studio associate is unavailable." });
    return;
  }

  try {
    const extracted = await extractSelection(transcriptOf(history, message, reply), catalogue, signal);
    const selection = sanitizeSelection(localCatalog, extracted.products as RawSelection[], extracted.compareIds);
    await emit({
      type: "done",
      products: selection.products.length > 0 ? selection.products : mentionedPieces(reply, localCatalog),
      adds: selection.adds,
      compare: selection.compare,
    });
  } catch (error) {
    console.error(`Selection extract failed: ${error instanceof Error ? error.message : "unknown"}`);
    await emit({ type: "done", products: mentionedPieces(reply, localCatalog), adds: [], compare: [] });
  }
}
