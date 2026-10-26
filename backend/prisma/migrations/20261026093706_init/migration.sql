-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COORDONATOR', 'BACK_OFFICE', 'MANAGER_CAZARI', 'SOFER', 'CONTABIL', 'CONTROL_CALITATE');

-- CreateEnum
CREATE TYPE "BackOfficeStatus" AS ENUM ('NEPRELUAT', 'INCEPUT', 'FINALIZAT');

-- CreateEnum
CREATE TYPE "ApartmentType" AS ENUM ('STUDIO', 'UN_DORMITOR_DIVAN', 'DOUA_DORMITOARE', 'DOUA_DORMITOARE_LIVING');

-- CreateEnum
CREATE TYPE "AccommodationStatus" AS ENUM ('NEPRELUCRAT', 'REZERVAT');

-- CreateEnum
CREATE TYPE "TransferDirection" AS ENUM ('SOSIRE', 'PLECARE', 'DUS_INTORS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('VIZITA_NOUA_BACK_OFFICE', 'CAZARE_NOUA', 'TRANSFER_NOU');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" SERIAL NOT NULL,
    "arrivalAt" TIMESTAMP(3) NOT NULL,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "hasCompanion" BOOLEAN NOT NULL DEFAULT false,
    "coordinatorId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "backOfficeStatus" "BackOfficeStatus" NOT NULL DEFAULT 'NEPRELUAT',
    "backOfficeStartedAt" TIMESTAMP(3),
    "backOfficeFinishedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isCompanion" BOOLEAN NOT NULL DEFAULT false,
    "availability" TEXT,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accommodation" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "apartmentType" "ApartmentType" NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "freeDays" INTEGER,
    "status" "AccommodationStatus" NOT NULL DEFAULT 'NEPRELUCRAT',
    "reservedAt" TIMESTAMP(3),

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "direction" "TransferDirection" NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "visitId" INTEGER,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_externalId_key" ON "Visit"("externalId");

-- CreateIndex
CREATE INDEX "Visit_arrivalAt_idx" ON "Visit"("arrivalAt");

-- CreateIndex
CREATE INDEX "Visit_departureAt_idx" ON "Visit"("departureAt");

-- CreateIndex
CREATE INDEX "Patient_visitId_idx" ON "Patient"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "Treatment_patientId_key" ON "Treatment"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Accommodation_visitId_key" ON "Accommodation"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_visitId_key" ON "Transfer"("visitId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
