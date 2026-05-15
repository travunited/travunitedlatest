# Debug Mode Rules (Non-Obvious Only)

- Prisma singleton pattern in `src/lib/prisma.ts` can cache connections - use `global.prisma = undefined` to reset during debugging
- Email config cached 5-min in `src/lib/email.ts` - force reload with `refreshEmailConfigCache()` 
- `analyzePrismaError()` returns `isSchemaMismatch` flag - check for column/table missing errors
- Prisma error format 'minimal' in production - set `errorFormat: 'pretty'` for dev verbose errors
- Payment success/failure handlers in `src/lib/payment-helpers.ts` have graceful fallbacks - failures log but don't throw
- AWS SES API timeout is 15s, config load timeout is 5s - check `lastEmailError` for failures
- Razorpay client null if env vars missing - check `razorpay` before `ensureRazorpayClient()`
- Admin contacts fallback chain: env var → admin env → support env → `travunited.root@gmail.com`