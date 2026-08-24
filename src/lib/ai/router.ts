import {
  CLASSIFIER_MODEL,
  getModelForIntent,
  MODELS,
  type ModelConfig,
  type TaskIntent,
} from "./models";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function openRouterHeaders(): HeadersInit {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer":
      process.env.NEXT_PUBLIC_APP_URL ?? "https://ask.hecksec.tech",
    "X-Title": "Spectre Ask",
  };
}

export function classifyIntentLocal(message: string): TaskIntent {
  const lower = message.toLowerCase();

  const hasWord = (words: string[]) =>
    words.some((w) => {
      if (w.includes(" ") || w.includes("`")) return lower.includes(w);
      return new RegExp(`\\b${w}\\b`).test(lower);
    });

  const visionSignals = [
    "image", "screenshot", "photo", "picture", "ocr", "describe this",
    "what do you see", "vision", "attached image", "look at",
  ];
  const codeSignals = [
    "write code", "function", "implement", "refactor", "debug", "typescript",
    "python", "javascript", "react", "api", "component", "```",
  ];
  const reviewSignals = ["review", "diff", "pull request", "lgtm"];
  const complexSignals = [
    "architect", "trade-off", "compare", "analyze", "strategy", "plan",
    "best practice", "explain in depth",
  ];

  if (hasWord(visionSignals)) return "vision";
  if (hasWord(reviewSignals)) return "review";
  if (hasWord(complexSignals)) return "complex";
  if (hasWord(codeSignals)) return "code";
  return "general";
}

export async function classifyIntentAI(message: string): Promise<TaskIntent> {
  if (!process.env.OPENROUTER_API_KEY) {
    return classifyIntentLocal(message);
  }

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        max_tokens: 16,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Classify the user message into exactly one label: code, review, complex, vision, general. Reply with only that word.",
          },
          { role: "user", content: message.slice(0, 2000) },
        ],
      }),
    });
    if (!res.ok) return classifyIntentLocal(message);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = (data.choices?.[0]?.message?.content ?? "").trim().toLowerCase();
    const valid: TaskIntent[] = ["code", "review", "complex", "vision", "general"];
    if (valid.includes(reply as TaskIntent)) return reply as TaskIntent;
    return classifyIntentLocal(message);
  } catch {
    return classifyIntentLocal(message);
  }
}

export async function routeMessage(
  message: string,
  override?: string,
): Promise<{ model: ModelConfig; intent: TaskIntent }> {
  if (override && override !== "auto") {
    const m =
      MODELS[override] ??
      Object.values(MODELS).find((x) => x.displayName === override);
    if (m) return { model: m, intent: "general" };
  }

  const intent = await classifyIntentAI(message);
  return { model: getModelForIntent(intent), intent };
}

export { MODELS };
