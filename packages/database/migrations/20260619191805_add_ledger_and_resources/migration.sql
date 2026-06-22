/*
  Warnings:

  - You are about to drop the column `room` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `commission_amount` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `professional_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `transactions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ROOM', 'EQUIPMENT', 'PROFISSIONAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_professional_id_fkey";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "room";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "amount",
DROP COLUMN "commission_amount",
DROP COLUMN "professional_id",
DROP COLUMN "type";

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_resources" (
    "appointment_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "appointment_resources_pkey" PRIMARY KEY ("appointment_id","resource_id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_resources" ADD CONSTRAINT "appointment_resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_resources" ADD CONSTRAINT "appointment_resources_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_resources" ADD CONSTRAINT "appointment_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Habilitar e Forçar RLS nas novas tabelas
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resources" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_resources_isolation ON "resources"
  FOR ALL USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "appointment_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_resources" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_appointment_resources_isolation ON "appointment_resources"
  FOR ALL USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "ledger_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_ledger_accounts_isolation ON "ledger_accounts"
  FOR ALL USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_entries" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_ledger_entries_isolation ON "ledger_entries"
  FOR ALL USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
