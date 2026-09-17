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

## Observed on 2026-09-17

- Commit `456522b` passed the production build, TypeScript, scoped ESLint and all five suites in `test:platform`. GitHub reported successful Vercel deployments for both `soulvd` and `soulvdsa`; the updated pages were then verified on `www.soulvd.sa`.
- The authenticated owner test workspace displayed its existing inbound message and delivered reply. Conversation selection, new-conversation reset, the visible send button, template disclosure and mobile navigation dialog (including Escape dismissal) worked. Browser error/warning logs were empty during these checks. No new message, payment or credential was submitted.
- Readiness with the existing controlled contact showed 3/7 checks (configuration, inbound, delivered reply). Starting a new round returned 1/7, correctly excluding older message evidence. The round URL retained its explicit start time.
- Visual checks covered the existing approximately 762-pixel viewport and a separate 1280-pixel desktop tab (overview and automation page with the fixed sidebar). Neither overflowed horizontally. The viewport override did not resize the original tab; a 390-pixel phone viewport remains unverified. Responsive classes alone are not proof of that check.
- Read-only YCloud API checks showed the linked number `CONNECTED`, quality `GREEN`, `isOnBizApp: true`, an active Soulvd webhook for inbound/message status/template review, no templates for the linked WABA, and a USD 0.50 account balance. The WABA reported approved account status but `businessVerificationStatus: not_verified` and `whatsappBusinessManagerMessagingLimit: TIER_250`. Account approval is not proof of business verification or Soulvd Meta app approval. Confirm the correct linked business portfolio before scaling.
- After the user signed in, the YCloud console confirmed **Free Plan**, USD 0.50 wallet balance, the connected `Fluqo ai` number with High quality, and a 250-customer messaging limit. The rule-based agent list showed one sample chatbot with **Associated 0**. This does not establish the state of every separate Inbox auto-reply setting.
- Soulvd's automation page confirmed the test-space bot is stopped, 0/1 flows are configured and AI is unavailable. Readiness step navigation opened a separate tab and retained the original round.
- The Integrations page listed HubSpot, Shopify, Freshdesk, Zapier, MM Lite API, coupons, verification and additional channels. No installation was performed. Provider connectors must not be assumed tenant-isolated in Soulvd; implement each merchant integration against Soulvd's scoped API/event contract and validate its mapping before activation.

Provider limits are independent of Soulvd's monthly distinct-customer allowance. Current portfolio-level limit fields are documented in the [YCloud webhook reference](https://docs.ycloud.com/reference/webhook-events-payloads). Do not interpret `TIER_250` as a monthly platform quota or as 250 total individual chat messages.

## Messaging-cost rollout requirement

The console displayed an October 1, 2026 pricing notice, also published in [YCloud's official announcement](https://www.ycloud.com/blog/whatsapp-api-message-pricing-update-effective-october-1-2026): service replies become billable after 1,000 free delivered service messages per number/month, and in-window utility templates cease being free. The Meta documentation endpoint returned HTTP 429 during this check; the quoted update is attributed to YCloud.

The current repository has distinct-customer subscription counters, bank-transfer subscription/integration workflows and gated AI allowances. It does **not** yet implement a per-tenant WhatsApp monetary wallet or a cost reservation/reconciliation gate. A shared provider balance is not a tenant spending boundary. Before commercial automation rollout, implement verified transfer-to-wallet credits, reservations before billable sends, deduplicated reconciliation from provider billing/status events, low-balance blocking, refunds for confirmed non-billable failures and dated provider rate tables. Verify the treatment of free tiers against the actual linked number and provider invoice. AI request allowances do not cover WhatsApp delivery charges.
