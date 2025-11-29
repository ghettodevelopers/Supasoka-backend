#!/bin/bash
set -e

echo "🚀 Starting deployment..."

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "🗄️ Running database migrations..."
npx prisma migrate deploy

echo "✅ Deployment complete!"
