-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "before_state" JSONB,
    "after_state" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Habilitar Row Level Security (RLS) na tabela audit_logs
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Forcar RLS mesmo para o proprietario da tabela (Prisma Client foonewops_admin)
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

-- Criar politica para isolamento baseado na variavel de sessao 'app.current_tenant'
CREATE POLICY tenant_audit_logs_isolation ON "audit_logs"
  FOR ALL
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

