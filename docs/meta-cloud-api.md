# Direct Meta Cloud API — implementation and activation

## What is implemented

Soulvd calls Meta Graph API directly. YCloud credentials are not used.
Merchant inbox, plain text replies, body-only Arabic/English templates,
template refresh, subscription/customer quota admission, opt-in confirmation,
and owner-only Embedded Signup completion are under `/app/whatsapp`.
Template creation/refresh is owner/admin only. Internal WhatsApp transport is
available to both plans; this does not expose a merchant API to Starter users.

`POST /api/meta/whatsapp/webhook` verifies `X-Hub-Signature-256` on the original
JSON bytes, bounds the body to 1 MiB, and commits the raw event, inbox updates
and receipts in one RPC before acknowledging. Unknown numbers are retained in
the private event ledger without routing them to a tenant. Unsupported media
is represented by its type in the inbox; downloads are not implemented.
Unsupported customer identities are retained for reconciliation, not discarded.
There is no invented timestamp signature requirement: Meta uses HMAC, and
replay protection is event/message deduplication. Receipts cannot regress from
read/delivered to sent. Receipts arriving before the send response are reconciled
using an indexed table rather than scanning the entire event archive.

Durable jobs reserve quota and resources before network calls. Claim is service
role only, once per job, with short per-number claim spacing. Admission allows
30 requests per tenant/minute. The worker rechecks subscription, current-cycle
customer quota and the text reply window. API acceptance is not delivery.
Timeouts/ambiguous responses become `unknown`; they are not automatically
resent. Interrupted processing jobs become unknown after five minutes on the
next worker invocation. Operators must reconcile ambiguous jobs with Meta.
The browser preserves its request UUID after an uncertain action response.

Tokens are AES-256-GCM encrypted in `soulvd_private.meta_connections`;
the encryption key and app secret are server-only environment variables.
No access token is sent back to the browser. All new public data tables have
tenant RLS and read-only merchant grants. All mutations are service-role-only
invoker RPCs, with user authorization checked by server actions.

Browser return `/api/meta/whatsapp/callback` now reports a pending verification,
never a successful connection based solely on URL parameters. Embedded Signup
uses the Facebook SDK code flow, checks the Meta event origin, verifies that
the authorized token can read the chosen number under the chosen WABA, and
subscribes the app before saving the encrypted binding. A saved authorization
does not guarantee phone registration, live eligibility, billing, or delivery.

## Environment configuration

Set these in the correct Soulvd Vercel project and in ignored `.env.local`
when testing locally. Do not paste tokens into source files or commit them.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Soulvd project `lyvoiipsmcbffvpkrxhy` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Private database worker key |
| `NEXT_PUBLIC_META_APP_ID` | Public Soulvd Meta app ID `1594503802133031` |
| `NEXT_PUBLIC_META_CONFIG_ID` | Public Facebook Login for Business configuration ID |
| `META_GRAPH_VERSION` | Supported, explicitly pinned Graph version, e.g. the version selected in the app dashboard |
| `META_APP_SECRET` | Private Soulvd Meta app secret |
| `META_TOKEN_ENCRYPTION_KEY` | Random 32-byte key, base64 encoded |
| `META_WEBHOOK_VERIFY_TOKEN` | Random secret used during webhook verification |
| `META_WORKER_SECRET` | Separate random bearer credential for the queue worker |

Do not rotate the encryption key without re-encrypting existing stored tokens.
Do not put any private values in `NEXT_PUBLIC_*` variables. Temporary app
dashboard access tokens are for testing; production onboarding/token lifecycle
must use the appropriate Meta business integration credentials and handle revocation.

## Review sandbox and first real test

1. Apply `20260916123743_meta_cloud_api.sql` after the subscription foundation.
   The migrations are not idempotent. Verify the correct project and reconcile
   manually applied CLI migration history before using automatic `db push`.
2. Obtain the Meta-provided test WABA, phone-number ID and test access token
   from Soulvd's WhatsApp API testing panel. Keep the existing Business App
   number untouched; do not delete it or use traditional migration for Coexistence.
3. Configure the environment above. Additionally set, only in the operator's
   ignored local environment: `META_TEST_ACCESS_TOKEN`, `META_TEST_WABA_ID`,
   `META_TEST_PHONE_NUMBER_ID`, `META_REVIEW_ACTOR_ID` (an existing staff owner/editor).
4. Run `node scripts/setup-meta-review.mjs --help`, then the same command without
   `--help`. It verifies the number against Meta, creates an explicitly labelled
   30-day sandbox, and saves its encrypted test authorization. It does not send
   a message, register a real number, or activate an existing merchant's paid plan.
   Staff should select this sandbox in the workspace selector before testing.
5. Configure Meta's callback to `https://www.soulvd.sa/api/meta/whatsapp/webhook`
   and enter the matching verify token. Subscribe to `messages` and
   `message_template_status_update`; subscribe the app to the test WABA too.
   Neither webhook URL verification alone nor opening Postman proves subscription.
6. Add the intended recipient in Meta's permitted test recipients. In the
   sandbox, refresh templates to import supported templates such as `hello_world`
   within the quota. The human operator sends an opted-in test template from
   Soulvd, replies from the receiving WhatsApp client, and sends a text reply
   from Soulvd. Verify inbound text, accepted/sent/delivered/read states and
   repeat-customer quota behavior against the database and Meta dashboard.
7. Create a plain body-only template from Soulvd and verify its existence and
   final approval status in Meta. A queued/pending local row is not proof of creation.
