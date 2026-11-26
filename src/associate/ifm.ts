// K2 Horizon on the IFM API. OpenAI-compatible chat completions.
// https://docs.ifm.ai/docs/quickstart.md
// The key is read from the server environment only. Never prefix it with VITE_.

const DEFAULT_BASE = "https://api.ifm.ai/v1";
const DEFAULT_MODEL = "IFM/K2-Horizon-375B-A23B";

declare const process: { env: Record<string, string | undefined> };

export function ifmConfigured(): boolean {
  return Boolean(process.env.IFM_API_KEY?.trim());
}

export function ifmConfig(): { base: string; model: string; key: string } {
  const key = process.env.IFM_API_KEY?.trim() ?? "";
  if (!key) throw new Error("IFM_API_KEY is not set");
  return {
    key,
    base: (process.env.IFM_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, ""),
    model: process.env.IFM_MODEL?.trim() || DEFAULT_MODEL,
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionBody {
  messages: ChatMessage[];
  maxTokens: number;
  stream: boolean;
  sessionId?: string;
  responseFormat?: unknown;
}

function requestBody(config: { model: string }, body: CompletionBody): string {
  return JSON.stringify({
    model: config.model,
    messages: body.messages,
    temperature: 1,
    top_p: 0.95,
    max_tokens: body.maxTokens,
    stream: body.stream,
    // K2 Horizon reasons at high effort. low and medium are accepted and do not change it.
    chat_template_kwargs: { reasoning_effort: "high" },
    ...(body.responseFormat ? { response_format: body.responseFormat } : {}),
  });
}

export function publicIfmError(status: number): string {
  if (status === 401 || status === 403) return "The studio associate could not sign in.";
  if (status === 429) return "The studio associate is busy. Try again in a moment.";
  return "The studio associate is unavailable.";
}

/** Splits an OpenAI-style event stream. Incomplete lines stay in the buffer. */
export function appendSse(buffer: string, chunk: string): { buffer: string; data: string[] } {
  const text = buffer + chunk;
  const lines = text.split("\n");
  const rest = lines.pop() ?? "";
  const data: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) data.push(trimmed.slice(5).trim());
  }
  return { buffer: rest, data };
}

/** Content tokens only. Reasoning traces stay on the server. */
export function contentFromPayload(payload: string): { done: boolean; content: string } {
  if (!payload || payload === "[DONE]") return { done: true, content: "" };
  try {
    const json = JSON.parse(payload) as { choices?: { delta?: { content?: unknown } }[] };
    const content = json.choices?.[0]?.delta?.content;
    return { done: false, content: typeof content === "string" ? content : "" };
  } catch {
    return { done: false, content: "" };
  }
}

async function post(body: CompletionBody, signal?: AbortSignal): Promise<Response> {
  const config = ifmConfig();
  return fetch(`${config.base}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(body.sessionId ? { "X-Session-ID": body.sessionId } : {}),
    },
    body: requestBody(config, body),
  });
}

export async function streamContent(messages: ChatMessage[], sessionId: string | undefined, onToken: (delta: string) => void | Promise<void>, signal?: AbortSignal): Promise<string> {
  const response = await post({ messages, maxTokens: 4096, stream: true, sessionId }, signal);
  if (!response.ok || !response.body) throw new Error(publicIfmError(response.status));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const split = appendSse(buffer, decoder.decode(value, { stream: true }));
    buffer = split.buffer;
    for (const payload of split.data) {
      const token = contentFromPayload(payload);
      if (token.done) return full;
      if (!token.content) continue;
      full += token.content;
      await onToken(token.content);
    }
  }
  return full;
}

const SELECTION_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "selection",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        products: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              colorwayId: { type: "string" },
              size: { type: "string" },
              addToBag: { type: "boolean" },
            },
            required: ["id", "colorwayId", "size", "addToBag"],
          },
        },
        compareIds: { type: "array", items: { type: "string" } },
      },
      required: ["products", "compareIds"],
    },
  },
} as const;

export async function extractSelection(transcript: string, catalogue: string, signal?: AbortSignal): Promise<{ products: unknown[]; compareIds: unknown }> {
  const response = await post({
    maxTokens: 1024,
    stream: false,
    responseFormat: SELECTION_SCHEMA,
    messages: [
      {
        role: "system",
        content: `Extract the pieces discussed in the reply. Use only ids from the catalogue. addToBag is true only when the customer asked to put a piece in the bag. compareIds has exactly two product ids when they asked to compare, otherwise an empty array. size is the size they named, or an empty string.`,
      },
      { role: "user", content: `Catalogue:\n${catalogue}\n\nConversation:\n${transcript}` },
    ],
  }, signal);
  if (!response.ok) throw new Error(publicIfmError(response.status));
  const json = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string") return { products: [], compareIds: [] };
  const parsed = JSON.parse(content) as { products?: unknown; compareIds?: unknown };
  return {
    products: Array.isArray(parsed.products) ? parsed.products : [],
    compareIds: parsed.compareIds ?? [],
  };
}
