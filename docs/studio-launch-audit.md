# Templates, automation, AI and integration audit — 2026-09-18

## Changes

- Template drafts now sit alongside actual submitted/approved template statuses, with provider refresh and a variable-substituted preview. The twenty original library templates remain suggestions that require Meta approval.
- Arabic keyword matching handles diacritics, tatweel and common alef variants. The editor accepts Arabic/English commas. Only active rules execute, in deterministic priority order.
- Automation admission refuses an obsolete reply after a newer customer message or staff reply, including manually approved drafts. Human takeover and disabled-flow checks remain in place.
- Missing knowledge no longer consumes an AI allowance. Unavailable AI, exhausted allowance or a provider error hands the conversation to staff and pauses its bot. No generated response is sent in those cases.
- Managers can see their remaining AI allowance. Activating an AI rule requires provider readiness, an available allowance and knowledge. This release does not enable OpenRouter, choose a model, create an entitlement or charge for AI.
- Active integrations have a rate-limited, deduplicated `integration.test` event button. It sends no customer data and uses the normal durable HMAC-signed webhook pipeline. Delivery status is refreshed in the UI, including destination and HTTP result.
- API callers receive a specific insufficient-wallet error instead of a generic failure. Unexpected database errors remain private. Manual draft admission remains successful if the immediate worker is temporarily unavailable; the scheduler recovers the committed job.

## Clinic acceptance boundary

Soulvd supplies messaging APIs and signed events. It does not have a prebuilt connector for every clinic application. The integration page now explains the actual process: identify the system/API, verify webhook signatures and deduplicate events, authenticate the patient's access within the external system, obtain availability from that system, confirm only a successful booking, then reply through Soulvd.

The generic knowledge bot does not read clinical records, query an external database or execute bookings. Static appointment recipes request staff confirmation. For a real adapter we still need the product/API documentation, sandbox credentials through a secure channel, approved field mapping and a round-trip test. The 100 SAR destination activation fee is not a promise that unlimited custom connector development is included.

## Validation

- All nine platform test suites pass, including twenty template schemas, cross-tenant isolation, consent, quota enforcement, wallet reservations and campaign admission.
- New tests cover obsolete appointment drafts, Arabic matching, synthetic event deduplication, disabled integration denial, private allowance status, missing-knowledge quota protection and AI failure handoff.
- The actual delivery worker is exercised with mocked transport for a valid HMAC signature, 2xx success, retryable timeout/429/5xx and terminal 4xx/fifth attempts. No external clinic is contacted.
- Production build and changed-file ESLint pass.
- `scripts/verify-studio-transaction.mjs` passes on the real Soulvd PostgreSQL project and rolls back every fixture. No real payment, entitlement, external message or patient record is created.

## Before inviting paying customers

1. Activate the agreed YCloud service and verify a separate authorized merchant onboarding, then one inbound/reply and one approved-template delivery in that tenant.
2. Set up OpenRouter and paid/budgeted allowances, then evaluate responses if AI is included in the launch offer. Until then present AI as preparation, not an active included service.
3. Test each customer's external connector against that customer's actual system before promising live appointments or data access.
4. Enable payment/onboarding launch flags only after those relevant acceptance steps. This release preserves the existing flags and reviewer workspace.
