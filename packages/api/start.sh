#!/bin/bash
set -e

echo "=== Starting Halcyon RCM API ==="
echo "Current directory: $(pwd)"
echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'yes' || echo 'NO - THIS IS A PROBLEM')"

# Check if schema file exists
if [ -f "prisma/schema.prisma" ]; then
    echo "Found prisma/schema.prisma"
else
    echo "ERROR: prisma/schema.prisma not found!"
    ls -la prisma/ 2>/dev/null || echo "prisma directory does not exist"
    exit 1
fi

# Run prisma db push to sync the schema
echo "=== Running prisma db push ==="
npx prisma db push --skip-generate --accept-data-loss
echo "=== Prisma db push completed ==="

# Start the server
echo "=== Starting Node.js server ==="
exec node dist/index.js
