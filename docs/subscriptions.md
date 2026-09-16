# Soulvd subscriptions — implementation status

## Product rules

- Starter: SAR 299/month; 2,000 distinct customers per subscription cycle,
  one WhatsApp number, two seats including the owner, ten pending/approved
  templates, one non-archived automation flow, no merchant API access.
- Pro Growth: SAR 399/month; 10,000 distinct customers, one number, unlimited
  seats/templates/flows, merchant API entitlement. Display “موصى بها”.
- A conversation quota unit is one canonical customer identity per tenant
  and subscription cycle. It is not a Meta billing conversation or a count
  of outbound messages. Contact identity must be normalized by the trusted
  provider worker (including BSUID identity reconciliation when applicable).
- Existing customers remain serviceable at the quota cap. New customers
  consume one unit. A new billing period counts customers again.
- Meta message costs are separate from the platform subscription. This does
  not promise unlimited free WhatsApp messages or unlimited provider capacity.
- Invitations reserve seats until accepted, revoked or expired. The owner
  occupies a seat. Template approval submissions reserve capacity too.

## Delivered foundation

`20260916084850_merchant_subscriptions.sql` creates tenant membership,
versioned plan definitions, current subscriptions, change history, resource
tables and quota ledger. New Auth registrations become `merchant`, while
existing `owner` and `editor` roles remain unchanged. Merchant login opens
`/app`; CMS access continues to require the internal staff roles.

All new tables have RLS. Merchants have read access only to their tenants;
provider identifiers and the customer quota ledger are in `soulvd_private`.
The private membership helper is a narrow definer function with an empty
search path and explicit permissions. Mutation RPCs are invoker functions
executable only by the service role. Browser clients cannot consume quota,
alter a plan, spoof payment, create resources, or edit memberships directly.

Quota admission locks the tenant subscription for a short transaction and
checks the customer ledger before incrementing. This intentionally uses a
row lock; it does not claim lock-free exact quotas. Provider calls must never
run inside this transaction. Resource admissions and upgrades use the same
lock. Add plan versions instead of changing an existing published version.

Merchant pages: overview, onboarding, billing, upgrade comparison and team.
The usage widget warns at 80%, persists dismissals by user/resource/cycle,
and refreshes every 30 seconds while visible. At 100% it describes the
appropriate restriction. Pro users see support rather than an unavailable
higher plan. Onboarding creates a **pending**, not paid, subscription.
Starter seat-limit responses open an accessible native upgrade dialog.
The auth proxy refreshes session cookies on app/admin/login surfaces while
preserving locale rewrites; merchant mutations still verify the user server-side.
Invitations currently reserve a seat; the UI explicitly states that email
delivery is not enabled yet. No unsolicited emails are sent.

`soulvd_apply_paid_upgrade` is a payment-verified-worker primitive, not an
exposed checkout endpoint. It is idempotent by payment reference and keeps
usage and cycle dates. The current upgrade page directs the owner to contact
support; it does not pretend checkout has been connected.

## Deployment record

On 2026-09-16 the migration's equivalent SQL was applied through the SQL
Editor of the verified Soulvd production project `lyvoiipsmcbffvpkrxhy`.
It was not applied to the unrelated project returned by this session's MCP.
The production schema and role constraint were checked before applying.
Post-application queries confirmed both prices/quotas, RLS on every new table,
and that authenticated users cannot execute quota/payment mutation RPCs.
A production smoke test of new/repeated customer admission, exact quota cap,
continued service at the cap and seat reservations ran inside a transaction
that was rolled back, leaving no test tenants or plans.
The migration is not idempotent: do not rerun it on an already migrated DB.
It has not been registered in Supabase CLI migration history; the repository's
older migrations also use dashboard/manual application. Reconcile migration
history before switching this project to automated `db push`.

Application changes are included in the subscription foundation commit.
Production deployment status must be checked separately from Git push status.

On 2026-09-16 a read-only YCloud phone-number API probe with the user-supplied
credential succeeded and returned zero registered numbers. This verifies API
authentication only, not Embedded Signup, sending, receiving or webhook delivery.
The credential is not stored in source files or Git.

## Remaining integration work

Direct Meta Cloud API is now the selected implementation path. See
`docs/meta-cloud-api.md` for delivered inbox/outbox/template code, sandbox setup
and the exact remaining activation gates. Earlier YCloud partner assumptions
below are historical and are not the current commercial basis.

1. Configure the verified YCloud Tech Partner account, provider API key and
   webhook signing secret through server-side deployment environment settings.
   Confirm multi-merchant WABA onboarding and actual Meta consent branding.
2. Build verified Embedded Signup, contacts/identity reconciliation, durable
   webhook inbox, message outbox, inbox UI, campaigns and actual template/flow
   execution. Verify HMAC on raw webhook bytes, timestamp tolerance and event
   deduplication. Durably persist the event before responding 2xx.
3. Couple new-customer admission to durable inbound/outbound work. The current
   ledger records customer admission; it is not an outbound delivery receipt.
   Do not expose the primitive as a generic browser/server action. A failed
   message must not lead to duplicate customer counting or unsafe refunds of
   a unit shared by other messages. Never discard inbound messages at the cap;
   persist them and restrict the appropriate new-customer workflow.
4. Enforce distributed sending rate limits, consent, wallet balance and Meta's
   messaging window independently of the conversation quota. The existing
   in-memory contact-form rate limiter is not a production sending limiter.
5. Connect a real merchant checkout and verified payment webhook; validate
   event signature, merchant/order, amount, currency and paid state before
   activation/upgrade. Pending activation starts the cycle at confirmation.
   Add payment orders, initial activation, renewal, cancellation, scheduled
   downgrade, and a documented overdue policy. No gateway has been selected.
6. Add secure invitation delivery/acceptance, merchant registration with email
   verification, tenant switching, and real API keys/outbound webhooks with
   entitlement checks at every endpoint. API entitlement is implemented;
   a merchant API itself is not implemented yet.
7. Finish library/Salla/Zid integration and support operations before marketing
   those features as available. Extend upgrade dialogs to other metered actions
   once those actions exist.

## Verification

- `npm run test:subscriptions`: real PostgreSQL engine via PGlite for quota,
  rollover, tenant RLS, invitations, template admission, role isolation,
  upgrade idempotency and RPC permissions.
- PGlite queues concurrent requests; multi-connection PostgreSQL stress
  validation is still required before enabling high-volume provider traffic.
- `npx tsc --noEmit` and `npm run build` verify application integration.
- Full-repository lint has pre-existing failures; lint the changed files
  separately and do not report the entire repository as clean.
- Authenticated browser verification requires local Supabase URL/client key
  and service role configuration; do not put secrets in fixtures or commits.
