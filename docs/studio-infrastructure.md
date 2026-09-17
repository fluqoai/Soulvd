# Soulvd automation, templates and CRM infrastructure

Implementation date: 2026-09-17. No merchants are enrolled, no real payments are recorded, and no automatic flow is enabled by this change.

## Product surfaces

- `/app/automations`: priority-based keyword/catch-all rules; fixed replies, AI replies and human handoff; draft approval or automatic mode; tenant knowledge; per-contact pause; daily AI request ceiling; cooldown; execution history with the original message.
- `/app/templates`: 20 original Arabic text templates for orders, delivery, returns, bookings, invoices, subscriptions, service/support and offers. The library requires an active Pro Growth subscription. Owners/admins can create their own templates, paste authorized text, customize a library copy, save drafts and submit to Meta. Positional text variables `{{1}}`–`{{10}}` require examples. These are suggestions, not pre-approved Meta templates. Media, buttons, named parameters and authentication templates are not implemented.
- `/app/integrations`: a paid tenant API and signed webhook endpoint. Pro Growth required. The 100 SAR charge is treated as one-time per destination, pending commercial confirmation. Registering the same endpoint again returns the existing request. Endpoints are immutable; replacing one creates a separate request.
- `/admin/subscriptions`: platform owner reviews technical feasibility and confirms an actual 100 SAR bank transfer. The reference is unique across subscription, upgrade and integration payments. Test workspaces cannot record payments. Merchants then generate/revoke credentials. No transfer is assumed paid.

The CRM capability is a generic integration contract. An arbitrary CRM still needs an available API/webhook receiver, field mapping and a tested adapter. There are no prebuilt Salesforce/HubSpot/Zapier adapters in this change and no guarantee that any closed system can be integrated for 100 SAR.

## Data and execution

Apply in order, after the existing manual-bank-transfer migration:

1. `20260917181416_automation_integrations_templates.sql`
2. `20260917181430_automation_integrations_templates.sql`

Both files are transactional. New tables use RLS for tenant reads; browser roles cannot write them or call service RPCs. Membership/role/active subscription/plan checks happen again inside the write functions. AI, keys, encrypted signing secrets and provider credentials stay on the server.

Provider ingestion and queue creation commit together. Provider message uniqueness prevents duplicate automation runs. Claims serialize briefly per worker admission and use `SKIP LOCKED`; only one run for a contact is processed at a time. Failed or interrupted AI runs are not regenerated automatically. Sending uses the existing idempotent provider job queue and quota/24-hour gates. A human response after the triggering message, disabling a flow, or pausing the contact prevents an in-flight automatic send. Stop requests also opt the contact out of marketing templates. All bots default off; rules default to draft/review mode.

AI retrieval ranks chunks from the selected tenant's knowledge by lexical overlap, then includes at most 16,000 characters plus six recent messages. This is bounded text retrieval, not vector search. No tools can execute transactions or access another tenant. Lack of information or model handoff output routes to staff. Prompt instructions are guidance, not a guarantee of factual accuracy; validate real responses before enabling automatic AI replies.

## AI configuration

Server-only Vercel environment variables:

| Variable | Value |
| --- | --- |
| `SOULVD_AI_ENABLED` | `true` only after provider setup and testing |
| `SOULVD_AI_MODEL` | A current AI Gateway `provider/model` identifier chosen after checking the provider catalog |
| `AI_GATEWAY_API_KEY` | Funded/scoped server key, never a `NEXT_PUBLIC_` variable |

Default tenant limit: 20 requests/day, configurable 1–100. Max generation: 500 output tokens, 20-second timeout, no automatic provider retries. Each reserved generation counts against the daily ceiling even when the provider fails, so failures cannot bypass the spending guard. Model usage tokens are recorded. There is no automatic customer AI charge or AI wallet in this change; provider spend needs an account budget and a commercial policy before broad rollout.

The existing `META_TOKEN_ENCRYPTION_KEY`, provider webhook secrets, provider credentials, Supabase service credentials and `META_WORKER_SECRET` remain required. Do not rotate them as part of this deployment.

