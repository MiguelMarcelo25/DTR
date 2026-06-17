-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "CalendarAuthMode" AS ENUM ('SERVICE_ACCOUNT', 'OAUTH');

-- CreateEnum
CREATE TYPE "CalendarIntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'ACTIVE', 'DISABLED', 'ERROR');

-- CreateEnum
CREATE TYPE "CalendarSyncAction" AS ENUM ('UPSERT', 'DELETE', 'FULL_SYNC', 'INCREMENTAL_SYNC');

-- CreateEnum
CREATE TYPE "CalendarSyncStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CONFLICT', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CalendarEventShadowStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'DELETED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "CalendarSyncDirection" AS ENUM ('OUTBOUND', 'INBOUND', 'SYSTEM');

-- AlterTable
ALTER TABLE "Appointment"
ADD COLUMN "scheduledEndTime" TEXT,
ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "googleEventId" TEXT,
ADD COLUMN "googleEventEtag" TEXT,
ADD COLUMN "googleEventStatus" TEXT,
ADD COLUMN "calendarSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CalendarIntegration" (
    "id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'GOOGLE',
    "calendarId" TEXT NOT NULL,
    "authMode" "CalendarAuthMode" NOT NULL DEFAULT 'SERVICE_ACCOUNT',
    "status" "CalendarIntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "syncToken" TEXT,
    "channelId" TEXT,
    "channelResourceId" TEXT,
    "channelExpiresAt" TIMESTAMP(3),
    "lastFullSyncAt" TIMESTAMP(3),
    "lastIncrementalSyncAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSyncOutbox" (
    "id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'GOOGLE',
    "appointmentId" TEXT NOT NULL,
    "googleEventId" TEXT,
    "action" "CalendarSyncAction" NOT NULL,
    "status" "CalendarSyncStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "requestedByUserId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSyncOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEventShadow" (
    "id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'GOOGLE',
    "appointmentId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "etag" TEXT,
    "status" "CalendarEventShadowStatus" NOT NULL DEFAULT 'ACTIVE',
    "htmlLink" TEXT,
    "recurringEventId" TEXT,
    "payload" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEventShadow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSyncLog" (
    "id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'GOOGLE',
    "appointmentId" TEXT,
    "outboxId" TEXT,
    "integrationId" TEXT,
    "direction" "CalendarSyncDirection" NOT NULL,
    "action" "CalendarSyncAction",
    "status" "CalendarSyncStatus" NOT NULL,
    "message" TEXT,
    "errorCode" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_googleEventId_idx" ON "Appointment"("googleEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarIntegration_provider_calendarId_key" ON "CalendarIntegration"("provider", "calendarId");

-- CreateIndex
CREATE INDEX "CalendarIntegration_provider_status_idx" ON "CalendarIntegration"("provider", "status");

-- CreateIndex
CREATE INDEX "CalendarIntegration_connectedById_idx" ON "CalendarIntegration"("connectedById");

-- CreateIndex
CREATE INDEX "CalendarSyncOutbox_provider_status_nextAttemptAt_idx" ON "CalendarSyncOutbox"("provider", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "CalendarSyncOutbox_appointmentId_status_idx" ON "CalendarSyncOutbox"("appointmentId", "status");

-- CreateIndex
CREATE INDEX "CalendarSyncOutbox_googleEventId_idx" ON "CalendarSyncOutbox"("googleEventId");

-- CreateIndex
CREATE INDEX "CalendarSyncOutbox_requestedByUserId_idx" ON "CalendarSyncOutbox"("requestedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventShadow_appointmentId_key" ON "CalendarEventShadow"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventShadow_googleEventId_key" ON "CalendarEventShadow"("googleEventId");

-- CreateIndex
CREATE INDEX "CalendarEventShadow_provider_status_idx" ON "CalendarEventShadow"("provider", "status");

-- CreateIndex
CREATE INDEX "CalendarEventShadow_calendarId_googleEventId_idx" ON "CalendarEventShadow"("calendarId", "googleEventId");

-- CreateIndex
CREATE INDEX "CalendarEventShadow_lastSeenAt_idx" ON "CalendarEventShadow"("lastSeenAt");

-- CreateIndex
CREATE INDEX "CalendarSyncLog_provider_createdAt_idx" ON "CalendarSyncLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "CalendarSyncLog_appointmentId_idx" ON "CalendarSyncLog"("appointmentId");

-- CreateIndex
CREATE INDEX "CalendarSyncLog_outboxId_idx" ON "CalendarSyncLog"("outboxId");

-- CreateIndex
CREATE INDEX "CalendarSyncLog_integrationId_idx" ON "CalendarSyncLog"("integrationId");

-- CreateIndex
CREATE INDEX "CalendarSyncLog_status_idx" ON "CalendarSyncLog"("status");

-- AddForeignKey
ALTER TABLE "CalendarIntegration" ADD CONSTRAINT "CalendarIntegration_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncOutbox" ADD CONSTRAINT "CalendarSyncOutbox_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncOutbox" ADD CONSTRAINT "CalendarSyncOutbox_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventShadow" ADD CONSTRAINT "CalendarEventShadow_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncLog" ADD CONSTRAINT "CalendarSyncLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncLog" ADD CONSTRAINT "CalendarSyncLog_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "CalendarSyncOutbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncLog" ADD CONSTRAINT "CalendarSyncLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "CalendarIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
