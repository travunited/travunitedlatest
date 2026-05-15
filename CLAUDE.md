# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript validation (tsc --noEmit)
npm run check        # lint + typecheck together
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>  # Create and apply a new migration
```

## Stack

- **Next.js 14** (App Router, `src/app/`), TypeScript, Tailwind CSS
- **Prisma 6** + PostgreSQL (`prisma/schema.prisma`)
- **NextAuth 4** with JWT sessions (email/password + mobile OTP)
- **AWS SES** (transactional email), **MinIO/S3** (file storage), **Razorpay** (payments)
- **MSG91** (mobile OTP), **TipTap** (rich text editor in admin)

## Architecture

### Directory Layout

```
src/
  app/          # Next.js App Router pages and API routes
    api/        # REST endpoints (admin/*, bookings/*, payments/*, webhooks/*, ...)
    admin/      # Admin dashboard pages (STAFF_ADMIN + SUPER_ADMIN)
    dashboard/  # Customer dashboard pages
  components/   # React components, organized by domain
    admin/      # Admin-only UI (layout, tables, import modal, rich text editor)
    ui/         # Shared UI primitives
    home/       # Landing page sections
    layout/     # Navbar, Footer, etc.
    auth/       # Login/OTP modals
  lib/          # Server-side utilities and business logic
  hooks/        # Custom React hooks (useDebounce, useFormPersistence)
  types/        # Shared TypeScript types
  proxy.ts      # NextAuth middleware for route protection
```

### Route Protection (`src/proxy.ts`)

- `/dashboard/*` and `/admin/*` require authentication
- `/admin/*` requires `STAFF_ADMIN` or `SUPER_ADMIN` role
- `/admin/settings/admins`, `/admin/users`, `/admin/reports` require `SUPER_ADMIN`
- `/apply/*` and `/book/*` are public (payment step enforces auth)

### Auth (`src/lib/auth.ts`)

- Email/password login **requires** `emailVerified=true` — throws `EMAIL_NOT_VERIFIED` otherwise
- Mobile OTP auth (MSG91): JWT access token (>20 chars) → widget OTP → standard OTP (fallback order)
- Mobile users get a synthetic placeholder email: `${mobile.replace("+", "")}@user.travunited` — never expose this to end users

### Email (`src/lib/email.ts`)

- Email config is loaded from the Prisma `Setting` table (key: `EMAIL_CONFIG`) with a 5-minute in-memory cache — not from env vars at runtime
- `resolveRecipientEmail()` routes all emails to admin users to the central admin inbox — do not bypass this
- Inactive users are silently skipped unless `bypassActiveCheck: true` is set (use only for password reset flows)
- Domain auto-conversion: `@travunited.com` → `@travunited.in` applied at all email layers

### Payments (`src/lib/payment-helpers.ts`)

- Always use the exported `paymentInclude` constant when querying `Payment` records — raw queries without it will miss required nested relations
- Payment success/failure handlers (`handlePaymentSuccess`, `handlePaymentFailure`) are fire-and-forget with graceful fallbacks; failures log but do not throw

### Razorpay (`src/lib/razorpay-server.ts`)

- The client is `null` if env credentials are absent (warns on import)
- Always call `ensureRazorpayClient()` before any Razorpay operation — it throws a clear error if not configured

### File Storage (`src/lib/minio.ts`, `src/lib/media.ts`)

- Uses MinIO (S3-compatible) with `forcePathStyle: true`
- Media URLs are proxied through `/api/media` — use `src/lib/media.ts` helpers to build URLs, not raw MinIO paths

### Notifications (`src/lib/notifications.ts`)

- All in-app notification types are declared as a union type in this file; add new types there first
- `notify()` (single user) and `notifyMultiple()` (bulk) are the entry points

### Prisma (`src/lib/prisma.ts`)

- Global singleton prevents multiple DB connections during dev hot-reload
- Error format is `minimal` in production; set `errorFormat: 'pretty'` locally for verbose errors
- `analyzePrismaError()` in `src/lib/prisma-error-handler.ts` returns `isSchemaMismatch` for migration-related failures (Prisma error codes starting with `P`)

### Admin Contacts (`src/lib/admin-contacts.ts`)

- Fallback chain for admin email: env var → `ADMIN_EMAIL` env → `SUPPORT_EMAIL` env → `travunited.root@gmail.com`

### Audit Logging (`src/lib/audit.ts`)

- `logAuditEvent()` validates `adminId` exists before writing — never assume an ID is valid

### Content / Blog (`src/lib/blog/`)

- `publishReady.ts` — helpers to determine if a blog post is ready to publish
- Blog posts have `isPublished`, `publishedAt`, and `isFeatured` flags in the schema