8. Record the two real end-to-end flows for App Review. Complete permission
   descriptions, Data handling and Reviewer instructions based on actual behavior.
   Business verification is currently in review; access verification is blocked
   until it completes. Do not submit before live tests and instructions work.

## Queue recovery and launch gates

Immediate server-action dispatch is implemented. A trusted scheduler must also
invoke `POST /api/meta/whatsapp/worker` with `Authorization: Bearer
<META_WORKER_SECRET>` to drain jobs not dispatched immediately. Configure this
outside Git after credentials/deployment are ready. The endpoint processes up
to two jobs per invocation and never runs without the secret. For production
volume, use a continuous durable worker with monitoring, rather than treating
this bounded HTTP worker as a 1,000-tenant throughput guarantee.

Launch still requires actual Meta credentials, deployment verification, real
send/receive/template tests, complete business/access/App Review, enabled
Embedded Signup configuration, number registration where applicable, billing
setup and token lifecycle handling. Coexistence launch selection is prepared,
but App echoes, history sync and BSUID reconciliation are not implemented yet;
the current phone-identity inbox must not be advertised as full Coexistence.
Messages sent directly from the Business App cannot be blocked by Soulvd quota.

Direct Tech Provider status is not a BSP credit line. Merchant Meta payment
setup must be verified before promising centralized wallet billing. Platform
subscription (SAR 299/399) and Meta usage fees remain separate. Checkout,
campaigns, rich media, automation execution and merchant API keys are separate
remaining work, not delivered by this integration.

Production data retention must be configured before public launch: define
merchant message retention, raw-event retention, export/deletion and backup
behavior. Current persistence has no automatic deletion policy. App Review
answers must accurately reflect this; do not claim automated deletion exists.

## Validation

The authenticated Meta dashboard test on 2026-09-16 generated a test token
scoped to the current test WABA only. A Graph API Explorer GET to
`1045211661610334/phone_numbers` succeeded and returned phone-number ID
`1305801685956899`. A dashboard test template sent to the operator's verified
recipient produced a `delivered` status webhook in Meta's test panel. These
tests did not send through Soulvd or prove delivery into its database.

The public Soulvd webhook route responds on the canonical `www.soulvd.sa`
host; the apex host redirects there. Use the canonical URL for Meta callbacks.
The verified production Vercel project is `soulvd/soulvd`, linked to
`fluqoai/Soulvd` and `www.soulvd.sa`. Production now has `NEXT_PUBLIC_META_APP_ID`
and `META_GRAPH_VERSION` as Config, and `META_APP_SECRET`,
`META_TOKEN_ENCRYPTION_KEY`, `META_WEBHOOK_VERIFY_TOKEN`, and
`META_WORKER_SECRET` as Secret. Existing Supabase variables were retained.
Deployment `dpl_BFLBpe9wKFJ3yAKBCpj2wfbPXJvr` finished Ready with these settings.
A private, Git-ignored `.env.local` contains public test asset IDs and generated
server secrets, but still requires database credentials, the app secret and test token.
Preserve the generated encryption key when completing configuration; do not
overwrite this file with an environment pull without first merging its values.

Meta verified and saved the canonical callback. Its automatic field subscription
includes `messages` and `message_template_status_update` at v26.0. The dashboard
`messages` test reported success at 17:40 on 2026-09-16; a read-only query in
Soulvd Supabase confirmed one persisted event at 14:40:19 UTC. The independent
verification challenge returned HTTP 200 with the expected body. This verifies
Meta dashboard → production webhook → database persistence, including signature
validation. The sample uses an unbound demonstration number, so it is retained
privately and does not appear as a merchant inbox message.

Meta's current production setup panel explicitly states that unpublished apps
receive dashboard test webhooks only; production data, including from app roles,
requires publishing. Soulvd's Meta app remains unpublished. Live merchant inbox
testing, encrypted test-number binding, Embedded Signup configuration ID,
review/publishing, and the production worker schedule still need completion.

On 2026-09-16 the equivalent compact migration SQL was applied through the
verified Soulvd production SQL Editor (`lyvoiipsmcbffvpkrxhy`). A service-role
smoke transaction verified test binding, inbound ingestion/deduplication,
single claim and receipt-before-send-response reconciliation, then rolled back.
Permissions confirmed eight invoker RPCs, zero authenticated mutation grants
and eight service-role execution grants. CLI migration history is not yet
reconciled; do not rerun the migration. No Meta credential or connection has
been saved by this implementation session.
The final live query confirmed RLS enabled on all seven new tables and zero
persisted connections, events or messages after rollback.

`npm run test:meta`: real PostgreSQL engine via PGlite for RLS, encrypted tokens,
signature tampering, number ownership, event deduplication, window and quota
gates, single job claim, receipt ordering and template reservation.
`npm run test:subscriptions`, TypeScript, changed-file lint and production build
protect existing subscription behavior. PGlite serializes queries; real
multi-connection PostgreSQL and authenticated-browser testing remain required
before high-volume launch. No real customer message is sent by automated tests.

## Official references

- [Meta's Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Tech Provider onboarding](https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers/)
- [Coexistence onboarding](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/)
- [App dashboard](https://developers.facebook.com/apps/1594503802133031/dashboard/)

The Meta developer documentation returned HTTP 429 during this session; API
requests were checked against Meta's official Postman collection and the
authenticated app dashboard. Recheck current Embedded Signup/Coexistence
requirements in the dashboard before activating those flows for merchants.
