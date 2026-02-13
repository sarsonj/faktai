/*
  Warnings:

  - Added the required column `bankAccountNumber` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bankCode` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defaultVariableSymbolType` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ico` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isVatPayer` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postalCode` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street` to the `Subject` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DefaultVariableSymbolType" AS ENUM ('ico', 'custom');

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "bankAccountNumber" TEXT NOT NULL,
ADD COLUMN     "bankAccountPrefix" TEXT,
ADD COLUMN     "bankCode" VARCHAR(4) NOT NULL,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "countryCode" VARCHAR(2) NOT NULL DEFAULT 'CZ',
ADD COLUMN     "defaultDueDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "defaultVariableSymbolType" "DefaultVariableSymbolType" NOT NULL,
ADD COLUMN     "defaultVariableSymbolValue" TEXT,
ADD COLUMN     "dic" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "ico" VARCHAR(8) NOT NULL,
ADD COLUMN     "isVatPayer" BOOLEAN NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "postalCode" TEXT NOT NULL,
ADD COLUMN     "street" TEXT NOT NULL,
ADD COLUMN     "vatRegistrationDate" TIMESTAMP(3);
