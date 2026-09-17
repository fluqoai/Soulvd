# Soulvd managed WhatsApp connection

YCloud is a server-side adapter for the existing WhatsApp console. Merchants use
Soulvd's messages, templates, subscription quotas and team permissions. No
provider login, credential or provider dashboard is exposed to merchants.

## Deployment

1. Apply `20260917163851_ycloud_provider.sql` once to the verified Soulvd project.
   Existing connections default to `meta`; review bindings remain intact.
2. Add `YCLOUD_API_KEY` and `YCLOUD_WEBHOOK_SECRET` as server-only secrets in the
   production Vercel project. Never use a `NEXT_PUBLIC_` prefix or commit values.
3. Deploy the adapter and console changes.
4. Register `https://www.soulvd.sa/api/ycloud/whatsapp/webhook` with YCloud for
   `whatsapp.inbound_message.received`, `whatsapp.message.updated`, and
   `whatsapp.template.reviewed`. Store the endpoint signing secret in Vercel,
   then redeploy if required. Keep the existing Meta webhook unchanged.
5. The operator verifies the connected number with YCloud's authenticated
   `GET /v2/whatsapp/phoneNumbers/{wabaId}/{phoneNumber}` before binding it.
   Use the service-only `soulvd_ycloud_bind` RPC with an existing staff owner and
   explicitly chosen tenant. Its `p_token` is an encrypted noncredential marker;
   dispatch uses the master environment key, never decrypts this marker.
6. For the owner's initial experiment, create a separate explicitly labelled
   test workspace; do not attach a real number to the Meta review workspace,
   expose it to the reviewer, or activate another merchant's paid subscription.

## Behavior and verification

Signed events are committed before HTTP 200; persistence failures return 503 for
provider retry. Signatures use HMAC-SHA256 over `timestamp.rawBody`, constant-time
comparison and a five-minute freshness check. Event IDs and provider message IDs
are namespaced. Routing requires both the bound E.164 number and matching WABA.
Meta events cannot mutate YCloud connections and vice versa.

Existing database quota, membership, template reservation, consent and 24-hour
reply-window gates execute before a job is queued and again at dispatch. Claims
are single-use; ambiguous network results are not automatically resent.
`externalId` is a reconciliation reference, not an assumed provider idempotency
guarantee. Delivery receipts that arrive before the send response are reconciled.

The initial console supports text replies and body-only templates without
variables. Media are retained in signed raw events and shown as type markers;
media sending, history import and business-app outgoing message echoes are not
implemented. Receiving new events requires endpoint activation and deployment;
connecting a number in YCloud alone does not complete Soulvd integration.

Run `npm run test:meta`, `npm run test:ycloud`, `npm run test:subscriptions`,
TypeScript, changed-file lint and production build. Final live proof requires a
new inbound test visible in the chosen Soulvd workspace, a reply sent from that
workspace, and its delivered/read receipt. Never report a synthetic webhook as
proof of an actual WhatsApp delivery.

## Official references

- https://docs.ycloud.com/reference/webhook-integration-guide
- https://docs.ycloud.com/reference/webhook-events-payloads
- https://docs.ycloud.com/reference/whatsapp_message-send-directly
- https://docs.ycloud.com/reference/whatsapp_template-create
- https://docs.ycloud.com/reference/whatsapp_template-list
- https://docs.ycloud.com/reference/whatsapp_phone_number-retrieve
