# Spectre Ask

Minimal Lumino AI chat — **Ask anything**, auto-routed via **OpenRouter**.

Also the home of the **project & secrets manager** workspace packages (Vault core / access contract / API / CLI).

## Stack

- Next.js 16 (App Router) — app stays at repo root
- Clerk auth (`@golumino.com`)
- OpenRouter only — classify + chat
- pnpm workspace packages under `packages/`

## Packages

| Package | Role |
|---------|------|
| `@spectre-ask/access-contract` | `TenantAccessEntry` + zod — Clerk metadata contract |
| `@spectre-ask/vault-core` | Framework-free engine: resolve, decrypt-gate, StorageAdapter |
| `@spectre-ask/vault-api` | Thin helpers for Next routes (Clerk stays in the app) |
| `@spectre-ask/vault-cli` | `spectre-vault` CLI (sqlite / demos) |

Entitlement resolve order: **defaults → tier → grant overrides → parent/tenant ceiling** (`rank` is UI-only). Feature entitlement ≠ decrypt.

Migration (Supabase Postgres): `supabase/migrations/20260831_access_tiers_and_features.sql`

Plan: `_HECKSEC/_DOCS/_PLANS/LUMINO/SPECTRE_ASK_V1/SECRETS_AND_ACCESS_TIERS_PLAN.md`

## Dev

```bash
cp .env.example .env.local
# OPENROUTER_API_KEY required; Clerk keys for auth

pnpm install
pnpm build:packages
pnpm --filter @spectre-ask/vault-core test
pnpm --filter @spectre-ask/vault-cli start -- features-demo
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
