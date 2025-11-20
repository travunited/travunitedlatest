-- PostgreSQL Permission Fix Script for Travunited
-- 
-- INSTRUCTIONS:
-- 1. Edit this file and replace YOUR_PASSWORD_HERE with your actual password
-- 2. Replace 'travunited' with your database username if different
-- 3. Replace 'travunited_db' with your database name if different
-- 4. Run as superuser: psql -U postgres -f scripts/grant-permissions-simple.sql
--    OR: psql -U $(whoami) -f scripts/grant-permissions-simple.sql

-- ============================================
-- EDIT THESE VALUES
-- ============================================
\set DB_USER 'travunited'
\set DB_NAME 'travunited_db'
\set DB_PASS 'YOUR_PASSWORD_HERE'

-- ============================================
-- FIX PERMISSIONS (don't edit below)
-- ============================================

-- Create/update role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'DB_USER') THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'DB_USER', :'DB_PASS');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', :'DB_USER', :'DB_PASS');
  END IF;
END
$$;

-- Create database if needed
SELECT 'CREATE DATABASE ' || quote_ident(:'DB_NAME') || ' OWNER ' || quote_ident(:'DB_USER')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'DB_NAME')\gexec

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE :DB_NAME TO :DB_USER;

-- Connect to database
\c :DB_NAME

-- Grant schema privileges
GRANT USAGE, CREATE ON SCHEMA public TO :DB_USER;

-- Grant privileges on existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO :DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO :DB_USER;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO :DB_USER;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO :DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO :DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO :DB_USER;

-- Make user owner
ALTER DATABASE :DB_NAME OWNER TO :DB_USER;

\echo '✅ Permissions fixed!'
\q

