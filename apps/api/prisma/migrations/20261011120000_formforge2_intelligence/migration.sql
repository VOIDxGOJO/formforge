-- CreateEnum
CREATE TYPE "AdaptiveSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "adaptiveConfig" JSONB,
ADD COLUMN     "objective" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "imputed" JSONB,
ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "QualityReport" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "issues" JSONB NOT NULL,
    "estimatedSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelSnapshot" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "k" INTEGER NOT NULL,
    "questionIds" TEXT[],
    "pi" JSONB NOT NULL,
    "theta" JSONB NOT NULL,
    "nmi" JSONB NOT NULL,
    "nReal" INTEGER NOT NULL,
    "nSynthetic" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdaptiveSession" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "askedOrder" TEXT[],
    "answers" JSONB NOT NULL DEFAULT '{}',
    "posterior" DOUBLE PRECISION[],
    "status" "AdaptiveSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AdaptiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyntheticResponse" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyntheticResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseInsight" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "topics" JSONB NOT NULL,
    "sentiment" JSONB NOT NULL,
    "clusters" JSONB NOT NULL,
    "basedOn" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponseInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QualityReport_formId_createdAt_idx" ON "QualityReport"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "ModelSnapshot_formId_createdAt_idx" ON "ModelSnapshot"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "AdaptiveSession_formId_status_idx" ON "AdaptiveSession"("formId", "status");

-- CreateIndex
CREATE INDEX "SyntheticResponse_formId_idx" ON "SyntheticResponse"("formId");

-- CreateIndex
CREATE INDEX "ResponseInsight_formId_createdAt_idx" ON "ResponseInsight"("formId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_sessionId_key" ON "Submission"("sessionId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AdaptiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelSnapshot" ADD CONSTRAINT "ModelSnapshot_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptiveSession" ADD CONSTRAINT "AdaptiveSession_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptiveSession" ADD CONSTRAINT "AdaptiveSession_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ModelSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyntheticResponse" ADD CONSTRAINT "SyntheticResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseInsight" ADD CONSTRAINT "ResponseInsight_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

