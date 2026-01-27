# Use Node.js 18 LTS (Fly.io; avoids buildpack Prisma symlink errors)
FROM node:18-alpine

# Install curl for healthchecks and openssl for Prisma
RUN apk add --no-cache curl openssl

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (Prisma is in dependencies); then generate client
RUN npm ci && npx prisma generate

# Remove Prisma CLI from runtime if desired (keeps image smaller)
# Prisma Client is in node_modules/@prisma/client

# Copy rest of app
COPY . .

# Create dirs used at runtime
RUN mkdir -p logs uploads

# Fly.io: must listen on 0.0.0.0:8080
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

# Start via start.js (runs prisma db push then server)
CMD ["node", "scripts/start.js"]
