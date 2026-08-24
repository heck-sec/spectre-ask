# Spectre Ask

Minimal Lumino AI chat — **Ask anything**, auto-routed via **OpenRouter**.

## Stack

- Next.js 16 (App Router)
- Clerk auth (`@golumino.com`)
- OpenRouter only — classify + chat (Llama scout, Codestral, Claude Sonnet)
- Auto intent routing

## Dev

```bash
cp .env.example .env.local
# OPENROUTER_API_KEY required; Clerk keys for auth

pnpm install
pnpm dev
```

## Routing (Auto)

| Intent | OpenRouter model |
|--------|------------------|
| general | `meta-llama/llama-4-scout-17b-16e-instruct` |
| code | `mistralai/codestral-2508` |
| complex / review | `anthropic/claude-sonnet-4-5` |
| classify (internal) | `meta-llama/llama-3.1-8b-instruct` |

## Health

```bash
curl http://localhost:3000/api/health
```

## Repo

`~/HeckSec/Projects/spectre-ask`

Plans: `~/hecksec-plans/LUMINO/SPECTRE_ASK_GREENFIELD.md`
