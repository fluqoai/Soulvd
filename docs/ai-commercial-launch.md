# Soulvd AI launch — 2026-09-18

This release supersedes earlier notes describing OpenRouter as deferred.

- Starter: 100 replies once after the first confirmed subscription payment, valid 12 months.
- Pro Growth: 1,000 replies per contract-anchored month, without rollover; annual payment never grants the whole year upfront.
- Add-ons: 1,000 replies / SAR 29 or 5,000 / SAR 99, 12 months from bank confirmation. Active platform subscription required to use them. Earliest expiry is consumed first.
- A valid generated draft or automatically admitted reply costs one reply. No charge for static replies, failed generation or AI handoff. WhatsApp delivery charges remain separate; a generated draft is chargeable even before a staff member sends it.
- Bank references remain globally unique across subscriptions, messaging wallets, integrations and AI. Customer submission alone grants nothing. Repeated confirmations are idempotent.
- RPCs are service-only, with explicit actor/tenant checks. New ledgers live in the private schema with RLS, never browser-writeable. Legacy ai_entitlements is retained for history, not consulted for new spending.
- Reservations are atomic with subscription, tenant daily and platform budget checks. Worker errors release customer credits once. Ambiguous provider costs retain the conservative $0.02 hold. Holds older than 5 minutes reconcile on the next tenant status/reservation request (draft/sent charged; unfinished/failed released).
- Initial platform provider budget: $20 cumulative and $2 per Riyadh calendar day. No automatic increase. The admin subscriptions page displays usage/holds. This excludes credit-purchase fees and is not the provider's account balance. No auto top-up is enabled by this release.
- Selected model: google/gemini-2.5-flash-lite. Enforced endpoint price caps: $0.10/M input, $0.40/M output. Reasoning off, output limited to 500 tokens, 20-second timeout, no SDK retries; no tools, image, audio or web-search generation. Provider data collection denied. Instructions <=4,000 chars, retrieved knowledge <=16,000, six recent messages <=1,500 each; bounded text input fits the conservative reservation.
- Environment variables are production-only on the canonical soulvd Vercel project. Secret is never in source, NEXT_PUBLIC variables or customer HTML.
- Synthetic live evaluation passed factual Arabic pricing, refusal to invent a booking, and instruction-override handling. These three examples are smoke checks, not a general guarantee of model accuracy; start customer flows in draft mode.

## Validation

`npm run test:platform` includes the AI billing suite. It checks paid-only grants, exact prices, replay protection, tenant isolation, reservations/refunds, crash recovery, budget caps, credit expiry and browser privilege denial. `scripts/verify-ai-transaction.mjs` repeats payment/grant/rollback checks on the real PostgreSQL project without persisting test payments. `scripts/verify-openrouter.mjs` makes three small synthetic provider requests only when explicitly run with a key.

Before admitting a first paid customer: verify YCloud subscription/onboarding and payment-launch readiness separately. No client account, transfer, bot activation or YCloud purchase is fabricated by this release.
