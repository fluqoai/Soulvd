# Manual payment pilot

Merchants register, create a workspace and choose Starter SAR 299 or Pro Growth
SAR 399. Their subscription remains pending until the platform owner verifies
receipt in the bank and confirms it at `/admin/subscriptions`.

Bank details are not invented: until supplied, billing directs merchants to
contact Soulvd for beneficiary, bank and IBAN. A receipt image alone is not
proof of cleared payment. WhatsApp messaging credits remain separate; this
screen does not create or fund a messaging wallet.

The server authenticates the operator and checks their platform owner role.
The service-only confirmation RPC independently checks that role, excludes test
workspaces, verifies the exact plan amount, and atomically stores a unique bank
reference with actor and timestamp before changing the subscription. A replay
of the same reference, tenant, purpose and amount has no additional effect;
reusing it for another payment fails. No real payment has been recorded by the
deployment itself.

Activation or renewal after expiry begins one calendar month from confirmation.
Early renewal of an active cycle is rejected: future prepaid cycles require a
separate scheduling model rather than merging monthly quotas. Upgrade uses
the SAR 100 plan price difference for the existing cycle, keeps usage and end
date, and changes the next renewal price to SAR 399.

Production migration `20260917180128_manual_bank_transfers.sql` was applied
successfully on 2026-09-17. Run `node scripts/test-bank-transfers.mjs` for exact
amount, operator authorization, reference replay and upgrade/cycle checks.

The first live merchant still needs their actual email, business name, chosen
plan and confirmed transfer. The operator then assists their YCloud Coexistence
onboarding and verifies the resulting number before binding it to that
merchant's workspace. Do not reuse the operator's number or give merchants
access to the platform master account. Approved templates and live isolated
send/receive tests follow. The existing direct Meta signup button does not
constitute a YCloud Onboard Link integration.
