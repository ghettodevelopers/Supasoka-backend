-- CreateTable
CREATE TABLE "transcoding_jobs" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "targetQualities" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "outputUrls" JSONB,
    "errorMessage" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "transcoding_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_change_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "fromQuality" TEXT NOT NULL,
    "toQuality" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_change_logs_pkey" PRIMARY KEY ("id")
);
