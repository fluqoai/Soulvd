# Soulvd pre-subscription audit — 18 September 2026

Scope: audit of revision `327193c`, followed by authorized repairs.
No provider subscription, real outbound WhatsApp message or payment was performed. Customer/reviewer records were not changed. Two schema migrations, a private media bucket, an internal invitation-mail Edge Function and confirmation-email routing configuration were applied to the verified Soulvd Supabase project.

## Repairs completed

- Team invitations now send email, support existing-account login and employee-only signup, confirm email before acceptance, and bind the authenticated recipient to the invited tenant. Pending invitations show delivery state and provide resend/cancel controls. Cancellation releases the reserved seat; owners cannot bypass subscription limits through the browser.
- Login now links to password recovery. The request screen uses a neutral response, Supabase rate limiting and PKCE-aware password-link handling. Expired/invalid links offer another recovery request. No account password was changed during verification.
- The inbox displays images, audio, videos and downloadable documents. The composer accepts validated JPEG/PNG/PDF/MP3/OGG/AAC/MP4 attachments up to 3.8 MB. Upload requests are limited to 10/minute and 100/day per tenant. Sending uses the existing subscription, 24-hour window, conversation quota and wallet admission transaction; workers recheck delayed message windows. These are platform safeguards, not provider plan entitlements.
- Provider media identifiers/URLs remain in the private schema. Media delivery checks the current authenticated membership, uses a private bucket, rejects arbitrary upstream hosts and redirects, and keeps provider credentials out of browser responses.
- Contacts and inbox phone search normalize local Saudi and Arabic/Eastern Arabic numerals consistently with imports.
- The confirmation email now preserves a validated invitation destination. An employee does not need to create a separate company or buy a second subscription to join a team.

## Repair verification

- Local automated suites cover the database migrations, invitation authorization/cooldown/revocation/acceptance, media ingestion/replays, immutable uploads, tenant isolation, idempotent sending, expired windows, wallet rollback and private RPC permissions. Provider and email sends are mocked in these suites.
- Live Supabase checks passed for the private bucket and upload cap, service-only mail authorization, invalid-input handling and anonymous media denial.
- A real PostgreSQL integration transaction passed invitation reservation, delivery claim/cooldown and cancellation, then rolled back; the temporary tenant was verified absent afterward.
- Browser checks passed for login-to-recovery navigation, the recovery screen and employee signup/login presentation. Authenticated merchant UI and real provider delivery remain separate acceptance checks.
- All platform test suites passed (the inbox test loader was updated for the new shared search helper); changed-file ESLint, TypeScript, the Deno function check and `npm run build` passed. The actual media-worker payload and missing-file failure behavior were tested with mocked provider calls.
- The production build served `/`, `/login`, `/forgot-password`, `/set-password` and `/join/<valid-uuid>` successfully in local smoke checks; anonymous media requests returned 401.
- The local Next.js development server required `--hostname localhost --webpack`: using 127.0.0.1 caused internal locale rewrites to be treated as external requests, and Turbopack produced a malformed Windows development manifest during concurrent rendering. No production routing workaround was introduced.
- Existing Supabase security-advisor warnings remain for legacy CMS helpers/triggers and disabled leaked-password protection. The new invitation/media RPCs use explicit service-only grants and an empty search path. These warnings were not hidden or counted as new regressions.
- Historical attachments received before the media migration are not backfilled. Provider retention applies to incoming media; outbound files currently remain in private storage. Storage retention/cleanup must be set before scaling; the upload safeguards do not replace a storage budget.

The findings below describe the original revision; the four concrete defects above have been repaired. Advanced bot builders, provider onboarding and AI enablement are product/dependency work, not completed by these repairs.

## Evidence and limits

