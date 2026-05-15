# Architect Mode Rules (Non-Obvious Only)

- Prisma singleton pattern prevents multiple DB connections in dev hot-reload
- Email system uses cached config from Prisma `Setting` table (5-min TTL) - not env vars for runtime config
- Admin routing layer (`resolveRecipientEmail`) ensures admin emails always go to central inbox
- Payment handlers are fire-and-forget with graceful fallbacks - don't block on failures
- Auth requires `emailVerified=true` for email/password login - mobile OTP has separate flow
- `paymentInclude` type enforces relation loading pattern - queries without it miss nested data
- Domain auto-conversion (`.com` → `.in`) is applied at multiple email layers