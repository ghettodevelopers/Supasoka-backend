/*
  Warnings:

  - A unique constraint covering the columns `[uniqueUserId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "activatedBy" TEXT,
ADD COLUMN     "isActivated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "remainingTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uniqueUserId" TEXT;

-- CreateTable
CREATE TABLE "points_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "adId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "adType" TEXT NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 10,
    "duration" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertisements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "adType" TEXT NOT NULL,
    "videoUrl" TEXT,
    "imageUrl" TEXT,
    "duration" INTEGER,
    "pointsReward" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_uniqueUserId_key" ON "users"("uniqueUserId");

-- AddForeignKey
ALTER TABLE "points_history" ADD CONSTRAINT "points_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_views" ADD CONSTRAINT "ad_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