- Checked the production public homepage, pricing interaction, annual totals, pricing-to-signup navigation, selected plan/term retention, and login page through the browser.
- Annual pricing updated to SAR 2,990 Starter and SAR 3,990 Growth, and the signup URL and selection retained the 12-month term.
- Production `/app` redirected to login. Reading the existing Chrome Soulvd tab timed out. An authenticated browser audit of every merchant button remains pending; the user was asked to sign in in the embedded browser.
- Reviewed merchant page components, server actions, provider onboarding, inbox rendering, automation schemas/worker, integrations and team logic in the local checkout.
- `npm run test:platform` passed all suites. These are local automated checks; they do not prove production configuration, real provider delivery, or completion of browser flows.

## Confirmed incomplete functions

### High priority: team invitation lifecycle

`src/components/billing/InviteForm.tsx` explicitly reports that a seat was reserved and invitation-email delivery will become available later. `src/lib/billing/gate.ts` only calls the seat-reservation RPC. A database acceptance function exists, but no application caller or invitation-acceptance route was found.

Impact: a customer cannot complete adding an employee through the current dashboard. Pending reservations also consume plan seats. Before selling team access, implement delivery, secure acceptance and membership binding, pending-invitation visibility, resend/revoke controls, and member management.

### High priority: WhatsApp media experience

`src/app/[locale]/app/whatsapp/Inbox.tsx` renders nontext messages as text labels such as “صورة واردة” and “رسالة صوتية”; `ChatMessage` has no downloadable/playable media field. The composer in `Console.tsx` sends text or approved text templates and has no attachment upload.

Impact: merchants cannot open inbound images/documents, listen to voice notes, or send attachments from Soulvd. This is a functional gap, not an effect of the YCloud subscription tier. Implement authenticated media retrieval/display and a separately verified outbound-media pipeline.

### High priority: password recovery entry point

The production login page and `src/components/auth/LoginForm.tsx` have no forgot-password entry point. Existing recovery-link handling and set-password UI do not provide a customer-facing way to request recovery.

Impact: a customer who forgets their password needs support intervention. Add a recovery-request screen with a neutral response, throttling and verification of email delivery and link handling.

## Launch dependencies and product limits

- YCloud customer onboarding is assisted: platform admin supplies an onboarding link and then verifies/binds the provider asset (`admin/onboarding/actions.ts`). Purchasing Pro alone does not remove those manual steps.
- New-number and other-provider requests explicitly enter an assisted path. Do not present the Pro Coexistence Onboard Link as automatic onboarding for all three number types.
- Current automation supports keyword/all-text triggers and one text, AI or human-handoff action per matching rule. It is not a multi-step visual bot with questions, remembered conversation steps, buttons, branching and CRM lookups. Such a builder is additional work if that is the launch promise.
- AI requires platform enablement, an OpenRouter key/model and separately enabled quotas. Leaving it off is intentional under the user's previous decision; upgrading YCloud will not enable it.
- CRM currently provides signed events and Soulvd message/template APIs. An arbitrary merchant CRM still requires field mapping, authentication and an implementation scoped for that system; the request/fee flow does not perform that work automatically.

## Additional code-observed issue

Contact search (`app/contacts/page.tsx`) searches raw input. Full local Saudi numbers beginning with `0` do not match stored international digits, and Arabic numerals are routed to name search. Normalize phone queries consistently with the importer. This was identified from code and was not reproduced in the authenticated production browser.

## Remaining acceptance checks

After authenticated access is available, verify the merchant navigation and dialogs, team controls, contact imports, campaign draft/review, template save/review/status refresh, bot save/archive/handoff, notifications, wallet and billing states, and admin onboarding controls.

Use an isolated test workspace for mutations. Separately verify an actual inbound message, text reply and receipt, approved-template delivery, automation execution, signed CRM event delivery, wallet settlement and a real customer-number onboarding. Do not count local tests or a saved “connected” database status as proof of those provider flows.

Recommendation: a provider subscription for controlled testing is reasonable; broad commercial launch should wait for the high-priority customer functions and the remaining authenticated/provider acceptance checks.
