# VPS Deployment & Migration Guide

## Quick Overview

Your deployment script (`deploy-vps.sh`) automatically runs migrations during deployment. This guide covers all scenarios.

---

## 🚀 **Method 1: Automatic Deployment (Recommended)**

Your existing `deploy-vps.sh` script automatically runs migrations when you deploy.

### Step-by-Step Process:

1. **Commit and push your code changes (including migrations) to GitHub:**
   ```bash
   git add .
   git commit -m "Add new features and database migrations"
   git push origin main
   ```

2. **SSH into your VPS:**
   ```bash
   ssh user@your-vps-ip
   ```

3. **Navigate to project directory:**
   ```bash
   cd /var/www/travunited/travunitedlatest
   ```

4. **Run the deployment script:**
   ```bash
   ./deploy-vps.sh
   ```

   The script will:
   - ✅ Pull latest code from GitHub
   - ✅ Install dependencies
   - ✅ **Automatically run `npx prisma migrate deploy`** (applies pending migrations)
   - ✅ Regenerate Prisma Client
   - ✅ Build the application
   - ✅ Restart PM2

---

## 🛠️ **Method 2: Manual Migration Commands**

If you need to run migrations manually or troubleshoot:

### SSH into VPS and run:

```bash
cd /var/www/travunited/travunitedlatest

# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if schema changed)
npm install
source .env 
npx prisma migrate deploy
npx prisma generate
pm2 restart travunited --update-env
```

---

## 📋 **Method 3: Create New Migration Locally First**

If you've made schema changes locally and need to create a migration:

### On Your Local Machine:

```bash
# 1. Make changes to prisma/schema.prisma

# 2. Create a new migration
npx prisma migrate dev --name your_migration_name

# 3. Commit the migration files
git add prisma/migrations/
git commit -m "Add migration: your_migration_name"
git push origin main
```

### Then deploy to VPS (use Method 1 or 2 above)

---

## ⚠️ **Important Notes**

### Migration Safety:
- **Always backup your production database** before running migrations
- Test migrations in a staging environment first if possible
- `prisma migrate deploy` only applies pending migrations (safe for production)

### Environment Variables:
- Ensure `.env` file on VPS has correct `DATABASE_URL`
- The deployment script automatically sources `.env` before running migrations

### If Migration Fails:

**Common Error: "Column already exists" (P3009 or 42701)**

This happens when a migration tries to add a column/table that already exists in the database.

**Fix Steps:**

1. **Check migration status:**
   ```bash
   npx prisma migrate status
   ```

2. **If migration failed due to existing columns:**
   ```bash
   # Mark the failed migration as rolled back (so we can re-run it)
   npx prisma migrate resolve --rolled-back 20251125163000_booking_customizations
   
   # Re-run deploy (migration is now idempotent)
   npx prisma migrate deploy
   ```

3. **If ALL changes from that migration already exist in DB:**
   ```bash
   # Mark it as applied (skip the migration)
   npx prisma migrate resolve --applied 20251125163000_booking_customizations
   
   # Continue with remaining migrations
   npx prisma migrate deploy
   ```

4. **Check database schema:**
   ```bash
   # Connect to DB and check if columns exist
   psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='Booking' AND column_name='driverPreference';"
   ```

**Note:** The migration `20251125163000_booking_customizations` has been updated to be idempotent (safe to re-run).

---

## 🔍 **Troubleshooting**

### Error: "Migration failed"
- Check database connection: `echo $DATABASE_URL`
- Verify `.env` file exists and has correct `DATABASE_URL`
- Check database is accessible from VPS
- Review migration SQL files in `prisma/migrations/`

### Error: "Migration already applied"
- This is safe to ignore - means migration was already run
- Check status: `npx prisma migrate status`

### Rollback Migrations:
```bash
# Prisma doesn't support automatic rollback
# You need to create a new migration to reverse changes
# Or manually fix the database schema
```

---

## 📝 **Quick Reference Commands**

```bash
# Check migration status
npx prisma migrate status

# See all migrations
npx prisma migrate list

# View database schema
npx prisma db pull

# Generate Prisma Client (after schema changes)
npx prisma generate

# Open Prisma Studio (to view DB data)
npx prisma studio
```

---

## 🎯 **Recommended Workflow**

1. **Local Development:**
   - Make schema changes in `prisma/schema.prisma`
   - Create migration: `npx prisma migrate dev --name feature_name`
   - Test locally
   - Commit and push to GitHub

2. **Production Deployment:**
   - SSH to VPS
   - Run `./deploy-vps.sh` (handles migrations automatically)
   - OR manually: `npx prisma migrate deploy`

3. **Verify:**
   - Check PM2 logs: `pm2 logs travunited`
   - Verify migrations: `npx prisma migrate status`
   - Test application functionality

---

## 🔐 **Database Backup Before Migration**

Always backup before major migrations:

```bash
# On VPS, backup PostgreSQL database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Or if using connection string with credentials:
pg_dump -h localhost -U username -d database_name > backup.sql
```

---

## ✅ **Your Current Setup**

Your `deploy-vps.sh` already handles migrations at **Step 5**:
- ✅ Checks for `.env` file
- ✅ Loads environment variables
- ✅ Runs `npx prisma migrate deploy`
- ✅ Regenerates Prisma Client
- ✅ Continues even if migration fails (with warning)

So you just need to:
1. Push code to GitHub
2. SSH to VPS
3. Run `./deploy-vps.sh`

That's it! 🎉

