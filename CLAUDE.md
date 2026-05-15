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

### Domain Model

Two parallel service lines share many patterns:
- **Applications** (`Application` model) — visa applications; documents uploaded per `Traveller` via `Document` (mapped to `ApplicationDocument` table)
- **Bookings** (`Booking` model) — tour bookings; documents uploaded via `BookingDocument`

Both support: status transitions, bulk actions, document review, notes, audit logging, assignment to a staff admin, invoice generation, and Razorpay payments.

### Money / Amounts

All monetary values (fees, discounts, totals) are stored and passed as **paise** (₹1 = 100 paise). Convert only at display boundaries. Promo code logic in `src/lib/promo-codes.ts` also uses paise throughout.

### Auth Helpers (`src/lib/auth-helpers.ts`)

Server-side helpers for protecting pages and API routes:
- `getCurrentUser()` — returns session user or `null`
- `requireAuth()` — redirects to `/signup` if unauthenticated
- `requireAdmin()` — redirects to `/dashboard` if not `STAFF_ADMIN`/`SUPER_ADMIN`
- `requireSuperAdmin()` — redirects to `/admin` if not `SUPER_ADMIN`

Use these in Server Components and Route Handlers instead of calling `getServerSession` directly.

### Guest Application Flow

Unauthenticated users can start a visa application stored as `GuestApplication`. On sign-in/signup, call `/api/guest-applications/merge` to migrate the draft into a real `Application` under the authenticated user.

### Image Uploads

Accepted types: PNG and JPG/JPEG only (configurable via `ALLOWED_IMAGE_TYPES` env var). Maximum size: 10 MB. Validation helpers are in `src/lib/image-upload-config.ts`. Client-side compression before upload is handled via `browser-image-compression`.

### Booking Helpers (`src/lib/booking-helpers.ts`)

Utility functions for pricing calculations: `calculateAge()`, `getTravellerType()` (adult/child/infant), and `calculateChildPrice()`. Infants are < 1 year (decimal age), children are < `childAgeLimit` (default 12).

### Key Environment Variables

Required at runtime (server):
```
DATABASE_URL
NEXTAUTH_SECRET, NEXTAUTH_URL
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SES_REGION   # SES email
MSG91_AUTH_KEY                                               # Mobile OTP
CRON_SECRET                                                  # Cron job auth
```

Client-side (`NEXT_PUBLIC_*`):
```
NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_MINIO_PUBLIC_ENDPOINT, NEXT_PUBLIC_MINIO_BUCKET
NEXT_PUBLIC_GA_MEASUREMENT_ID, NEXT_PUBLIC_META_PIXEL_ID
```

Optional overrides: `ADMIN_EMAIL`, `SUPPORT_EMAIL`, `COMPANY_NAME`, `COMPANY_GSTIN`, `MEDIA_PROXY_BASE`, `ALLOWED_IMAGE_TYPES`.
