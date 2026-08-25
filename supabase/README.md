# Soulvd — Supabase backend

Project: **`lyvoiipsmcbffvpkrxhy`**

## Apply the schema

There are three ways. Pick one.

### Option A — via Supabase dashboard (easiest, no extra setup)

1. Open the Supabase dashboard: <https://supabase.com/dashboard/project/lyvoiipsmcbffvpkrxhy>
2. Go to **SQL Editor** (left sidebar).
3. Open a new query.
4. Copy the entire contents of `migrations/0001_initial_schema.sql` and paste it in.
5. Click **Run**.

The whole script is idempotent (`create … if not exists`, `on conflict do nothing` / `do update set …`), so you can re-run it safely if anything fails.

### Option B — via `psql`

```bash
PGPASSWORD='YOUR_DB_PASSWORD' psql \
  -h db.lyvoiipsmcbffvpkrxhy.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f supabase/migrations/0001_initial_schema.sql
```

Get the DB password from **Project Settings → Database → Connection string** in the dashboard.

### Option C — via the Node script

```bash
# Add the DB password to .env
echo 'SUPABASE_DB_PASSWORD=YOUR_PASSWORD' >> .env

node scripts/apply-schema.mjs
```

The script reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_DB_PASSWORD` from `.env`, connects via `pg`, applies the migration, then lists all tables and storage buckets as a sanity check.

---

## What's in the schema

**Public content (editable from admin):**

| Table | Purpose |
|---|---|
| `site_settings` | Site name, tagline, contact info, social links, SEO (single row) |
| `pages` | Generic content pages — home, about, etc. `content` is a JSONB list of blocks |
| `services` | The 6 service cards on the home + /services page |
| `sectors` | The 6 sector cards + sector detail pages |
| `stats` | The 4 stats on the home page (98%, +100, etc.) |
| `value_props` | The 7 "why Soulvd" items on the home page |
| `integrations` | Integration logos (Shopify, HubSpot, etc.) |
| `case_studies` | Real client stories, optionally tied to a sector |
| `testimonials` | Client quotes |
| `team_members` | The /about team section |
| `media` | Reference table for files in the `media` storage bucket |

**Auth & admin:**

| Table | Purpose |
|---|---|
| `users` | Mirror of `auth.users` + `role` column (`owner` / `editor`) |
| `leads` | Contact form submissions (anyone can insert, only `owner` reads) |
| `activity_log` | Audit log of admin actions |

**Templates engine:**

| Table | Purpose |
|---|---|
| `clients` | Saved client info to reuse on invoices / quotes |
| `templates` | The `.docx` templates you upload — metadata + field schema |
| `invoices` | Generated invoices (data + paths to .docx/.pdf + share token) |
| `quotes` | Generated عرض سعر (price quotes) |

**Storage buckets:**

| Bucket | Visibility | Used for |
|---|---|---|
| `templates` | private (owner only) | `.docx` template files |
| `documents` | public (read), owner (write) | generated `.docx` + `.pdf` for invoices/quotes |
| `media` | public (read), editors (upload), owner (delete) | logos, images, etc. |

## Row Level Security

All tables have RLS enabled. Summary:

- **Public read** (anon + authenticated): `site_settings`, published content in `pages`, `services`, `sectors`, `stats`, `value_props`, `integrations`, `case_studies`, `testimonials`, `team_members`.
- **Editor + owner write**: all of the above content tables, plus `media` (insert + read).
- **Owner only**: `users`, `leads` (read/update/delete), `clients`, `templates`, `invoices`, `quotes`, `activity_log`, `media` (delete).
- **Anyone can insert** a `lead` (the contact form is public).
- **Helper functions**: `is_owner()`, `is_editor_or_owner()`, `current_role()`.

## First run: create the owner user

After the schema is applied:

1. **Sign up the first user** via Supabase Auth (the email you used becomes the owner candidate).
   - Easiest: dashboard → **Authentication → Users → Add user** → enter email + password → check "Auto Confirm User".
2. **Promote that user to `owner`** by running this in the SQL editor:
   ```sql
   update public.users set role = 'owner' where email = 'you@example.com';
   ```
3. **Invite editors** later via the admin panel (or directly via dashboard → Authentication → Users).

## Conventions

- All translatable text columns are `jsonb` with shape `{ar, en}`.
- All sort columns are `order_index` (ascending = first).
- All soft-deletable tables have `published boolean not null default true`.
- All `updated_at` columns are maintained by a trigger.

## File layout

```
supabase/
├── README.md                          (this file)
└── migrations/
    └── 0001_initial_schema.sql        (everything in one file)
scripts/
└── apply-schema.mjs                   (Node script — Option C)
```
