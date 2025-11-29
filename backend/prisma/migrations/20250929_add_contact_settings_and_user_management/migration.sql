-- CreateTable
CREATE TABLE "contact_settings" (
    "id" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "callNumber" TEXT,
    "supportEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accessExpiresAt" TIMESTAMP(3),
ADD COLUMN     "accessLevel" TEXT NOT NULL DEFAULT 'basic',
ADD COLUMN     "blockReason" TEXT,
ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedBy" TEXT,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- Update existing users to have shorter unique IDs
UPDATE "users" SET "uniqueUserId" = 'User_' || substr(md5(random()::text), 1, 6) WHERE "uniqueUserId" IS NULL OR length("uniqueUserId") > 12;

-- Insert default contact settings
INSERT INTO "contact_settings" ("id", "whatsappNumber", "callNumber", "supportEmail", "isActive", "updatedBy") 
VALUES ('default', '+255123456789', '+255123456789', 'support@supasoka.com', true, 'system');
