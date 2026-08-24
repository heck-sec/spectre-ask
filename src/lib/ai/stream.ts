import type { ModelConfig, TaskIntent } from "./models";
import { routeMessage } from "./router";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function* streamOpenRouter(
  messages: ChatMessage[],
  config: ModelConfig,
  systemPrompt: string,
): AsyncGenerator<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL ?? "https://ask.hecksec.tech",
      "X-Title": "Spectre Ask",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: config.maxTokens,
      stream: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter API error ${res.status}: ${await res.text()}`);
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n").filter((l) => l.startsWith("data: "))) {
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        /* skip malformed chunk */
      }
    }
  }
}

export interface StreamMeta {
  intent: TaskIntent;
  model: ModelConfig;
}

export async function* streamChat(
  messages: ChatMessage[],
  systemPrompt: string,
  modelOverride?: string,
): AsyncGenerator<{ type: "meta"; meta: StreamMeta } | { type: "delta"; text: string }> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const { model, intent } = await routeMessage(lastUser, modelOverride);

  yield { type: "meta", meta: { intent, model } };

  for await (const text of streamOpenRouter(messages, model, systemPrompt)) {
    yield { type: "delta", text };
  }
}
