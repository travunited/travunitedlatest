# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build Commands
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - ESLint check
- `npm run typecheck` - TypeScript validation
- `npm run check` - Run lint AND typecheck together

## Stack
- Next.js 14 (App Router), TypeScript, Prisma 6 + PostgreSQL
- NextAuth 4 (JWT sessions), Tailwind CSS, Razorpay payments
- AWS SES (email), AWS S3/MinIO (file storage)

## Non-Obvious Patterns

### Auth (`src/lib/auth.ts`)
- Email/password auth REQUIRES `emailVerified=true` to login - throws `EMAIL_NOT_VERIFIED` error
- Mobile OTP auth: JWT tokens (>20 chars) first, then widget OTP, then standard OTP as fallback
- Mobile users get placeholder email: `${mobile.replace("+", "")}@user.travunited`

### Email (`src/lib/email.ts`)
- Admin users (STAFF_ADMIN, SUPER_ADMIN) ALWAYS route to admin inbox (via `resolveRecipientEmail`)
- Inactive users are skipped unless `bypassActiveCheck=true` is set
- Domain auto-conversion: `@travunited.com` → `@travunited.in` applied everywhere
- Email config loaded from Prisma `Setting` table (key: `EMAIL_CONFIG`) with 5-min cache
- Config timeout: 5s, SES API timeout: 15s

### Payment (`src/lib/payment-helpers.ts`)
- `paymentInclude` type from this file MUST be used when querying payments for relations to work
- Payment success/failure handlers send notifications and emails with graceful fallbacks

### Prisma (`src/lib/prisma.ts`)
- Uses global singleton pattern to prevent multiple instances during dev hot-reload
- Error format set to 'minimal' in production

### Error Handling (`src/lib/prisma-error-handler.ts`)
- `analyzePrismaError()` returns `isSchemaMismatch` flag for migration issues
- Prisma error codes starting with 'P' indicate schema/connection problems

### Admin Contacts (`src/lib/admin-contacts.ts`)
- Layered fallback: env var → admin env → support env → `travunited.root@gmail.com`

### Razorpay (`src/lib/razorpay-server.ts`)
- Client is null if credentials not set (logs warning on import)
- Always use `ensureRazorpayClient()` before using - throws if not configured

### API Routes
- Admin routes: `src/app/api/admin/*`
- Webhook routes: `src/app/api/webhooks/*`
- Health check: `src/app/api/health/route.ts`