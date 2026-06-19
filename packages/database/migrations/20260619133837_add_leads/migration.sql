-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'NEGOTIATION', 'SCHEDULED', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "procedure" TEXT,
    "estimated_value" DECIMAL(12,2),
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "warning_text" TEXT,
    "notes" TEXT,
    "professional_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Habilitar Row Level Security (RLS) na tabela leads
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;

-- Forçar RLS mesmo para o proprietário da tabela (Prisma Client pipevitta_app)
ALTER TABLE "leads" FORCE ROW LEVEL SECURITY;

-- Criar política para isolamento baseado na variável de sessão 'app.current_tenant'
CREATE POLICY tenant_leads_isolation ON "leads"
  FOR ALL
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

