# Guided customer preparation

Customers can create a Soulvd workspace before the platform subscribes to YCloud Pro. Account creation, payment collection and external onboarding are independently controlled by `platform_launch_settings`. The existing owner/reviewer workspaces and live message dispatch gates are preserved.

## Customer journey

1. Home/header “Create your workspace” opens signup. Name, business name, email and one revealable password field; plan/term remain preferences and are editable later.
2. Email confirmation validates the Supabase session, then provisions an idempotent, unpaid workspace using the existing service-only contract RPC. Login retries provisioning if needed. A recoverable onboarding page asks only for the business name; no second plan wizard.
3. New unpaid workspaces open a focused preparation dashboard. It links to number setup, plan selection and an interactive inbox demonstration. Demonstration messages are local component state only and never affect delivery, billing, quotas or completion.
4. Number setup asks whether the number is in WhatsApp Business App, new, or with another provider. Local Saudi numbers and Arabic digits are normalized. Requests persist before payment, retry safely, and may be replaced before authorization starts. Expired links can be requested again in the app.
5. Only Business App requests use the managed Pro Onboard Link route. An operator supplies the per-customer YCloud URL. After the customer explicitly confirms authorization, the existing operator verification compares the phone, WABA, provider status and ownership, and requires an active subscription before binding. The UI polls status while visible and refreshes on focus; closing a provider window is never proof of connection.
6. Payment requests for inactive workspaces are blocked in PostgreSQL while preparation is enabled. Plan changes remain available. Confirmed transfers retain the existing activation behavior; no subscription is activated by signup or a submitted reference.

## Launch controls

`/admin/onboarding` exposes independent signup, onboarding and payment switches to the platform owner. Opening payments requires onboarding readiness. The migration defaults new readiness flags to false and does not open signup itself. The application can then be deployed and signup alone opened after verifying custom SMTP and email confirmation.

Pro subscription purchase is still external. Do not turn on commercial onboarding/payments until channel capacity, provider account, signed webhooks and live send/receive are checked. Enabling a checkbox does not purchase YCloud or prove provider readiness.

## Provider limitation

No documented Onboard Link creation API or authenticated per-tenant completion callback was found in YCloud's public API index during this implementation. Do not invent one or bind an asset merely because its phone matches customer input. The initial Pro route retains two operator tasks: provision the correct onboarding link and verify/bind the authorized number. The customer stays in their Soulvd workspace for preparation and follow-up; provider/Meta branding may appear during authorization. New numbers/provider migrations receive a distinct assisted path rather than an incorrect Coexistence link.

## Design references

- Intercom contextual, resumable tasks: https://www.intercom.com/help/en/articles/6612245-checklists-explained
- Intercom completion from tracked events: https://www.intercom.com/help/en/articles/6661022-design-your-checklist
- Stripe separates account exploration from live activation: https://docs.stripe.com/get-started/account/set-up
- YCloud Tech Partner requirements: https://helpdocs.ycloud.com/partner-center/english-en-2/ji-shu-kai-fa-huo-ban/ji-shu-kai-fa-huo-ban-ru-men

## Verification

`test:launch` covers preparation without an active subscription, idempotent requests, forbidden cross-tenant operations, number replacement, expired-link recovery, unsupported link modes, launch permission checks, and the database payment gate. `test:onboarding` covers localized phone input, truthful stage selection, completion state and verified-email provisioning inputs. All original platform tests still pass.

A temporary, isolated QA account verified actual login → automatic unpaid workspace creation → saved six-month Starter choice → phone preparation → persistence after reload, with zero payment requests and no provider authorization/send. The interactive inbox was exercised in the browser. This does not claim a new YCloud onboarding session was completed or that a paid Pro capability was tested before subscribing.
