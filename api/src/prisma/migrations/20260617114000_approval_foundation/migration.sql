-- CreateEnum
CREATE TYPE "ApprovalSubjectType" AS ENUM ('ATTENDANCE_CORRECTION', 'LEAVE_REQUEST', 'OVERTIME_REQUEST', 'APPOINTMENT', 'PROFILE_UPDATE_REQUEST');

-- CreateEnum
CREATE TYPE "ApprovalInstanceStatus" AS ENUM ('PENDING_SUPERVISOR', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVE', 'REJECT');

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subjectType" "ApprovalSubjectType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalInstance" (
    "id" TEXT NOT NULL,
    "subjectType" "ApprovalSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "requesterEmployeeId" TEXT NOT NULL,
    "departmentId" TEXT,
    "branchId" TEXT,
    "currentStage" TEXT NOT NULL,
    "status" "ApprovalInstanceStatus" NOT NULL DEFAULT 'PENDING_SUPERVISOR',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "assignedRole" TEXT NOT NULL,
    "assignedEmployeeId" TEXT,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decision" "ApprovalDecision",
    "note" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOrgScope" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleName" "RoleName" NOT NULL,
    "departmentId" TEXT,
    "branchId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOrgScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflow_code_version_key" ON "ApprovalWorkflow"("code", "version");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_subjectType_isActive_idx" ON "ApprovalWorkflow"("subjectType", "isActive");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_code_isActive_idx" ON "ApprovalWorkflow"("code", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalInstance_subjectType_subjectId_key" ON "ApprovalInstance"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "ApprovalInstance_status_idx" ON "ApprovalInstance"("status");

-- CreateIndex
CREATE INDEX "ApprovalInstance_currentStage_idx" ON "ApprovalInstance"("currentStage");

-- CreateIndex
CREATE INDEX "ApprovalInstance_status_currentStage_idx" ON "ApprovalInstance"("status", "currentStage");

-- CreateIndex
CREATE INDEX "ApprovalInstance_requesterEmployeeId_idx" ON "ApprovalInstance"("requesterEmployeeId");

-- CreateIndex
CREATE INDEX "ApprovalInstance_departmentId_idx" ON "ApprovalInstance"("departmentId");

-- CreateIndex
CREATE INDEX "ApprovalInstance_branchId_idx" ON "ApprovalInstance"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_instanceId_sequence_key" ON "ApprovalStep"("instanceId", "sequence");

-- CreateIndex
CREATE INDEX "ApprovalStep_instanceId_status_idx" ON "ApprovalStep"("instanceId", "status");

-- CreateIndex
CREATE INDEX "ApprovalStep_stage_status_idx" ON "ApprovalStep"("stage", "status");

-- CreateIndex
CREATE INDEX "ApprovalStep_assignedEmployeeId_status_idx" ON "ApprovalStep"("assignedEmployeeId", "status");

-- CreateIndex
CREATE INDEX "ApprovalStep_decidedByUserId_idx" ON "ApprovalStep"("decidedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrgScope_userId_roleName_departmentId_branchId_key" ON "UserOrgScope"("userId", "roleName", "departmentId", "branchId");

-- CreateIndex
CREATE INDEX "UserOrgScope_userId_roleName_idx" ON "UserOrgScope"("userId", "roleName");

-- CreateIndex
CREATE INDEX "UserOrgScope_departmentId_branchId_idx" ON "UserOrgScope"("departmentId", "branchId");

-- CreateIndex
CREATE INDEX "UserOrgScope_isGlobal_idx" ON "UserOrgScope"("isGlobal");

-- AddForeignKey
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_requesterEmployeeId_fkey" FOREIGN KEY ("requesterEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ApprovalInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrgScope" ADD CONSTRAINT "UserOrgScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrgScope" ADD CONSTRAINT "UserOrgScope_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrgScope" ADD CONSTRAINT "UserOrgScope_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
