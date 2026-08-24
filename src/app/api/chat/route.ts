import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { streamChat, type ChatMessage } from "@/lib/ai/stream";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const bodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(100_000),
    }),
  ),
  modelOverride: z.string().optional(),
  project: z.string().optional(),
});

function buildSystemPrompt(opts: {
  name?: string | null;
  email?: string | null;
  project?: string;
}): string {
  const lines = [
    "You are Spectre, Lumino's AI assistant. Be clear, helpful, and concise.",
    "You answer questions across product, engineering, and business topics.",
  ];
  if (opts.name) lines.push(`The user's name is ${opts.name}.`);
  if (opts.email) lines.push(`Their email is ${opts.email}.`);
  if (opts.project) lines.push(`Current project context: ${opts.project}.`);
  return lines.join("\n");
}

export async function POST(req: Request) {
  let userId: string | null = "dev-local";
  let userName: string | null = "Developer";
  let userEmail: string | null = null;

  if (clerkEnabled) {
    const session = await auth();
    userId = session.userId;
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const user = await currentUser();
    userName = user?.fullName ?? user?.firstName ?? null;
    userEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response("OPENROUTER_API_KEY not configured", { status: 503 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const systemPrompt = buildSystemPrompt({
    name: userName,
    email: userEmail,
    project: body.project,
  });

  const messages: ChatMessage[] = body.messages;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        for await (const chunk of streamChat(
          messages,
          systemPrompt,
          body.modelOverride,
        )) {
          send(chunk);
        }
        send({ type: "done" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream failed";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
