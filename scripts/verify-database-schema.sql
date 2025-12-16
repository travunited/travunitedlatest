-- Database Schema Verification Script
-- This script checks all tables and columns against the Prisma schema
-- Run this against your PostgreSQL database to verify schema correctness

-- Check all tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'User', 'Application', 'ApplicationTraveller', 'ApplicationDocument',
            'Traveller', 'Booking', 'BookingTraveller', 'BookingDocument',
            'Country', 'Visa', 'VisaDocumentRequirement', 'VisaFaq', 'VisaSubType',
            'TourDay', 'Tour', 'TourAddOn', 'BookingAddOn',
            'Payment', 'Review', 'AuditLog', 'CorporateLead',
            'Setting', 'BlogPost', 'Notification', 'UserNotificationSettings',
            'CareerApplication', 'ContactMessage', 'CustomTourRequest',
            'TeamMember', 'SitePolicy', 'PasswordReset', 'EmailEvent',
            'VisaType'
        ) THEN '✓ Found'
        ELSE '✗ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check User table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'User'
ORDER BY ordinal_position;

-- Check Application table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Application'
ORDER BY ordinal_position;

-- Check Booking table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Booking'
ORDER BY ordinal_position;

-- Check Visa table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Visa'
ORDER BY ordinal_position;

-- Check Tour table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Tour'
ORDER BY ordinal_position;

-- Check Country table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Country'
ORDER BY ordinal_position;

-- Check for missing indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check for foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Check enum types
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

