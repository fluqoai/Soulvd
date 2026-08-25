# Soulvd — موقع سولڤد

Public website + admin panel for **Soulvd** (سولڤد), a Saudi AI automation platform — official Meta WhatsApp Business partner.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Turbopack**
- **Tailwind CSS v4**
- **Supabase** — Postgres, Auth, Storage (`lyvoiipsmcbffvpkrxhy`)
- **next-intl** — Arabic (RTL) + English toggle
- **framer-motion** — entrance / scroll-reveal only (no hover transforms)
- **lucide-react** — icons
- **shadcn/ui** primitives (to be added) — class-variance-authority + clsx + tailwind-merge

## Project layout

```
src/
  app/                  # routes only (thin)
    [locale]/           # next-intl locale segment (ar | en)
      (public)/         # public marketing site
      (admin)/          # /admin panel
    api/                # server actions / API routes
  features/             # feature-based modules (auth, home, services, templates, ...)
  shared/               # reusable UI, lib, hooks
  server/               # server-only code (db client, services)
  i18n/                 # next-intl config + message catalogues
  styles/               # global CSS, tailwind tokens
```

## Local setup

```bash
# 1. install
npm install

# 2. env
# .env is gitignored. Copy from a secure source or set manually:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   SUPABASE_PUBLISHABLE_KEY (optional)

# 3. dev
npm run dev

# 4. build
npm run build
```

## Admin panel

Located at `/admin` (after `/login`). Roles:

- **owner** — full access, including settings and user management
- **editor** — content CRUD only (no settings, no users, no templates)

## Templates engine

The admin panel includes a templates engine for invoices and عرض سعر (price quotes). Workflow:

1. Design a `.docx` template using the `docx` skill (Word placeholders like `{{client_name}}`).
2. In the admin → **Templates**, upload the `.docx` and define its fields.
3. When you click **Generate**, the system fills the placeholders and produces both a `.docx` and a PDF download.

## Deployment

MiniMax Code default deploy. The public URL is set on the deploy step.
