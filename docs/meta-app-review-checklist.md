# Soulvd Meta App Review preparation

Prepared 2026-09-16. This is a preparation checklist, not evidence of approval.

## Verified activation state

- App `1594503802133031` is unpublished; business verification is in review.
- Existing Embedded Signup configuration `5495918983965804` uses WhatsApp
  Embedded Signup and system-user tokens. The public configuration ID is now
  set in the production Soulvd Vercel project.
- Deployment `dpl_9LqRokg9GkQqEb1HoGqrReMK8Ta9` finished Ready on
  `www.soulvd.sa` with that configuration.
- Meta dashboard webhook testing reached production Supabase. This does not
  prove an authenticated merchant send/receive flow or real-number onboarding.
- Permission business descriptions have been entered into the App Review draft.
  No compliance certification or review submission has been completed.
- The operator's isolated review workspace has now been created and its Meta
  test number `1305801685956899` bound with an encrypted test token. Soulvd
  refreshed an approved `jaspers_market_plain_text_v1` template and Meta accepted
  a template message sent from the Soulvd dashboard to the operator's verified
  recipient. Delivery and inbound reply are still awaiting verification.
- `POST 1045211661610334/subscribed_apps` returned `success: true` for Soulvd.
  This account subscription does not override Meta app publishing restrictions.

## Messaging screencast

Record actual behavior after provisioning the isolated review workspace using
`scripts/setup-meta-review.mjs`. Never show access tokens or server secrets.

1. Sign in as the review workspace owner and select the labelled sandbox.
2. Open `/en/app/whatsapp` and show its connected test number.
3. Refresh templates and select a supported approved body-only template.
4. Send to the operator's verified, consenting test recipient.
5. Show actual delivery status, then reply from the recipient's WhatsApp client.
6. Show the incoming message in Soulvd and send a text response while the
   customer service window is open.
7. Show the usage widget and confirm the repeat customer is counted once in
   the subscription cycle.

The existing Meta dashboard sample is insufficient for this screencast. Do not
claim it demonstrates the Soulvd merchant inbox. The app dashboard currently
restricts unpublished apps to dashboard-generated webhook tests.

## Management screencast

1. Show owner access to the merchant WhatsApp dashboard.
2. Demonstrate authorized asset selection in Embedded Signup when eligible.
3. Show the selected number and refreshed approved templates.
4. Create a supported body-only template with a unique name and show its
   existence and actual status in Meta. Pending does not mean approved.
5. Demonstrate that another tenant cannot access these assets.

Keep the operator's existing WhatsApp Business App number intact. Coexistence
eligibility must be confirmed in the actual Meta flow. History synchronization,
Business App message echoes and full identity reconciliation remain launch gates.

## Reviewer access and data handling

Provide a working, dedicated review login privately through Meta's reviewer
instructions, with the exact workspace, path and test steps. Do not commit
credentials. Verify the login and both videos before submitting.

Answer the data handling form from actual operations. Current implementation
stores merchant messages, templates, encrypted integration tokens and private
raw webhook events. Automatic retention/deletion is not implemented. Define
retention, exports, deletion requests, backups and token revocation before
making policy attestations. Do not invent certifications, customer counts,
deletion behavior or completed videos.

## Remaining launch gates

Business verification, access verification, permission review and publishing;
real send/receive tests; supported Coexistence behavior; worker recovery
scheduling and monitoring; Meta payment setup and token lifecycle handling.
Platform subscription prices remain SAR 299 and SAR 399. Meta usage charges
are separate from the distinct-customer subscription quota.
