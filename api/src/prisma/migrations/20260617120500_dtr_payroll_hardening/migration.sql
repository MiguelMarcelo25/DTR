-- Add DTR approval subject
ALTER TYPE "ApprovalSubjectType" ADD VALUE 'DTR_PERIOD';

-- CreateEnum
CREATE TYPE "AttendanceEventType" AS ENUM (
    'TIME_IN',
    'TIME_OUT',
    'BREAK_IN',
    'BREAK_OUT',
    'CORRECTION_APPLIED',
    'SYSTEM_ADJUSTMENT'
);

-- CreateEnum
CREATE TYPE "AttendanceEventSource" AS ENUM (
    'WEB',
    'CORRECTION',
    'SYSTEM'
);

-- CreateEnum
CREATE TYPE "DtrPeriodStatus" AS ENUM (
    'OPEN',
    'SUBMITTED',
    'PENDING_SUPERVISOR',
    'PENDING_HR',
    'APPROVED',
    'LOCKED',
    'REOPENED',
    'PAYROLL_READY',
    'PAYROLL_HANDOFF'
);

-- CreateTable
CREATE TABLE "AttendanceEvent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "correctionId" TEXT,
    "eventType" "AttendanceEventType" NOT NULL,
    "source" "AttendanceEventSource" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "businessDate" DATE NOT NULL,
    "idempotencyKey" TEXT,
    "actorUserId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DtrPeriod" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "DtrPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "totals" JSONB,
    "submittedAt" TIMESTAMP(3),
    "supervisorApprovedAt" TIMESTAMP(3),
    "hrApprovedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "payrollHandoffAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "supervisorApprovedById" TEXT,
    "hrApprovedById" TEXT,
    "lockedById" TEXT,
    "payrollHandoffById" TEXT,
    "reopenedById" TEXT,
    "lockReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DtrPeriod_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Payroll"
ADD COLUMN "inputSnapshot" JSONB,
ADD COLUMN "attendanceSnapshot" JSONB,
ADD COLUMN "payrollConfigSnapshot" JSONB,
ADD COLUMN "calculationVersion" TEXT,
ADD COLUMN "dtrPeriodId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEvent_idempotencyKey_key" ON "AttendanceEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AttendanceEvent_employeeId_businessDate_idx" ON "AttendanceEvent"("employeeId", "businessDate");

-- CreateIndex
CREATE INDEX "AttendanceEvent_attendanceId_idx" ON "AttendanceEvent"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceEvent_correctionId_idx" ON "AttendanceEvent"("correctionId");

-- CreateIndex
CREATE INDEX "AttendanceEvent_eventType_idx" ON "AttendanceEvent"("eventType");

-- CreateIndex
CREATE INDEX "AttendanceEvent_source_idx" ON "AttendanceEvent"("source");

-- CreateIndex
CREATE UNIQUE INDEX "DtrPeriod_employeeId_year_month_key" ON "DtrPeriod"("employeeId", "year", "month");

-- CreateIndex
CREATE INDEX "DtrPeriod_employeeId_status_idx" ON "DtrPeriod"("employeeId", "status");

-- CreateIndex
CREATE INDEX "DtrPeriod_status_idx" ON "DtrPeriod"("status");

-- CreateIndex
CREATE INDEX "DtrPeriod_startDate_endDate_idx" ON "DtrPeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Payroll_dtrPeriodId_idx" ON "Payroll"("dtrPeriodId");

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_correctionId_fkey" FOREIGN KEY ("correctionId") REFERENCES "AttendanceCorrection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DtrPeriod" ADD CONSTRAINT "DtrPeriod_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_dtrPeriodId_fkey" FOREIGN KEY ("dtrPeriodId") REFERENCES "DtrPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
