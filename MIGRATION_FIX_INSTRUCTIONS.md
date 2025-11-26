# Migration Fix Instructions

## Problem
The migration `20251125163000_booking_customizations` failed because it used `information_schema` checks which can be unreliable. The migration has been updated to use Postgres's native `ADD COLUMN IF NOT EXISTS` syntax.

## Changes Made
✅ Replaced all `DO $$ BEGIN ... IF NOT EXISTS (information_schema) ... END $$` blocks with simple `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements

## Steps to Apply on VPS

### 1. Navigate to project directory
```bash
cd /var/www/travunited/travunitedlatest
```

### 2. Load environment variables
```bash
set -a; source .env; set +a
echo $DATABASE_URL  # Verify it's loaded
```

### 3. Mark the failed migration as rolled back
```bash
npx prisma migrate resolve --rolled-back "20251125163000_booking_customizations"
```

### 4. Deploy the migration (will use the updated SQL)
```bash
npx prisma migrate deploy
```

### 5. Regenerate Prisma Client
```bash
npx prisma generate
```

### 6. Rebuild and restart
```bash
npm run build
pm2 restart travunited
```

## Verification

After applying, verify the tables/columns exist:

```bash
# Check BookingAddOn table exists
psql "$DATABASE_URL" -c '\dt "BookingAddOn"'

# Check requiresPassport column exists
psql "$DATABASE_URL" -c '\d "Tour"' | grep requiresPassport

# Check Booking preference columns exist
psql "$DATABASE_URL" -c '\d "Booking"' | grep -E "(driverPreference|foodPreference|policyAccepted)"
```

## Expected Results

After successful migration:
- ✅ `BookingAddOn` table will exist
- ✅ `Tour.requiresPassport` column will exist
- ✅ All Booking preference columns will exist
- ✅ All BookingTraveller passport columns will exist
- ✅ No more P2021/P2022 errors
- ✅ Tours import will work
- ✅ Bulk delete will work
- ✅ Booking detail pages will load

## Notes

- The migration SQL is now fully idempotent using Postgres native `IF NOT EXISTS`
- Safe to run multiple times
- No more information_schema dependency issues

