export type TaskIntent =
  | "code"
  | "review"
  | "general"
  | "complex"
  | "fun"
  | "title"
  | "classify"
  | "vision";

/** All models route through OpenRouter — one key for classify + chat + vision. */
export type Provider = "openrouter";

export interface ModelConfig {
  provider: Provider;
  model: string;
  displayName: string;
  maxTokens: number;
  description: string;
  supportsVision?: boolean;
}

/** OpenRouter model slugs — see https://openrouter.ai/models */
export const MODELS: Record<string, ModelConfig> = {
  "or-classifier": {
    provider: "openrouter",
    model: "meta-llama/llama-3.1-8b-instruct",
    displayName: "llama-3.1-8b",
    maxTokens: 16,
    description: "Intent classification (internal)",
  },
  "or-scout": {
    provider: "openrouter",
    model: "meta-llama/llama-4-scout",
    displayName: "llama-4-scout",
    maxTokens: 8192,
    description: "Fast general chat",
  },
  codestral: {
    provider: "openrouter",
    model: "mistralai/codestral-2508",
    displayName: "codestral",
    maxTokens: 8192,
    description: "Code generation",
  },
  sonnet: {
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4-5",
    displayName: "sonnet-4.6",
    maxTokens: 8192,
    description: "Complex reasoning and review",
    supportsVision: true,
  },
  /** Vision — Gemini first (personal Model Matrix preference) */
  "gemini-flash": {
    provider: "openrouter",
    model: "google/gemini-2.5-flash",
    displayName: "gemini-2.5-flash",
    maxTokens: 8192,
    description: "Vision / images — preferred",
    supportsVision: true,
  },
  "gemini-flash-lite": {
    provider: "openrouter",
    model: "google/gemini-2.5-flash-lite",
    displayName: "gemini-2.5-flash-lite",
    maxTokens: 8192,
    description: "Fast cheap vision",
    supportsVision: true,
  },
  "gemini-pro": {
    provider: "openrouter",
    model: "google/gemini-2.5-pro-preview",
    displayName: "gemini-2.5-pro",
    maxTokens: 8192,
    description: "Strong multimodal",
    supportsVision: true,
  },
  haiku: {
    provider: "openrouter",
    model: "anthropic/claude-haiku-4-5",
    displayName: "haiku-4.5",
    maxTokens: 8192,
    description: "Fast Anthropic (vision capable)",
    supportsVision: true,
  },
};

/** Preference order for image/vision tasks — Gemini first, then Claude. */
export const VISION_MODEL_ORDER = [
  "gemini-flash",
  "gemini-flash-lite",
  "gemini-pro",
  "sonnet",
  "haiku",
] as const;

const INTENT_ROUTING: Record<TaskIntent, string> = {
  code: "codestral",
  review: "sonnet",
  general: "or-scout",
  complex: "sonnet",
  fun: "or-scout",
  title: "or-classifier",
  classify: "or-classifier",
  vision: "gemini-flash",
};

export function getModelForIntent(intent: TaskIntent): ModelConfig {
  const key = INTENT_ROUTING[intent];
  return MODELS[key] ?? MODELS["or-scout"];
}

export function getVisionModel(override?: string): ModelConfig {
  if (override && MODELS[override]?.supportsVision) {
    return MODELS[override];
  }
  for (const key of VISION_MODEL_ORDER) {
    if (MODELS[key]) return MODELS[key];
  }
  return MODELS["gemini-flash"];
}

/** Models the user can pin in the Ask UI (Auto + explicit picks). */
export const SELECTABLE_MODELS: { id: string; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "gemini-flash", label: "Gemini Flash (vision)" },
  { id: "gemini-pro", label: "Gemini Pro (vision)" },
  { id: "sonnet", label: "Claude Sonnet" },
  { id: "codestral", label: "Codestral (code)" },
  { id: "or-scout", label: "Llama Scout (fast)" },
  { id: "haiku", label: "Claude Haiku" },
];

export const CLASSIFIER_MODEL = MODELS["or-classifier"].model;
