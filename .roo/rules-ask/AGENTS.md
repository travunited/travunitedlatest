# Ask Mode Rules (Non-Obvious Only)

- `src/lib/` contains critical business logic not obvious from file names
- Auth has two providers: email/password (requires `emailVerified`) and mobile OTP (JWT priority order)
- Email routing: admin roles route to admin inbox, not user's actual email
- Domain conversion `@travunited.com` → `@travunited.in` happens silently in all email functions
- Prisma schema has complex relations - check `@@map()` for actual table names
- Payment system uses `paymentInclude` type for proper relation loading
- API routes under `src/app/api/admin/*` - separate from user routes