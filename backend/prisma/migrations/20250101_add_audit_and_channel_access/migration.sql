-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "channel_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionId" TEXT,
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_admin_id" ON "admin_audit_logs"("adminId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_action" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_entity_type" ON "admin_audit_logs"("entityType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_created_at" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_channel_access_user_id" ON "channel_access"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_channel_access_channel_id" ON "channel_access"("channelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_channel_access_session_id" ON "channel_access"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_channel_access_expires_at" ON "channel_access"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "channel_access_userId_channelId_sessionId_key" ON "channel_access"("userId", "channelId", "sessionId");

-- AddForeignKey
ALTER TABLE "channel_access" ADD CONSTRAINT "channel_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;



