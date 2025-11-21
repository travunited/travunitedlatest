# Visa CSV Template Update - Implementation Summary

## Overview

This document summarizes the comprehensive update to align the visa import/export system with the new CSV template structure. All changes maintain backward compatibility with existing data.

## New CSV Template Structure

The official visa import/export template now uses these columns:

1. `country_code` - e.g. AE, IN, SG
2. `country_name` - e.g. United Arab Emirates
3. `visa_name` - marketing name, e.g. UAE Tourist 30 Days
4. `visa_slug` - unique slug for URLs, e.g. uae-tourist-30-days
5. `entry_type` - single, multiple, etc.
6. `stay_duration_days` - integer, e.g. 30
7. `validity_days` - integer, e.g. 60 (valid from date of issue)
8. `processing_time_days` - text or range, e.g. 3-5
9. `govt_fee` - numeric, government fee in currency
10. `service_fee` - numeric, Travunited service fee in currency
11. `currency` - e.g. INR, AED
12. `is_active` - true/false to show/hide visa on the site

## Changes Made

### 1. Database Schema (Prisma)

**File:** `prisma/schema.prisma`

Added new fields to the `Visa` model:
- `stayDurationDays` (Int?) - Integer days from `stay_duration_days`
- `validityDays` (Int?) - Integer days from `validity_days`
- `govtFee` (Int?) - Government fee from `govt_fee`
- `serviceFee` (Int?) - Service fee from `service_fee`
- `currency` (String?) - Currency from `currency` column (defaults to "INR")

**Legacy fields maintained for backward compatibility:**
- `priceInInr` - Total price (auto-calculated as govtFee + serviceFee)
- `stayDuration` - Text format (auto-generated from stayDurationDays)
- `validity` - Text format (auto-generated from validityDays)

### 2. Import/Export APIs

**Files:**
- `src/lib/import-schemas.ts` - Updated validation schema
- `src/app/api/admin/content/visas/import/route.ts` - Updated import logic
- `src/app/api/admin/content/visas/template/route.ts` - Already matches new structure

**Key Changes:**
- Import now validates and maps all new CSV columns
- Uses `upsert` for countries (by `country_code`) and visas (by `visa_slug`)
- Proper validation for numeric fields (stay_duration_days, validity_days, govt_fee, service_fee)
- Auto-calculates legacy fields for backward compatibility

### 3. Admin UI

**Files:**
- `src/app/admin/content/visas/page.tsx` - Visa list page
- `src/app/admin/content/visas/[id]/page.tsx` - Visa edit/create form

**Visa List Page:**
- Displays stay duration in days (if available)
- Shows validity in days from issue
- Displays price breakdown (Govt + Service fees) when available
- Shows currency

**Visa Edit/Create Form:**
- New "Pricing Breakdown" section with separate fields for:
  - Government Fee
  - Service Fee
  - Currency dropdown (INR, USD, EUR, AED, GBP)
  - Auto-calculated total display
- New "Validity & Duration" section with:
  - Stay Duration (Days) - integer input
  - Validity (Days from Issue) - integer input
  - Legacy text fields (read-only, auto-populated)

### 4. Public-Facing Pages

**Files:**
- `src/app/visas/[country]/page.tsx` - Visa listing cards
- `src/app/visas/[country]/[type]/page.tsx` - Visa detail page

**Visa Cards:**
- Shows "Up to X days" when `stayDurationDays` is available
- Shows "X days from issue" for validity when `validityDays` is available
- Displays price breakdown (Govt + Service) when available
- Shows currency symbol correctly

**Visa Detail Page:**
- Uses new integer fields for stay duration and validity
- Shows proper price breakdown in sidebar
- Displays currency correctly

### 5. API Routes

**Files:**
- `src/app/api/admin/content/visas/route.ts` - POST (create)
- `src/app/api/admin/content/visas/[id]/route.ts` - PUT (update)

**Changes:**
- Accept and save new fields (`stayDurationDays`, `validityDays`, `govtFee`, `serviceFee`, `currency`)
- Maintain backward compatibility with legacy fields

## Migration Steps

### On Local Development Machine

1. **Update Prisma schema** (already done in `prisma/schema.prisma`)

2. **Create and apply migration:**
   ```bash
   npx prisma migrate dev --name align_visa_with_csv_template
   ```

3. **Verify migration:**
   ```bash
   npx prisma migrate status
   ```

4. **Test import/export:**
   - Download template from Admin → Content → Visas → Import
   - Fill in sample data
   - Import and verify fields are saved correctly
   - Edit a visa and verify new fields appear
   - Check public-facing pages display correctly

### On VPS (Production)

1. **Pull latest code:**
   ```bash
   cd /var/www/travunited/travunitedlatest
   git fetch origin
   git reset --hard origin/main
   ```

2. **Load environment variables:**
   ```bash
   set -a; source .env; set +a
   ```

3. **Apply migration:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

5. **Rebuild and restart:**
   ```bash
   npm run build
   pm2 restart travunited --update-env
   ```

## Backward Compatibility

All changes maintain backward compatibility:

1. **Legacy fields preserved:** Existing visas continue to work with `priceInInr`, `stayDuration`, and `validity` text fields
2. **Auto-calculation:** When new fields are set, legacy fields are auto-calculated
3. **Graceful fallback:** Public pages show new fields when available, fall back to legacy fields otherwise
4. **Import compatibility:** Import can handle both old and new CSV formats

## Testing Checklist

- [ ] Download visa template CSV - verify columns match new structure
- [ ] Import sample visas using new CSV template
- [ ] Verify visas appear in admin list with correct fields
- [ ] Edit a visa and verify new fields are editable
- [ ] Create a new visa using admin form
- [ ] Verify public visa listing page shows correct information
- [ ] Verify public visa detail page shows correct price breakdown
- [ ] Verify currency displays correctly (INR, USD, etc.)
- [ ] Test export functionality (if implemented)

## Notes

- The template download endpoint (`/api/admin/content/visas/template`) already matches the new structure
- All numeric fields are validated during import
- Currency defaults to "INR" if not specified
- The `priceInInr` field is automatically calculated as `govtFee + serviceFee` for backward compatibility
- Legacy text fields (`stayDuration`, `validity`) are auto-generated from integer fields when available

## Future Enhancements

Consider adding:
- Export functionality to download visas in CSV format matching the template
- Bulk edit capabilities for updating multiple visas
- Currency conversion display (show prices in multiple currencies)
- Validation rules for currency-specific fee ranges

