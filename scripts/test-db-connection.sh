#!/bin/bash

# Quick test script to verify database connection and permissions

set -e

echo "🔍 Testing database connection..."
echo ""

# Load .env if DATABASE_URL not set
if [ -z "$DATABASE_URL" ]; then
    set -a
    source .env 2>/dev/null || {
        echo "❌ Could not load .env file"
        exit 1
    }
    set +a
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
fi

echo "📋 Testing connection..."
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Connection successful!"
    echo ""
    echo "📋 Testing permissions..."
    
    # Test basic queries
    psql "$DATABASE_URL" -c "SELECT current_database(), current_user;" || {
        echo "❌ Cannot query database"
        exit 1
    }
    
    # Test schema access
    psql "$DATABASE_URL" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'public';" || {
        echo "❌ Cannot access public schema"
        exit 1
    }
    
    echo "✅ All permission tests passed!"
    echo ""
    echo "You can now run:"
    echo "   npx prisma migrate dev --name add_tour_fields"
else
    echo "❌ Connection failed!"
    echo ""
    echo "Please run the fix script first:"
    echo "   bash scripts/fix-db-permissions.sh"
    exit 1
fi

