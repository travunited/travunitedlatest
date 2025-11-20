-- PostgreSQL Permission Fix Script for Travunited
-- Run this as a PostgreSQL superuser (postgres or your macOS user)
-- 
-- Usage:
--   psql -U postgres -f scripts/grant-permissions.sql
--   OR
--   psql -U $(whoami) -f scripts/grant-permissions.sql
--
-- Before running, update the variables below to match your DATABASE_URL:
--   DB_USER: database username (e.g., 'travunited')
--   DB_NAME: database name (e.g., 'travunited_db')
--   DB_PASS: database password (from your .env file)

-- ============================================
-- UPDATE THESE VALUES FROM YOUR .env FILE
-- ============================================
\set DB_USER 'travunited'
\set DB_NAME 'travunited_db'
\set DB_PASS 'YOUR_PASSWORD_HERE'

-- ============================================
-- SQL COMMANDS (no changes needed below)
-- ============================================

-- 1) Create role if it doesn't exist, or update password if it does
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'DB_USER') THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'DB_USER', :'DB_PASS');
    RAISE NOTICE 'Created role: %', :'DB_USER';
  ELSE
    EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', :'DB_USER', :'DB_PASS');
    RAISE NOTICE 'Updated password for role: %', :'DB_USER';
  END IF;
END
$$;

-- 2) Create database if it doesn't exist
SELECT 'CREATE DATABASE ' || quote_ident(:'DB_NAME') || ' OWNER ' || quote_ident(:'DB_USER')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'DB_NAME')\gexec

-- 3) Grant privileges on the database
GRANT ALL PRIVILEGES ON DATABASE :DB_NAME TO :DB_USER;

-- 4) Connect to the database
\c :DB_NAME

-- 5) Grant schema privileges
GRANT USAGE ON SCHEMA public TO :DB_USER;
GRANT CREATE ON SCHEMA public TO :DB_USER;

-- 6) Grant privileges on existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO :DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO :DB_USER;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO :DB_USER;

-- 7) Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO :DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO :DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO :DB_USER;

-- 8) Make the user owner of the database (recommended)
ALTER DATABASE :DB_NAME OWNER TO :DB_USER;

-- 9) Verify permissions
\echo ''
\echo '✅ Permissions granted successfully!'
\echo ''
\echo 'Verifying...'
SELECT 
    'Database: ' || current_database() || E'\n' ||
    'User: ' || current_user || E'\n' ||
    'Schema: public' as "Connection Info";

\q

