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
- Changed-file ESLint, TypeScript and the production build passed after excluding the ignored scratch directory.
- Code revision `a36d6f3` deployed successfully to both production Vercel projects. Production browser regression passed: after saving annual Growth, the heading, checked duration/plan and neutral confirmation message all agree. The test account remains unpaid.

## Issues found and fixed in source

- React's post-action form reset reverted radio DOM selections while the plan picker's displayed state still reflected the submitted contract. Prevent the native reset for this controlled contract form.
- Saving a plan invited the customer to create a bank transfer even while payments were closed. The success message now confirms saving without instructing a transfer.
- Local TypeScript checks included old generated Next files in ignored `tmp/`. Exclude that scratch directory from compilation.

## Still required

- Onboarding a separate customer's authorized number. The existing number status and transaction fixture do not substitute for Meta authorization or a real YCloud Onboard Link.
- Local Chrome navigation to `/app` was blocked by the browser (`ERR_BLOCKED_BY_CLIENT`); no bypass was attempted. The corrected form was instead verified on production after deployment.

No YCloud purchase was made. The checkout remained at Pro Monthly USD 118. The test account remains available for continued verification, with Growth selected but unpaid; annual and three-month selections were both saved during browser checks.

## Follow-up: unified checkout and actual free reply

- Migration `20260918181151` applied to Soulvd with checksum tracking after a rollback deployment check. Live PostgreSQL rollback acceptance passed for combined payment, welcome gift, duplicate confirmation, exact settlement and dispatch-time expiry of free-reply eligibility.
- Code `8e7cc3f` deployed successfully to both production projects. Platform test suites, production build and changed-file ESLint passed. Chrome's existing authenticated tab timed out, so the new checkout has not yet received a production visual browser check.
- A real inbound test arrived from the user's identified number ending 9350. The authorized reply used request `47a15924-4dbd-4eec-a947-d215cc7329ba`, job `6d4e27a0-14fc-49ba-b33f-42179f77e3d1`, and message `f6601303-7923-4340-9299-5de81f2add09`.
- The normal production worker sent it. The final database state is job `accepted`, message `delivered`, hold `settled`, held amount 0, charged amount 0, no billing error. No artificial credit or bank confirmation was created.
- Free replies are date-bounded as documented in `unified-checkout.md`; this result does not promise unlimited free messaging after the provider pricing change.
