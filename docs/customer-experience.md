# Customer experience release — 18 September 2026

The initial release below used a gated signup and sequential payment flow. It is superseded by [guided customer setup](guided-customer-setup.md): workspace creation and preparation are available independently from provider activation and payment collection. The original inbox implementation and verification below remain applicable.

## Inbox and notifications

- Fixed-height responsive inbox: conversation list/search/unread filter, mobile back navigation, message bubbles, actual provider delivery status, pinned text/template composer, in-memory drafts per recipient, emoji picker and Enter/Shift+Enter behavior.
- Settings, template creation and template statuses remain accessible through “القوالب وإعدادات الربط”. No unsupported attachment or voice-send controls are shown.
- Tenant-filtered Realtime updates use public.inbox_threads. An authenticated, non-cached API reads data under tenant RLS, with a 15-second visible-tab polling fallback.
- Per-contact inbound sequence and per-user read cursors prevent another employee or an older device from incorrectly clearing unread counts. Reading in Soulvd is local state, not a WhatsApp read receipt.
- Thread and history pagination use timestamp/UUID cursors. When a burst exceeds the most recent page, the visible history restarts at that page so older pagination still reaches the intervening archive.
- The bell lists unread conversations. Sound is opt-in for the current session. Browser notifications require an explicit user gesture and permission, omit message text, and require the site to remain open. No service-worker push or notification delivery while the browser is closed is claimed.
- Initial historical unread counts do not produce an alert flood. Drafts remain in memory and are not persisted in browser storage.

## Customer-facing consistency

Home now shows the actual plan picker, setup steps and capabilities. The illustrative conversation is explicitly labeled. Unverified case-study claims are no longer presented on the home page; database content was not deleted. Visible home/FAQ/login copy no longer promises unrestricted cancellation, enabled AI or 24/7 human support. Annual and minimum-term totals remain server-defined by the existing contract logic. Signup and billing show progress and next steps; bank details include an IBAN copy control.

Removed dark-mode button overrides from the shared light-theme buttons: an OS dark theme previously made primary controls pale against the unchanged light background.

## Deployment and validation

Applied only 20260918005715_inbox_experience.sql to lyvoiipsmcbffvpkrxhy using the existing checksum-tracked release runner, after a real PostgreSQL transaction dry run and rollback. RLS is enabled, anon cannot select the inbox view, and the Realtime publication contains inbox_threads. The security advisor reported no inbox-specific findings.

Full npm run test:platform passed. The new test:inbox exercises migration backfill, independent employee read states, removed membership, RLS, provider receipt/replay stability, delayed events, 120-message pagination, burst merging, and actual HTTP input/auth/tenant boundaries. PGlite queues queries; it does not prove production multi-connection contention behavior.

Browser verification used the existing Meta reviewer test account: actual message history loaded, unread changed from four to zero on viewing, drafts survived switching conversations, emoji insertion worked, approved-template selection exposed its consent control, and settings/notifications opened. At 390 × 844 the send button remained visible with no horizontal overflow. No WhatsApp messages, template submissions, bank requests or wallet entries were created during this verification.

Production build passed (153 routes), and the annual Pro selection reached signup with the correct SAR 3,990 upfront total. The existing registration gate remained closed.
