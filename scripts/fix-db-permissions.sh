#!/bin/bash

# Script to fix PostgreSQL permissions for Travunited database
# Run this script to grant necessary permissions to the database user

set -e

echo "🔍 Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set. Loading from .env..."
    set -a
    source .env 2>/dev/null || {
        echo "❌ Could not load .env file. Please set DATABASE_URL manually:"
        echo "   export DATABASE_URL='postgresql://user:password@localhost:5432/database'"
        exit 1
    }
    set +a
fi

echo "✅ DATABASE_URL found"
echo ""

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ Could not parse DATABASE_URL. Expected format:"
    echo "   postgresql://user:password@host:port/database"
    exit 1
fi

echo "📋 Database Configuration:"
echo "   User: $DB_USER"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo ""

# Create SQL script
SQL_FILE=$(mktemp)
cat > "$SQL_FILE" <<EOF
-- Fix permissions for Travunited database
-- Run this as a PostgreSQL superuser

-- 1) Create role if it doesn't exist (will error if exists, that's OK)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';
  ELSE
    -- Update password if role exists
    ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASS';
  END IF;
END
\$\$;

-- 2) Create database if it doesn't exist
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- 3) Grant privileges on the database
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- 4) Connect to the database
\c $DB_NAME

-- 5) Grant schema privileges
GRANT USAGE ON SCHEMA public TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;

-- 6) Grant privileges on existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;

-- 7) Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;

-- 8) Make the user owner of the database (optional but recommended)
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;

\q
EOF

echo "📝 SQL script created at: $SQL_FILE"
echo ""
echo "🔐 Now you need to run this SQL script as a PostgreSQL superuser."
echo ""
echo "Try one of these commands:"
echo ""
echo "   Option 1 (if 'postgres' user exists):"
echo "   psql -U postgres -h $DB_HOST -p $DB_PORT -f $SQL_FILE"
echo ""
echo "   Option 2 (if using your macOS username):"
echo "   psql -U $(whoami) -h $DB_HOST -p $DB_PORT -f $SQL_FILE"
echo ""
echo "   Option 3 (if Postgres.app is installed):"
echo "   psql -h $DB_HOST -p $DB_PORT -f $SQL_FILE"
echo ""
echo "After running the SQL script, you can test the connection:"
echo "   psql \"$DATABASE_URL\" -c 'SELECT version();'"
echo ""

