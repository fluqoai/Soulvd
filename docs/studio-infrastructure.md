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
3. `20260917201633_openrouter_ai_entitlements.sql`

All files are transactional. New public tables use RLS for tenant reads; browser roles cannot write them or call service RPCs. Private tables have no browser access. Membership/role/active subscription/plan checks happen again inside the write functions. AI, keys, encrypted signing secrets and provider credentials stay on the server.

Provider ingestion and queue creation commit together. Provider message uniqueness prevents duplicate automation runs. Claims serialize briefly per worker admission and use `SKIP LOCKED`; only one run for a contact is processed at a time. Failed or interrupted AI runs are not regenerated automatically. Sending uses the existing idempotent provider job queue and quota/24-hour gates. A human response after the triggering message, disabling a flow, or pausing the contact prevents an in-flight automatic send. Stop requests also opt the contact out of marketing templates. All bots default off; rules default to draft/review mode.

AI retrieval ranks chunks from the selected tenant's knowledge by lexical overlap, then includes at most 16,000 characters plus six recent messages. This is bounded text retrieval, not vector search. No tools can execute transactions or access another tenant. Lack of information or model handoff output routes to staff. Prompt instructions are guidance, not a guarantee of factual accuracy; validate real responses before enabling automatic AI replies.

## AI configuration

OpenRouter is the selected provider for a later rollout. No provider account is connected and no model is chosen yet. The adapter uses the official [OpenRouter AI SDK provider](https://github.com/OpenRouterTeam/ai-sdk-provider), pinned to the release compatible with the installed AI SDK. Server-only Vercel environment variables:

| Variable | Value |
| --- | --- |
| `SOULVD_AI_ENABLED` | `true` only after provider setup and testing |
| `SOULVD_AI_MODEL` | A current OpenRouter `provider/model` identifier selected after checking price and quality |
| `OPENROUTER_API_KEY` | A budget-limited server key, never a `NEXT_PUBLIC_` variable |

Enabling the provider alone never grants AI usage. The private `ai_entitlements` table starts empty. Every generation atomically checks the active platform subscription, an enabled/unexpired allowance with remaining requests, the tenant's daily ceiling and a previously unreserved processing run. Browser roles cannot access allowances; even the application's service role cannot insert grants. No customer-facing or admin issuance flow is exposed until billing is designed. A platform subscription or changing the daily setting cannot grant additional AI requests.

Default daily ceiling: 20 requests/day, configurable 1–100, always capped by the separate platform allowance. Max generation: 500 output tokens, 20-second timeout, no automatic provider retries. A run reserves allowance at most once; failures still consume the reservation. Model usage tokens are recorded. The allowance is an admission control, **not** completed payment processing or a monetary spending cap. Before issuing any allowance, agree on AI pricing/margins, connect verified payments to grants, set provider-key budgets, pick a model and validate its costs. No AI price or included customer quota has been promised, and no grant or payment was created by this release.

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

Local PostgreSQL-compatible PGlite integration tests exercise all seven feature migrations: tenant isolation, RPC grants, flow caps, duplicate events, draft approval, human takeover, AI allowance expiry/exhaustion, blocked grant issuance, one reservation per run, daily ceilings, template parameters, marketing opt-out, payment amounts, bank reference reuse, key revocation, rate limits and recovery claims. The actual worker uses a real OpenRouter provider instance with a mocked generation boundary; the tests verify no provider call without allowance. Tests do not send live messages or consume paid AI tokens. Existing subscription, bank transfer, Meta and YCloud regression suites pass. PGlite serializes queries; multi-connection load behavior still needs a real PostgreSQL load test before large-volume rollout.

`npm run build -- --webpack`, TypeScript and scoped ESLint are required before deployment. Browser visual QA and real-provider AI/CRM delivery are separate acceptance steps.

Released on 2026-09-17 (UTC): the studio migrations and scheduler were applied to the verified Soulvd project `lyvoiipsmcbffvpkrxhy` through the Supabase Management API. The existing worker credential was stored in Vault without rotation. Commit `a405604` was deployed successfully to both Vercel production projects (`soulvd` and `soulvdsa`) through `main`. The OpenRouter/allowance follow-up migration was also applied and verified on the same project, with zero grants issued. The database has no migration-history table because previous changes were applied manually; these files were executed directly. Do not run an unreviewed baseline `db push` against it.

Live verification completed:

- A real PostgreSQL transaction under `service_role` verified the Starter flow cap, durable message-to-run trigger, worker claim, daily AI quota and unpaid CRM credential blocking. All fixtures and temporary plan changes were rolled back.
- After the allowance migration, a separate live transaction verified denial without a grant, one reservation for a temporary valid grant, and rejection of a duplicate reservation. It was rolled back. The entitlement table remains empty; browser reads and application grant insertion are denied.
- In the owner's existing test workspace, a temporary keyword rule in **draft mode** processed one synthetic database message through the deployed worker, called by the actual Vault/pg_net scheduler function. The expected Arabic draft was persisted and the HTTP response was 200. There were zero outgoing WhatsApp messages. The temporary message, contact, flow, run and bot settings were removed afterwards.
- Both cron jobs are active and the worker cron has successful executions. Automation/provider queues are empty and bots remain off after verification.
- The three product routes return the expected streamed login redirect for unauthenticated requests. The two read API routes return 401 without credentials; the worker returns 403 without its secret.
- Security advisors reported no ERROR findings. The new private credential/rate-counter tables have the intentional RLS-with-no-browser-policy INFO findings. Existing WARN findings concern legacy role/trigger functions and Auth leaked-password protection; this release does not change those unrelated settings.

Remaining acceptance: the embedded browser now works. The deployed merchant overview, navigation, inbox, template disclosure and readiness round were checked in the owner's test workspace; see `platform-acceptance.md` for evidence and viewport limitations. Existing real inbound and delivered outbound messages are visible, but the complete new automation/template/CRM round remains to be run. AI credentials/model are not configured, so real AI responses and spending remain disabled. Validate signed webhook delivery against the eventual customer's owned receiver; configure AI only after pricing and budgets are agreed, then check grounding, handoff and spending boundaries. These steps require no customer enrollment or fabricated payment. The generic CRM contract still needs the customer's field mapping and an adapter for its specific system.
