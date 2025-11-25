# Fix Failed Migration: "Column Already Exists" Error

## 🔧 **Quick Fix Steps (On VPS)**

The migration `20251125163000_booking_customizations` has been updated to be idempotent (safe to re-run). Follow these steps:

### **Step 1: SSH into VPS**
```bash
ssh user@your-vps-ip
cd /var/www/travunited/travunitedlatest
```

### **Step 2: Pull the updated migration file**
```bash
git pull origin main
```

### **Step 3: Check migration status**
```bash
source .env
npx prisma migrate status
```

### **Step 4: Mark failed migration as rolled back**
```bash
npx prisma migrate resolve --rolled-back 20251125163000_booking_customizations
```

### **Step 5: Re-run migration (now idempotent)**
```bash
npx prisma migrate deploy
npx prisma generate
pm2 restart travunited --update-env
```

---

## ✅ **What Was Fixed**

The migration file `prisma/migrations/20251125163000_booking_customizations/migration.sql` has been updated to:

- ✅ Check if columns exist before adding them (using `DO $$ ... END $$` blocks)
- ✅ Check if tables exist before creating them (`CREATE TABLE IF NOT EXISTS`)
- ✅ Check if indexes exist before creating them (`CREATE INDEX IF NOT EXISTS`)
- ✅ Check if foreign keys exist before adding them

**Result:** The migration can now be safely re-run even if some columns/tables already exist.

---

## 🔍 **Alternative: If ALL Changes Already Exist**

If you verify that **every single change** from this migration already exists in your database:

```bash
# Mark migration as already applied (skip it)
npx prisma migrate resolve --applied 20251125163000_booking_customizations

# Continue with remaining migrations
npx prisma migrate deploy
```

---

## 🛡️ **Verify What's Already in DB**

Before choosing `--rolled-back` vs `--applied`, you can check:

```bash
# Check if Booking columns exist
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='Booking' AND column_name IN ('driverPreference', 'foodPreference', 'languagePreference');"

# Check if tables exist
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('TourAddOn', 'BookingAddOn');"
```

---

## 📝 **After Fix**

Once the migration succeeds:
- ✅ Check status: `npx prisma migrate status` (should show no pending migrations)
- ✅ Regenerate client: `npx prisma generate` (already done above)
- ✅ Restart app: `pm2 restart travunited` (already done above)
- ✅ Verify: Test your application

---

## 🎯 **Recommended: Use Rolled-Back Method**

Since the migration is now idempotent, use `--rolled-back` and re-run it. This ensures all changes are properly applied even if some already exist.

