# Merchant experience and release acceptance

The merchant shell now has responsive RTL navigation, an active-page indicator, a workspace selector, a mobile dialog, and a separate platform-admin link for authorized staff. The overview shows actual activity counts, a connection summary, next steps and compact usage. An assigned number is normal usage; it no longer prompts an upgrade to a plan with the same number limit.

The WhatsApp page groups the most recent 100 messages by customer. Selecting a conversation fills the recipient and shows its thread; the composer retains existing server admission, quota, opt-in, window and idempotency checks. Connection settings and template creation remain available in disclosure panels. The new inbox is a bounded recent-message view, not a complete paginated archive.

## One automated regression command

```sh
npm run test:platform
```

This runs subscription/tenant-isolation tests, bank-transfer tests, Meta and YCloud tests, and studio/API/AI-allowance tests. It uses fixtures and mocked provider boundaries; passing it is not proof of delivery to a real WhatsApp phone, a real CRM or an AI model. Also run the production build and scoped ESLint for release changes.

## One live acceptance round

Open `/app/readiness` in the owner's dedicated WhatsApp test workspace. Preserve the separate Meta-review sandbox.

1. Enter a second, controlled phone as the test customer and start a new round. The URL carries the phone and start time. Starting or refreshing a round only reads data; it sends nothing and enables nothing. Step links open another tab so the round stays available.
2. Send a message from that phone to the connected business number. Verify inbound receipt in Soulvd, then deliberately send a reply from Soulvd and require delivered/read status.
3. Create an active keyword flow with the keyword `اختبار سولفد`, a fixed reply and **draft** mode. Enable the bot, send the keyword from the controlled phone, inspect the draft, and deliberately approve only the intended reply. Test `موظف` for human handoff and `إيقاف` for marketing opt-out. Pause or archive the rule after the test if it should not remain active.
4. Create a template or use a Pro library copy. Submit it, wait for Meta approval, refresh its status and send it to the controlled recipient with consent. This can incur messaging charges; an approval may outlast the test session.
5. For CRM, first review the system's API/receiver and confirm the actual integration payment. Then issue credentials, call the tenant API and verify a signed event against an owned receiver, including timestamp checks, replay deduplication and field mapping. Test spaces intentionally cannot fabricate bank transfers. HTTP 2xx alone does not verify the receiver's signature validation or business logic.
6. AI is deferred. Do not connect OpenRouter or issue an allowance until AI pricing, margins, verified payment-to-grant logic, key budgets and real-model acceptance are agreed.

The readiness page scopes message evidence to the current tenant, selected contact, start time and at most 100 recent messages. Configured subscription/number/template checks are inventory checks; they are not necessarily created during the round. Evidence from automation and CRM is joined to those message IDs. It does not assert that every failure case, external system or security control has been tested.

## Visual acceptance

Verify desktop and mobile navigation, changing workspace, the inbox recipient/thread selection, visible send controls, the template-only consent field, new-round URL handling, error states and no horizontal overflow. Confirm the owner can enter platform administration while merchant-only accounts cannot. Live messages, payments, provider configuration and the Meta review workspace must not be altered merely to take screenshots.
