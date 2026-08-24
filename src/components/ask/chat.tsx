"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { SELECTABLE_MODELS } from "@/lib/ai/models";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: { intent: string; model: string };
}

const SUGGESTIONS = [
  "What is Lumino Rewards in one paragraph?",
  "Write a TypeScript function to sum reward points.",
  "Compare merchant portal vs partner portal tradeoffs.",
];

const PROJECTS = ["Global", "Lumino Rewards", "Merchant Portal", "Residuals"];

export function AskChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState("Global");
  const [modelOverride, setModelOverride] = useState("auto");
  const [routeMeta, setRouteMeta] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setLoading(true);
      setRouteMeta(null);
      scrollDown();

      const assistantId = crypto.randomUUID();
      let assistantText = "";
      let streamMeta: { intent: string; model: string } | undefined;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next.map((m) => ({ role: m.role, content: m.content })),
            project: project === "Global" ? undefined : project,
            modelOverride: modelOverride === "auto" ? undefined : modelOverride,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No stream");

        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "" },
        ]);

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            const payload = JSON.parse(line.slice(6)) as {
              type: string;
              meta?: { intent: string; model: { displayName: string } };
              text?: string;
              message?: string;
            };

            if (payload.type === "meta" && payload.meta) {
              const label = `${payload.meta.intent} → ${payload.meta.model.displayName}`;
              streamMeta = {
                intent: payload.meta.intent,
                model: payload.meta.model.displayName,
              };
              setRouteMeta(label);
            }
            if (payload.type === "delta" && payload.text) {
              assistantText += payload.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantText } : m,
                ),
              );
              scrollDown();
            }
            if (payload.type === "error") {
              throw new Error(payload.message ?? "Stream error");
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: assistantText, meta: streamMeta }
              : m,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send";
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== assistantId),
          { id: assistantId, role: "assistant", content: `Error: ${msg}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, project, modelOverride, scrollDown],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 pt-16 text-center">
            <div className="flex items-center gap-2 text-violet-400">
              <Sparkles className="h-6 w-6" />
              <span className="text-sm font-medium uppercase tracking-widest">
                Spectre Beta
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
              Ask Spectre anything
            </h1>
            <p className="max-w-md text-sm text-zinc-400">
              Auto-routes to the best model for your question. No setup required.
            </p>
            <div className="flex w-full max-w-lg flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-violet-500/40 hover:bg-zinc-900"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-violet-600/20 px-4 py-3 text-sm text-zinc-100"
                    : "max-w-[95%] text-sm leading-relaxed text-zinc-200"
                }
              >
                {m.role === "assistant" && m.meta && (
                  <div className="mb-2 inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                    Auto · {m.meta.intent} → {m.meta.model}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {routeMeta ? `Routing: ${routeMeta}` : "Thinking…"}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 bg-zinc-950/80 px-4 py-4 backdrop-blur md:px-8">
        <form
          className="mx-auto flex max-w-3xl flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <label htmlFor="project" className="sr-only">
              Project
            </label>
            <select
              id="project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-300"
            >
              {PROJECTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <label htmlFor="model" className="sr-only">
              Model
            </label>
            <select
              id="model"
              value={modelOverride}
              onChange={(e) => setModelOverride(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-300"
              title="Auto uses Model Matrix; pick Gemini for images"
            >
              {SELECTABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="font-mono text-zinc-600">
              {modelOverride === "auto" ? "Matrix · Gemini 1st for vision" : "Pinned"}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Spectre anything…"
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-40"
              aria-label="Send"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
