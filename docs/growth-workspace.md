# Goal-led customer workspace

The merchant dashboard now starts with the business outcome: service, campaigns,
automation, an AI assistant, or integration. Phone type only chooses the connection
route. Preparation is available without subscription activation.

## Implemented flows

- `/app/contacts`: CSV/TSV upload or paste, column mapping, local/Arabic Saudi number
  normalization, invalid row reporting, preview, deduplication, consent evidence,
  segments, search/pagination and suppression. Import does not send messages.
  Existing contacts remain unchanged, including their consent and suppression.
  Files: 500KB, 5,000 contacts, 500-row transactions; a retry skips committed rows.
  Excel workbooks must be exported as CSV UTF-8. No XLSX reader is advertised.
- `/app/campaigns`: durable editable drafts, approved template selection, shared
  parameter values, preview, explicit send confirmation, pause/resume/cancel, and
  actual queued/delivered/read/failed/uncertain counts. Launch snapshots up to 5,000
  eligible recipients. Admission rechecks opt-outs, manager membership, active
  subscription, number connection, template approval, quota and wallet ceilings.
  One durable request UUID per recipient prevents duplicate admission. Wallet
  exceptions roll back admission before recording the pause reason.
- The worker is bounded to 20 admissions per invocation and a 25-second loop
  deadline, with at most two concurrent provider calls. Existing provider request
  timeout is 15 seconds. Campaigns rotate by their last processed timestamp;
  subscription locks use SKIP LOCKED. This is conservative initial throughput,
  not a benchmark or promise of instant bulk delivery. Already queued messages
  cannot be recalled by pausing a campaign. Completion means admission finished,
  not confirmed delivery. No automatic retry of ambiguous sends.
- `/app/guide`: a structured, non-generative setup guide for nontechnical users.
  Welcome, prices, appointment request and handoff recipes include local simulation.
  One editable setup brief per workspace is stored. An active manager can apply it
  idempotently as an automation draft and knowledge record. It never enables the
  bot or auto-send. AI generation remains subject to the existing OpenRouter
  configuration and paid entitlements; this UI does not pretend to be an LLM.
- Integration requests begin with a system name and desired outcome. Explicitly
  submitted briefs appear in `/admin/onboarding` for the platform owner. A changed
  brief needs re-submission. No credential collection, database connection, payment
  or claim that every CRM has a ready connector. Existing API/webhook setup remains.

## Deployment

Apply the growth and fair-scheduling migrations using the checksum-aware deploy
script. Deploy the worker/UI. Update `supabase/operations/studio-worker-schedule.sql`
so scheduled wakeups also notice running campaigns (preserves wallet reconciliation).
The existing Vault secret and worker schedule are reused; never embed credentials.
Keep launch phase flags unchanged: signup/preparation on, new-customer connection
and payment readiness off until commercial activation.

## Verification

`npm run test:growth`: parser/normalization, malformed CSV, rollback on invalid rows,
consent and suppression, tenant and role boundaries, unpaid drafts, campaign
gates/snapshot/pausing, insufficient-wallet rollback, and idempotent draft conversion.
`npm run test:platform`: all platform regression suites.

Browser QA uses an isolated temporary unpaid account and synthetic contacts. Test
the paste → preview → save → campaign draft and recipe → simulate → save → reload
flows. Verify mobile overflow and console errors. Never send to the synthetic numbers.

Production build and changed-file ESLint pass. Repository-wide ESLint still reports
pre-existing errors outside these changes. Postgres concurrency load testing, provider
delivery and AI quality evaluation remain separate live acceptance work before scale.

## References that informed the UX

- Brevo's contact import flow (mapping, preview and confirmation):
  https://help.brevo.com/hc/en-us/articles/115000719584-Import-your-contacts-to-Brevo
- Help Scout's knowledge-backed AI and human handoff:
  https://docs.helpscout.com/article/1569-ai-answers