## Durable scheduler

`after()` starts background work after a valid webhook is persisted. It is an accelerator, not a replacement for recovery scheduling.

Store the existing `META_WORKER_SECRET` securely in Supabase Vault as `soulvd_worker_secret`, then apply `supabase/operations/studio-worker-schedule.sql`. The job calls the fixed Soulvd worker URL once per minute **only when a queue has work**. It processes independent automation, delivery and provider jobs concurrently within a 60-second function budget. Vault content is never embedded in the cron command. Enablement must be checked in the actual project, not inferred from this file. The cleanup job removes only expired API rate-limit counters.

Verify cron history and `net._http_response` HTTP status without printing authorization headers or Vault secrets. A successful cron SQL call only means the HTTP request was enqueued; require an HTTP 200 response too. Follow the [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart), [pg_net documentation](https://supabase.com/docs/guides/database/extensions/pg_net) and [Vault documentation](https://supabase.com/docs/guides/database/vault).

Webhook retry schedule uses exponential backoff, at most five attempts, for network failures, 429 and 5xx. Requests use HTTPS port 443, a public DNS A record pinned to the TLS request, a bounded timeout and no redirects. Private, loopback, link-local and reserved addresses are blocked. Signing covers `timestamp.rawBody` with HMAC-SHA256. Receivers must check timestamp freshness and deduplicate the event ID.

## API contract

All routes require `Authorization: Bearer slv_…`; credentials expire after 90 days and are scoped to one paid, active Pro tenant. Revocation/downgrade/expiry disables access. Limit: 60 requests/minute per integration, with the existing stricter send-job admission limit still applying.

- `POST /api/v1/messages`: UUID `Idempotency-Key`; `{to,body}` for an open text window, or `{to,templateId,parameters,consent}` for an approved template. `202` returns message `id` and `jobId`, not proof of delivery. Use the same key when the response is uncertain; a changed payload with the same key is rejected.
- `GET /api/v1/messages?id=<message UUID>`: tenant-scoped status.
- `GET /api/v1/messages?cursor=<nextCursor>`: up to 100 records, ordered by timestamp and ID to avoid losing records with equal timestamps.
- `GET /api/v1/templates`: up to 100 approved templates with IDs and parameter counts.
- Events: `message.received`, `message.accepted`, `message.sent`, `message.delivered`, `message.read`, `message.failed`, `message.unknown`. The event's `message.id` matches the message identifier returned by the send API.

API and webhook keys are separate from YCloud/Meta keys. API keys are hashed; signing secrets are encrypted. Keys are shown once in the authenticated manager UI and are never placed in browser storage.

## Validation and release status

Local PostgreSQL-compatible PGlite integration tests exercise all six feature migrations: tenant isolation, RPC grants, flow caps, duplicate events, draft approval, human takeover, AI ceilings, template parameters, marketing opt-out, payment amounts, bank reference reuse, key revocation, rate limits and recovery claims. The actual worker is exercised with a mocked AI/provider boundary; tests do not send live messages or consume paid AI tokens. Existing subscription, bank transfer, Meta and YCloud regression suites pass. PGlite serializes queries; multi-connection load behavior still needs a real PostgreSQL load test before large-volume rollout.

`npm run build -- --webpack`, TypeScript and scoped ESLint are required before deployment. Browser visual QA and real-provider AI/CRM delivery are separate acceptance steps.

At preparation time, the browser connection failed and the connected Supabase app belongs to a different account. Production migrations and the scheduler have **not** been applied. Keep this change on its feature branch until access to project `lyvoiipsmcbffvpkrxhy` is restored, apply migrations, then deploy and verify the three product pages in the actual owner test workspace. Existing production is not upgraded by merely committing this branch.

Production acceptance: verify Starter cannot access the library/API; Pro can save a library copy; create one keyword rule in **draft mode** in the dedicated test space and trigger it with a fresh controlled inbound message; approve a test reply deliberately; validate one signed webhook against an owned test receiver; configure AI and check grounding/handoff/budget boundaries. No customer enrollment or real payment fabrication is needed.
