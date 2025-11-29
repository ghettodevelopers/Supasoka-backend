#!/bin/bash
set -e

echo "🔧 Running database setup..."
npx prisma db push --accept-data-loss --skip-generate

echo "🚀 Starting server..."
node server.js
