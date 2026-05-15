# Code Mode Rules (Non-Obvious Only)

- Always use `paymentInclude` from `src/lib/payment-helpers.ts` when querying payments - raw Prisma queries will miss relations
- Auth login REQUIRES `emailVerified=true` - throws `EMAIL_NOT_VERIFIED` error if missing
- Email: `resolveRecipientEmail()` routes admin users to admin inbox - don't bypass this for admin emails
- Inactive user emails skipped unless `bypassActiveCheck=true` set explicitly
- Mobile OTP users get placeholder email: `${mobile.replace("+", "")}@user.travunited` - don't expose this
- Use `ensureRazorpayClient()` from `src/lib/razorpay-server.ts` before Razorpay operations - client can be null
- Prisma errors with codes starting 'P' are schema/connection issues - use `analyzePrismaError()` from `src/lib/prisma-error-handler.ts`
- Domain auto-conversion: `@travunited.com` → `@travunited.in` in all email functions