-- CreateTable
CREATE TABLE "lead_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_tags_lead_id_name_key" ON "lead_tags"("lead_id", "name");

-- AddForeignKey
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habilitar Row Level Security (RLS) na tabela lead_tags
ALTER TABLE "lead_tags" ENABLE ROW LEVEL SECURITY;

-- Forçar RLS mesmo para o proprietário da tabela (Prisma Client pipevitta_app)
ALTER TABLE "lead_tags" FORCE ROW LEVEL SECURITY;

-- Criar política para isolamento baseado na variável de sessão 'app.current_tenant'
CREATE POLICY tenant_lead_tags_isolation ON "lead_tags"
  FOR ALL
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
