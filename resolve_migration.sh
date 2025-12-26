#!/bin/bash

# Script to resolve failed Prisma migration
# This marks the failed migration as rolled back so it can be retried

echo "🔧 Resolving failed migration: 20251224000000_fix_documents_and_promocode_relations"
echo ""

# Mark the migration as rolled back
echo "📋 Marking migration as rolled back..."
npx prisma migrate resolve --rolled-back 20251224000000_fix_documents_and_promocode_relations

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration marked as rolled back successfully!"
    echo ""
    echo "🔄 Now retrying the migration..."
    npx prisma migrate deploy
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration applied successfully!"
        echo ""
        echo "🔄 Regenerating Prisma Client..."
        npx prisma generate
    else
        echo ""
        echo "❌ Migration still failed. Please check the error messages above."
        exit 1
    fi
else
    echo ""
    echo "❌ Failed to mark migration as rolled back."
    echo "You may need to manually update the _prisma_migrations table."
    exit 1
fi

