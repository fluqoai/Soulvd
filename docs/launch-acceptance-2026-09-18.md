# Launch acceptance — 18 September 2026

## Verified

- All nine `test:platform` suites passed. Provider calls in these automated suites are mocked, including the media-worker tests.
- Created an explicitly authorized test account through the production signup UI. The user received and confirmed its email. A separate merchant workspace was provisioned with one owner and a pending Starter three-month contract (SAR 897).
- Logged into the new account through the production UI. Its dashboard shows its own workspace and preparation checklist, not the platform admin or Meta reviewer workspace.
- Changed the test contract to annual Growth through the production UI. Database verification confirmed `pro_growth_v1`, 12 months, SAR 3,990, still pending. No payment was submitted or subscription activated.
- Connection options distinguish existing Business App coexistence from new-number assisted onboarding.
- Production launch flags: signup enabled; payments and external onboarding disabled. These flags were not changed persistently.
- Direct authenticated read from YCloud confirmed the existing owner number is `CONNECTED`, `isOnBizApp: true`, quality `GREEN`. This proves current number status, not onboarding entitlement or message delivery.
- Real PostgreSQL transaction (`scripts/verify-launch-transaction.mjs`) verified payment amount validation, owner-only confirmation, idempotent confirmation/topup, subscription activation, monthly distinct-customer deduplication, the 2,000-customer cap, existing-customer access at the cap, simulated provider binding, message reservation, 15% markup settlement, duplicate receipt protection, and insufficient-wallet rejection. The entire transaction rolled back. No job became visible to workers and no real bank transfer/provider delivery occurred.
- Live storage, internal email authorization, anonymous denial, and invitation reservation/cooldown/revocation rollback tests passed via `verify-repair-infrastructure.mjs`.

## Issues found and fixed in source

- React's post-action form reset reverted radio DOM selections while the plan picker's displayed state still reflected the submitted contract. Prevent the native reset for this controlled contract form.
- Saving a plan invited the customer to create a bank transfer even while payments were closed. The success message now confirms saving without instructing a transfer.
- Local TypeScript checks included old generated Next files in ignored `tmp/`. Exclude that scratch directory from compilation.

## Still required

- A fresh inbound WhatsApp message and actual reply/delivery receipt. The user was asked to send a unique test message and identify their sending number.
- The owner's Soulvd messaging wallet has no balance record. An actual reply will require legitimate wallet funding or an explicitly designed, recorded test-credit mechanism; no fictitious bank confirmation was created.
- Onboarding a separate customer's authorized number. The existing number status and transaction fixture do not substitute for Meta authorization or a real YCloud Onboard Link.
- Browser regression verification of the contract-form correction after deployment. Local Chrome navigation to `/app` was blocked by the browser (`ERR_BLOCKED_BY_CLIENT`); no bypass was attempted.

No YCloud purchase was made. The checkout remained at Pro Monthly USD 118. The test account remains available for continued verification, with annual Growth selected but unpaid.
