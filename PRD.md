# PRD PipeVitta

> **Data**: 18/06/2026  
> **Status**: Em Revisão  
> **Autor**: Thailan Ramos

---

## Glossário de Termos

| Sigla | Significado |
|-------|-------------|
| CAC | Custo de Aquisição de Cliente |
| CAPI | Conversions API (Meta) — envio server-side de eventos de conversão |
| CDP | Customer Data Platform — plataforma que unifica dados de comportamento do cliente |
| DPA | Data Processing Agreement — acordo de processamento de dados entre Controlador e Operador |
| DPIA | Data Protection Impact Assessment — avaliação de impacto à proteção de dados |
| DPO | Data Protection Officer — encarregado de proteção de dados (LGPD) |
| DRE | Demonstrativo de Resultado do Exercício |
| NPS | Net Promoter Score — métrica de satisfação e lealdade do cliente |
| PEP | Prontuário Eletrônico do Paciente |
| PHI | Protected Health Information — informações de saúde protegidas |
| RAG | Retrieval-Augmented Generation — técnica de IA que consulta base de conhecimento |
| RBAC | Role-Based Access Control — controle de acesso baseado em papéis |
| RLS | Row Level Security — segurança em nível de linha no banco de dados |
| ROAS | Return on Ad Spend — retorno sobre investimento em anúncios |
| STT | Speech-to-Text — conversão de fala em texto |
| TISS | Troca de Informações em Saúde Suplementar — padrão ANS para convênios |
| WABA | WhatsApp Business Account |

---

## 1. Visão do Produto e Estratégia

### 1.1 Registro Consolidado da Marca
* **Nome**: PipeVitta
* **Tagline**: Para clínicas que colocam pessoas em primeiro lugar.

### 1.2 Posicionamento da Marca
O PipeVitta é a plataforma all-in-one que liberta clínicas do caos operacional. Acreditamos que a tecnologia nunca deve substituir o toque humano — mas sim eliminar a burocracia que afasta o profissional do paciente. Ao unificar marketing, CRM, agendamento e prontuário com uma inteligência artificial que atua como copiloto, o PipeVitta cuida de tudo que acontece antes e depois da consulta, para que você tenha tempo de fazer o que realmente importa: ouvir, acolher e transformar vidas.

### 1.3 Visão do Produto
Tornar-se o Hub All-in-One de RevOps e Marketing definitivo para clínicas, unificando aquisição, conversão, agendamento e retenção em uma única plataforma com inteligência artificial nativa e tracking server-side preciso.

### 1.4 Público-Alvo (ICP)
* **Primário**: Clínicas (Odontologia, Estética, Médica, Veterinária, etc.) que buscam escalar a captação de pacientes.  
* **Dores Resolvidas**: Fim do "Frankenstein" de softwares, cegueira sobre o Custo Real por Aquisição (CAC) de cada campanha de Ads e perda de leads por demora no atendimento via WhatsApp.

### 1.5 Clínicas Beta (Validação)
* **3 clínicas** para fase beta: 2 de Odontologia \+ 1 de Estética  
* **Período**: 3 meses de acesso gratuito, prorrogável por igual período  
* **Contrapartida**: Feedback semanal estruturado e autorização para case study

---

## 2. Stack Tecnológica

### 2.1 Decisões de Stack

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Backend** | Node.js + NestJS (TypeScript) | Ecossistema vasto, alta concorrência para mensagens, TypeScript end-to-end com o frontend |
| **Frontend** | Next.js (React) | SSR/SSG para Portal do Paciente (SEO), App Router, componentização madura, maior pool de candidatos |
| **Banco de Dados** | PostgreSQL (com RLS) | Robusto, Row Level Security nativo para multi-tenant, extensões ricas (PostGIS, pgcrypto, **pg_trgm para busca full-text na Fase 1**) |
| **Cache** | Redis | Cache de configurações, sessões, rate limiting |
| **Message Broker** | RabbitMQ / AWS SQS | Filas isoladas por tenant para WhatsApp e processamento assíncrono |
| **Search (Fase 3)** | Elasticsearch | Busca global semântica em prontuários e histórico extenso (Fase 1/1.5 usa Postgres FTS) |
| **Storage** | S3-compatible | Documentos, imagens, prontuários, áudios |
| **CDN** | CloudFront ou similar | Assets estáticos, SDK JavaScript |

### 2.2 Estratégia de Infraestrutura (Custo Zero em Dev)

| Fase | Infra | Propósito |
|------|-------|-----------|
| **Desenvolvimento/Testes** | Supabase (PostgreSQL) + Vercel (Next.js) | Zero custo durante dev — tiers gratuitos cobrem equipe pequena |
| **Staging** | Supabase Pro ou equivalente | Homologação com dados sintéticos |
| **Produção** | AWS (RDS + ECS/Lambda + S3 + SQS + Secrets Manager) | Stack enterprise, HIPAA-eligible, escalabilidade comprovada |

> **Premissa de migração**: A arquitetura será desenhada com abstrações (Repository Pattern, Infrastructure Layer) que permitam trocar Supabase → AWS RDS sem reescrever lógica de negócio. O ORM (Prisma/TypeORM) permanece o mesmo.

### 2.3 Ambientes de Deploy

| Ambiente | Propósito | Dados |
| :---- | :---- | :---- |
| **Development** | Desenvolvimento local | Dados sintéticos (seeds) |
| **Staging** | Homologação, QA, demos | Dados sintéticos mascarados, NUNCA dados reais |
| **Production** | Ambiente real das clínicas | Dados reais, criptografados |
| **Preview** *(nice-to-have)* | Deploy por PR para review | Vercel Preview Deployments |

---

## 3. Arquitetura do Sistema

### 3.1 Padrão Arquitetural: Monolito Modular com Feature Flags

O sistema adotará uma arquitetura de **Monolito Modular** com Domain-Driven Design (DDD), onde cada módulo possui boundaries claros e pode ser habilitado/desabilitado por plano via **Feature Flags**.

```
┌─────────────────────────────────────────────────────────┐

│                    API Gateway (NestJS)                   │

├─────────┬──────────┬──────────┬──────────┬──────────────┤

│ Módulo  │ Módulo   │ Módulo   │ Módulo   │ Módulo       │

│ Clínico │ CRM/Chat │ Financ.  │ Marketing│ Estoque      │

├─────────┴──────────┴──────────┴──────────┴──────────────┤

│              Shared Kernel (Auth, RBAC, Audit)           │

├─────────────────────────────────────────────────────────┤

│         PostgreSQL (Shared Schema + RLS)                 │

└─────────────────────────────────────────────────────────┘

         │              │              │

    ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐

    │  Redis  │   │ RabbitMQ  │  │   S3    │

    │ (Cache) │   │ (Filas)   │  │(Storage)│

    └─────────┘   └───────────┘  └─────────┘
```

**Justificativa**: Com equipe de 2 fullstacks + IAs, a complexidade operacional de microsserviços (deploy independente, service discovery, distributed tracing) seria excessiva. O Monolito Modular entrega a mesma capacidade de diferenciação por plano via Feature Flags, com deploy e debugging significativamente mais simples. A extração para microsserviços será feita conforme necessário na Fase 3 (serviços de alto volume como WhatsApp e IA).

### 3.2 Feature Flags por Plano

Ferramenta: **Unleash** (open-source, self-hosted) ou **Flagsmith**.

| Flag | Standard | Premium | Enterprise | Módulo IA |
|------|----------|---------|------------|------------|
| `module.crm` | ✅ | ✅ | ✅ | — |
| `module.marketing` | ❌ | ✅ | ✅ | — |
| `module.stock` | ✅ | ✅ | ✅ | — |
| `module.ai.copilot` | ❌ | ❌ | Negociável | ✅ |
| `module.ai.autonomous` | ❌ | ❌ | Negociável | ✅ |
| `module.ai.voice_control` | ❌ | ❌ | Negociável | ✅ |
| `module.tiss` | ❌ | ✅ | ✅ | — |
| `module.multi_clinic` | ❌ | ❌ | ✅ | — |
| `module.sso` | ❌ | ❌ | ✅ | — |
| `custom.*` | ❌ | ❌ | Personalizado | — |

> **Nota**: O "Módulo IA" (+R$299/mês) é um add-on que pode ser adicionado a qualquer plano (Standard ou Premium). O combo "Premium \+ IA" (R$678,90) é apenas uma oferta promocional com desconto. O plano Enterprise tem features negociáveis caso a caso.

### 3.3 Tracking Server-Side (CDP Interno & CAPI)

A PipeVitta atuará como um **Customer Data Platform (CDP)** próprio:

1. **JavaScript SDK** (snippet) instalado nas Landing Pages das clínicas
2. O script captura cliques, scrolls e UTMs, enviando para a API com um `anonymous_id`
3. Quando o lead inicia conversa no WhatsApp ou é criado no CRM, cruzamos `anonymous_id` ↔ `lead_id`
4. A PipeVitta usa a **Meta Conversions API (CAPI)** para enviar eventos (Lead, Schedule) server-side
5. Contorna bloqueios de cookies/iOS 14+, garantindo atribuição precisa do ROI

**Segurança do SDK JavaScript**:

- Subresource Integrity (SRI) para validação do script
- Verificação de domínio (allowlist por tenant)
- Sandboxing para não interferir na página host
- Content Security Policy (CSP) documentada para clientes

### 3.4 Redes Sociais (Social-to-CRM)

Foco nas APIs de Comments & Direct Messages. O sistema monitora posts (via Webhooks) e usa as APIs de DM para puxar ao funil de vendas quem comentou palavras-chave (ex: "PREÇO", "INFO") em posts do Instagram e TikTok, estilo ManyChat.

---

## 4. Multi-Tenancy e Isolamento de Dados

### 4.1 Estratégia: Shared Schema + Row Level Security (RLS)

* **Modelo**: Todos os tenants compartilham o mesmo schema PostgreSQL
* **Isolamento**: Toda tabela contém a coluna `tenant_id` (UUID, NOT NULL, FK)
* **Segurança em camadas**:
  1. **RLS no PostgreSQL**: Policies que filtram automaticamente por `tenant_id` do contexto da sessão
  2. **Application Layer**: Middleware NestJS que injeta `tenant_id` em toda query via interceptor
  3. **Audit**: Logs separados registram toda tentativa de acesso cross-tenant

```sql
-- Exemplo de RLS Policy
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON patients
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

* **Connection Pooling**: PgBouncer para gerenciar conexões de múltiplos tenants
* **Escalabilidade futura**: Tenants grandes (holdings) podem ser promovidos para schema isolado sem alteração na aplicação

### 4.2 Fair Queuing (Filas de Mensagens)

Para evitar que uma clínica com campanha viral trave o WhatsApp das outras:

* Message Broker (RabbitMQ/SQS) com **filas isoladas por `tenant_id`**
* Rate limiting por tenant no envio de mensagens
* Priorização configurável (mensagens transacionais > marketing)

### 4.3 Vault (Segredos e Tokens)

Tokens da API da Meta, certificados digitais e senhas sensíveis **nunca** ficam no banco relacional:

* **Desenvolvimento**: Variáveis de ambiente + Supabase Vault
* **Produção**: AWS Secrets Manager, vinculados ao `tenant_id`
* **Rotação automática**: Tokens da Meta API rotacionados a cada 60 dias
* **Alertas de vencimento**: Certificados A1 alertados 30, 15 e 7 dias antes

---

## 5. Módulos do Produto

### 5.1 Módulo Clínico (Core Operacional) — *Todos os planos*

#### Agenda Multi-recursos

* Visualizações: Diária, Semanal, Mensal e Lista
* Recursos: Salas, Equipamentos e Profissionais com conflito automático
* Buffer time configurável entre consultas (preparo/limpeza)
* Lista de espera quando horário desejado não está disponível
* Exportação unidirecional para Google Calendar (iCal feed) na Fase 1; bidirecional na Fase 2
* Agendamento online pelo paciente via Portal (Fase 1.5)

#### Prontuário Eletrônico do Paciente (PEP)

* Visão geral do paciente com dados de relacionamento e inteligência
* Evolução clínica com timeline
* Odontograma e Mapa Visual (Fase 2 — scope básico)
* Prescrição Digital com Assinatura Eletrônica
* Mídias (fotos, exames, documentos)
* Orçamentos e planos de tratamento
* Aba de convênios
* Jornada do paciente (timeline completa)

#### Controle de Estoque — *Todos os planos*

* Visão geral com alertas de validade e estoque mínimo
* Produtos e lotes com rastreabilidade ANVISA
* Entrada via NF-e
* Movimentações (entrada/saída/ajuste)
* Baixa automática integrada ao PEP (Premium+)
* Curva ABC de produtos (Premium+)
* Controle de consumo por profissional
* Relatórios de estoque

### 5.2 Módulo de Conversão (CRM & Chat) — *Todos os planos*

* Funis de vendas personalizáveis (Kanban + Lista)
* Lead Scoring com critérios configuráveis
* SLA de atendimento (tempo máximo para primeiro contato)
* Distribuição automática de leads (round-robin, por especialidade)
* Deduplicação de leads (mesmo telefone/email em canais diferentes)
* Inbox Omnichannel com IA Copilot (requer Módulo IA)
* Detalhamento do lead com histórico completo

### 5.3 Módulo de Marketing Intelligence & Campaigns — *Premium*

* Tracking Server-Side (CAPI) para atribuição precisa
* Social-to-CRM: Captura de leads via comentários/DMs (Instagram, TikTok)
* Gestão de Campanhas: Criação, monitoramento e otimização de anúncios
* Analytics Avançado: Dashboards de performance, cohort analysis
* Conexão com Meta Ads, Google Ads, TikTok Ads via OAuth 2.0
* Cache de métricas com atualização em background (15-30 min)

**Fase 3 (Avançado)**:

* Attribution modeling multi-touch (First-touch, Last-touch, Linear, Time-decay, Data-driven)
* A/B testing automatizado
* Predictive budgeting com IA
* Janela de atribuição configurável
* Offline conversion tracking

### 5.4 Módulo de Patient Success (Régua de Relacionamento) — *Premium*

* Automações nativas: Aniversariantes, NPS, Lembrete Anti-No-Show
* Retornos preventivos baseados no último procedimento
* Régua de cobrança para inadimplência
* Disparo em massa para campanhas e lembretes

### 5.5 Módulo Financeiro — *Todos os planos (escopo varia)*

> **Nota de Arquitetura**: O motor financeiro do PipeVitta será modelado desde o MVP utilizando o padrão de **Contabilidade em Partidas Dobradas (Double-Entry Ledger)**. Isso garante integridade absoluta nos saldos, facilita a conciliação bancária futura e auditoria, e evita retrabalho estrutural ao implementarmos DRE e relatórios avançados.

**Standard (Básico)**:
* Caixa diário (abertura/fechamento manual) via lançamentos de débito/crédito em contas contábeis padrão.
* Aba financeira do paciente (extrato individual)

**Premium (Completo)**:
* Split de comissões automático (fixo ou percentual) por profissional
* Contas a Pagar e Receber
* DRE por centro de custo/unidade
* Emissão de NFS-e (integração com prefeitura)
* Régua de cobrança automatizada
* Relatórios financeiros personalizáveis
* Gestão de convênios (orquestração TISS via middleware)
* Link de pagamento integrado (AbacatePay/Stripe)

**Fase 3 (Enterprise)**:

* Split automático de pagamento entre clínica e profissional
* Conciliação bancária automática (Open Banking)

### 5.6 Módulo de Estoque e Insumos — *Todos os planos (Básico na 1.5, Avançado no Premium)*
*(Movido para a Fase 1.5 para afunilar o escopo do MVP)*

* Controle completo de materiais médicos/odontológicos
* Rastreabilidade de lotes (ANVISA)
* Alertas de validade e estoque mínimo
* Baixa automática integrada ao PEP (Premium+)
* Integração com financeiro (entrada de NF atualiza estoque)
* Curva ABC de produtos e controle de consumo por profissional (Premium+)

---

## 6. Governança e RBAC

### 6.1 Matriz de Permissões (Role-Based Access Control)

Cada **perfil** é um conjunto pré-configurado de **transações** (permissões atômicas). Os perfis servem como templates para facilitar o setup inicial.

| Perfil | Transações Padrão | Restrições |
|--------|-------------------|------------|
| **Administrador** | Todas as transações | Acesso total à configuração do tenant, IA, visões globais |
| **Financeiro** | DRE, fluxo de caixa, NF-e/NFS-e, inadimplência | Cego para custos de Ads (CAC) |
| **Profissional** | PEP, prescrição, agenda pessoal, comissões | Apenas seus próprios pacientes |
| **Auxiliar Técnico** | Estoque, esterilização, preparação de salas | Sem acesso a PEP/financeiro |
| **Gestor de Relacionamento** | CRM, campanhas, NPS, WhatsApp | Sem acesso a PEP clínico |
| **Recepcionista** | Agenda global, confirmação, check-in | Sem acesso a financeiro/marketing |

**Modelo de permissões**:
* Cada usuário pode ter **um ou mais perfis** acumulados  
* As transações de todos os perfis atribuídos são somadas (união)

**MVP (Fase 1)**: 3 perfis ativos — Admin, Profissional, Recepcionista. Possibilidade de atribuir mais de um perfil por usuário.
**Fase 1.5+**: Todos os 6 perfis disponíveis + **edição granular de transações individuais** dentro de cada perfil (o Admin pode adicionar/remover transações específicas para um usuário, independente do perfil base).


### 6.2 Audit Trail (Trilha de Auditoria) Imutável

* Toda criação, edição e exclusão de dados clínicos e financeiros é registrada
* Campos obrigatórios: `user_id`, `tenant_id`, `ip_address`, `user_agent`, `timestamp`, `action`, `resource`, `before_state`, `after_state`
* Armazenamento em tabela append-only (sem UPDATE/DELETE)
* Retenção: 5 anos
* Acessível apenas por Administrador via interface dedicada

### 6.3 Dashboards por Persona (Home Customizada)

Cada login revela uma "Home" customizada baseada no RBAC:

| Persona | Dashboard |
|---------|-----------|
| **Super Admin (Holding)** | Ranking de unidades por faturamento, ROI de Marketing comparativo, taxa de ocupação global, impersonação de filiais |
| **Administrador** | Meta vs Realizado, Ticket Médio, Taxa de No-Show, Custo por Lead |
| **Recepcionista** | Fila do dia, confirmações pendentes, aniversariantes, metas de upsell |
| **Auxiliar Técnico** | Estoque crítico, esterilização, preparação de salas |
| **Profissional** | Próximas consultas, comissões do mês, pendências de assinatura |

---

## 7. Portal do Paciente

### 7.1 Autenticação Híbrida (Segura e Sem Atrito)
**Primeiro Acesso**:
1. Paciente recebe link via WhatsApp ou E-mail (Magic Link)
2. Sistema solicita verificação via código OTP (6 dígitos) enviado ao WhatsApp
3. Após validação, cria sessão persistente de 30 dias

**Acessos Seguintes**:
* Sessão automática (cookie HttpOnly + Secure + SameSite)
* Se expirada: CPF + código WhatsApp novamente  
* Opção "Lembrar deste dispositivo"

**Timeout**: 30 min de inatividade (apenas para Portal do Paciente)

### 7.2 Telas e Funcionalidades do Portal

O Portal do Paciente possui **15 telas prototipadas**:

| Tela | Funcionalidades |
|------|-----------------|
| **Login** | Entrada via CPF com Magic Link, branding da clínica, botões "Entrar com Google", link "Esqueci minha senha" |
| **Login (Variante Conservadora)** | Versão alternativa do login com layout mais tradicional |
| **Verificação OTP** | Input de 6 dígitos com timer de reenvio, validação em tempo real |
| **Dashboard (Home)** | Cards de resumo: próxima consulta, faturas pendentes, documentos recentes. Ações rápidas e saudação personalizada |
| **Minhas Consultas** | Lista de consultas passadas e futuras com status (Confirmada, Pendente, Realizada, Cancelada). Filtros por período |
| **Detalhamento da Consulta** | Informações completas: profissional, sala, procedimento, preparo necessário, botões de confirmar/reagendar/cancelar |
| **Reagendamento** | Seleção de nova data/horário com calendário interativo, confirmação de disponibilidade |
| **Agendamento Online** | Fluxo completo: escolha de especialidade → profissional → data/hora → confirmação |
| **Minhas Faturas** | Lista de faturas com status (Paga, Pendente, Vencida). Botões de pagamento (Pix, Cartão, Boleto) |
| **Meus Exames** | Resultados de exames e imagens com visualização inline e download PDF |
| **Receitas e Documentos** | Receituários, atestados, termos de consentimento com download PDF e assinatura eletrônica |
| **Histórico Clínico** | Timeline resumida de procedimentos, diagnósticos e evolução, com filtros por período e profissional |
| **Meu Perfil, Segurança e Dispositivos** | Dados pessoais editáveis, gestão de dispositivos conectados, revogação de acesso remoto, preferências de notificação |
| **Comunicados** | Avisos da clínica, campanhas, lembretes gerais |
| **NPS (Avaliação)** | Avaliação pós-consulta interativa e animada com escala 0-10, comentário opcional, tags de feedback |

### 7.3 Funcionalidades Extras (Além do PRD Original)

Os protótipos do Portal incluem funcionalidades que vão além do escopo original:
* ✅ **Agendamento online** (novo agendamento pelo paciente — não apenas confirmar/reagendar)
* ✅ **Comunicados** (avisos da clínica, campanhas, lembretes categorizados)
* ✅ **Gestão de Dependentes** (cadastro de filhos/familiares vinculados ao paciente)
* ✅ **Download do prontuário completo** (PDF exportável pelo paciente)
* ✅ **Contato direto via WhatsApp** (CTA para falar com a recepção)
* ✅ **Duas variantes de Login** (mobile-first e desktop split-layout)

### 7.4 Segurança do Portal

* Rate limiting: máximo 5 tentativas de login por hora
* Tokens imprevisíveis (UUID v4 \+ hash SHA-256)
* Logs de auditoria imutáveis (IP, dispositivo, horário)
* HTTPS obrigatório em todas as comunicações
* Notificação por WhatsApp/E-mail de novos acessos (data/hora/localização)
* Gestão de dispositivos com revogação remota
* Trust badges visuais: SSL, LGPD, ANS em todas as telas de autenticação
* Aviso de fraude na tela de OTP

### 7.5 Gaps Identificados nos Protótipos (Backlog)

| Gap | Descrição | Prioridade |
|-----|-----------|------------|
| **Assinatura de termos de consentimento** | PRD exige assinatura eletrônica de termos — tela não prototipada | 🔴 Alta |
| **Modal de timeout de sessão** | PRD exige timeout de 30 min — precisa de modal de aviso antes do logout | 🔴 Alta |
| **Pagamento via boleto** | PRD lista Pix + Cartão + Boleto; apenas Pix e Cartão estão visíveis | 🟡 Média |
| **Tela "E-mail enviado" (Magic Link)** | Botão "Entrar com Email" existe, mas sem tela de confirmação de envio | 🟡 Média |
| **Checkbox "Lembrar este dispositivo"** | PRD exige na tela de OTP ou Login — ausente nos protótipos | 🟡 Média |
| **Tela de confirmação de pagamento** | Sucesso/falha após clicar "Pagar Agora" — não prototipada | 🟡 Média |
| **Estados de loading/erro/vazio** | Nenhuma tela do Portal possui esses estados (ao contrário do Dashboard principal) | 🟡 Média |
| **Estado de erro no OTP** | Código errado ou máximo de tentativas — sem feedback visual | 🟢 Baixa |
| **Navegação entre perfis de dependentes** | Dependentes são listados mas sem fluxo de troca de contexto | 🟢 Baixa |

### 7.6 Acessibilidade do Portal (Itens a Corrigir)

* Adicionar `aria-live` regions para timer do OTP e mudanças de status
* Inputs com labels visíveis (não apenas placeholders)
* Verificar contraste WCAG AA em textos laranja/âmbar sobre fundo claro
* Foco gerenciado (focus management) no grid de OTP
* Skip navigation links
* Corrigir `lang="en"` → `lang="pt-BR"` (tela de exames)

### 7.7 Inconsistências Menores nos Protótipos (Fix list)

* Tela de faturas usa título "HealthPortal" em vez de "PipeVitta"
* Login conservadora usa cor primária diferente (#002d60 vs #004389)
* Tela de comunicados tem typo: "Incio" → "Início" no bottom nav
* Highlight do bottom nav varia entre telas

### 7.8 Gestão de Consentimento (LGPD)

* Flag no CRM indicando autorização para campanhas de marketing  
* Checkbox explícito no primeiro contato para envio de dados à Meta CAPI  
* A IA respeita rigorosamente essas permissões  
* Portal permite o paciente gerenciar seus consentimentos a qualquer momento

---

## 8. Inteligência Artificial

### 8.1 Arquitetura de IA (Compliance LGPD e CFM)

A IA opera sob a premissa de **Anonimização Contextual**:
* **Contexto Comercial (Lead)**: A IA acessa idade, queixa inicial, dúvidas sobre preço para mover no funil
* **Contexto Clínico (Paciente)**: A IA só acessa histórico clínico se o RAG for **explicitamente configurado** pelo Administrador
* **Premissa**: A IA nunca treina em dados clínicos sensíveis

### 8.2 Modelos de LLM (Multi-Provider com Router)

| Uso | Modelo | Justificativa |
|-----|--------|---------------|
| **Default** (respostas simples, FAQ) | GPT-4o-mini / Deepseek v4 | Custo-benefício, velocidade |
| **Complexo** (negociação, análise) | GPT-5 / Claude | Qualidade superior para decisões críticas |
| **Fallback** (indisponibilidade) | Gemini Flash | Resiliência, menor custo |

**Orquestração**: Router inteligente que direciona para o modelo adequado com base na complexidade da tarefa, garantindo resiliência e controle de custos.

### 8.3 Limites de IA por Plano

| Plano | Interações/mês | IA Copilot | IA Autônoma |
|-------|----------------|------------|-------------|
| Standard | 0 | ❌ | ❌ |
| Premium | 100 | ✅ (assistente) | ❌ |
| Módulo IA Avulso (+R$299) | 5.000 | ✅ | ✅ |

**Excedente (Questionar ao Admin se deseja continuar ou parar a IA, com opção de salvar a resposta)**: R$0,05 por interação adicional.  
**Definição de "interação"**: 1 turno de conversa ou 1 análise/sugestão gerada.

### 8.4 Guardrails da IA (Bloqueios Obrigatórios)

| Comportamento | Status | Detalhe |
|---------------|--------|---------|
| Dar diagnósticos médicos/odontológicos | ⛔ Bloqueado sempre | — |
| Recomendar medicamentos ao paciente | ⛔ Bloqueado sempre | Pode sugerir ao profissional |
| Dar descontos sem aprovação humana | ⛔ Bloqueado sempre | Requer confirmação do operador |
| Cancelar consultas automaticamente | ⛔ Bloqueado | Requer confirmação do paciente |
| Acessar prontuário sem config explícita | ⛔ Bloqueado por padrão | Requer ativação pelo Admin no RAG |
| Compartilhar dados entre pacientes | ⛔ Bloqueado sempre | — |
| Falar sobre concorrentes | ⛔ Bloqueado | — |
| Inventar informações (preço, agenda) | ⛔ Bloqueado | Consulta obrigatória à base real |

**Princípio central**: "Verificação obrigatória" — a IA sempre consulta dados reais e nunca inventa.

**Fallback**: Quando a IA não consegue responder, escala para humano com contexto da conversa.

### 8.5 Privacidade de Dados da IA

* **Dados clínicos**: NUNCA usados para treinamento de modelos, em nenhuma circunstância
* **Dados comerciais**: Opt-in por clínica para contribuir dados anonimizados (conversas de vendas)
* **Transparência**: Documentado no DPA de cada clínica
* **Retenção de prompts/respostas**: 12 meses para auditoria, depois excluídos

### 8.6 Voice Control (Fase 3)

* Engine STT: Whisper (OpenAI) com fine-tuning para termos médicos em pt-BR
* Confirmação obrigatória antes de salvar no prontuário (human-in-the-loop)
* Áudio original armazenado por 12 meses (backup legal)

### 8.7 Smile/Face Design Studio (Fase 3)

* Engine: WebGL / Three.js
* Disclaimer obrigatório: "Resultado meramente ilustrativo"
* LGPD: Imagens faciais \= dados biométricos (categoria especial), consentimento específico
* Base de referência: Antes/depois anonimizados, curados pela clínica

---

## 9. Compliance, LGPD e Regulatório

### 9.1 Posicionamento LGPD

**PipeVitta é Operador (Processador)** em relação à clínica:
* A clínica (Controlador) determina a finalidade e os meios de tratamento dos dados
* PipeVitta processa dados sob instruções da clínica
* **DPA (Data Processing Agreement)** obrigatório com cada clínica no onboarding
* Canal de atendimento para titulares de dados (pacientes) — responsabilidade da clínica, facilitado pela plataforma

### 9.2 DPO (Encarregado de Dados)

* **DPO Interno** será designado antes do lançamento público
* Responsável por: DPIA, resposta a incidentes, relatórios à ANPD, treinamento da equipe

### 9.3 Meta CAPI — Dados Enviados

| Dado | Enviado? | Formato |
|------|----------|---------|
| Email | ✅ | Hashed (SHA-256) |
| Telefone | ✅ | Hashed (SHA-256) |
| Cidade/Estado | ✅ | Texto plano |
| Evento (Lead, Schedule) | ✅ | Texto plano (genérico) |
| Valor do procedimento | ✅ | Numérico (sem detalhe) |
| Nome | ❌ | — |
| Dados clínicos | ⛔ NUNCA | — |

**Consentimento**: Checkbox explícito no primeiro contato do lead.

### 9.4 Políticas de Retenção de Dados

| Tipo de dado | Retenção | Base legal |
|--------------|----------|------------|
| Prontuários clínicos | 20 anos | Obrigação legal (CFM/CFO) |
| Dados de marketing/lead | 3 anos após último contato | Legítimo interesse |
| Logs de auditoria | 5 anos | Legítimo interesse |
| Gravações de áudio (Voice Control) | 12 meses | Consentimento |
| Backups | 90 dias | Execução contratual |
| Ex-paciente (dados comerciais) | Excluídos em 30 dias | Direito ao esquecimento |
| Ex-paciente (dados clínicos) | 20 anos (criptografados, isolados) | Obrigação legal |

### 9.5 O Dilema da Exclusão (LGPD vs CFM)

A LGPD garante o "Direito ao Esquecimento", mas o CFM/CFO exige guarda de prontuários por 20 anos. O painel de Compliance permite ao Admin:

* **Anonimizar** o lead comercial (apagando nome, e-mail e telefone para fins de marketing)
* **Bloquear** a exclusão do prontuário clínico, mantendo-o criptografado e isolado para fins de auditoria legal

### 9.6 ANVISA e Rastreabilidade

* Rastreabilidade de lotes conforme RDC 17/2010
* SNGPC: Integração futura para medicamentos controlados (Fase 3)
* Recall de lotes: Workflow para retirada de produtos com notificação automática
* Alertas de validade com antecedência configurável

### 9.7 Assinatura Digital e Validade Jurídica

| Tipo | Certificado | Uso |
|------|-------------|-----|
| **Clínica (e-CNPJ / A1)** | Único por tenant | NFS-e, contratos, guias TISS, documentos fiscais |
| **Profissional (e-CPF / A1)** | Individual por profissional | Prontuários, evoluções, receituários, atestados |
| **Alternativa sem certificado** | Integração com ClickSign/Assinafy/Memed | Validação por e-mail/WhatsApp |

**Cofre de Certificados**: Gestão centralizada com monitoramento de validade e alertas proativos (30, 15, 7 dias).

---

## 10. Segurança

### 10.1 Criptografia

* **Em repouso**: AES-256 para todos os dados sensíveis (prontuários, tokens, certificados)
* **Em trânsito**: TLS 1.3 obrigatório em todas as comunicações
* **Key rotation**: Chaves AES rotacionadas anualmente; tokens Meta API a cada 60 dias

### 10.2 Autenticação dos Operadores

**Modelo Híbrido**:

* **Standard**: Email + Senha + MFA (TOTP via Google Authenticator)
  - MFA obrigatório para Administradores
  - MFA configurável para demais perfis
* **Premium/Enterprise**: SSO via OIDC (Azure AD, Google Workspace) como add-on

**Política de Senhas** (baseada em NIST SP 800-63B):
* Mínimo 12 caracteres com complexidade (maiúscula + número + especial)
* Sem expiração temporal — monitoramento contínuo contra listas de senhas vazadas (HaveIBeenPwned API)
* Histórico: impede reutilização das últimas 3 senhas
* Bloqueio após 5 tentativas falhas; desbloqueio após 1 hora ou alteração de senha

**Sessão**:
* Timeout: 60 min para operadores gerais, 30 min para acesso a PEP
* **Sessão única**: Novo login força logout no dispositivo anterior (sem múltiplas sessões)
* Step-up authentication para ações sensíveis (deletar paciente, exportar dados, alterar configs)

### 10.3 WAF e Proteção

* **WAF**: AWS WAF ou Cloudflare com regras customizadas para healthtech
* Proteção contra: SQL Injection, XSS, CSRF, DDoS
* Rate limiting por endpoint e por tenant

### 10.4 Security Pipeline (CI/CD)

* **SAST**: Análise estática em cada PR (ex: SonarQube, Semgrep)
* **DAST**: Scan dinâmico em staging a cada release
* **SCA**: Dependency scanning para vulnerabilidades em pacotes (Snyk/Dependabot)
* **Secret scanning**: Prevenção de commits com tokens/senhas no repositório
* **Pentest externo**: Anual, antes do lançamento público
* **Bug Bounty e SOC 2**: Roadmap de Fase 3

### 10.5 Data Masking

* Ambientes de staging/QA utilizam **dados sintéticos**, nunca dados reais  
* Scripts de seed automatizados para popular ambientes de teste  
* Mascaramento automático em logs (CPF, telefone, email parcialmente ocultados)

### 10.6 Monitoramento e Observabilidade

| Categoria | Ferramenta | Propósito |
|-----------|------------|-----------|
| **Erros/Exceptions** | Sentry | Captura e alertas de erros em tempo real |
| **Métricas/Logs** | Grafana + Loki | Dashboards de performance, análise de logs |
| **Uptime** | Better Uptime | Monitoramento externo, página de status |
| **Alertas** | Slack + Opsgenie | Notificações para equipe, escalonamento |

---

## 11. Integrações

### 11.1 Hub Omnichannel — Prioridade de Canais

| Prioridade | Canal | Fase | Limites por Plano |
|------------|-------|------|-------------------|
| 1 | **WhatsApp Cloud API** | Fase 1 | Standard: 1 número; Premium+: múltiplos |
| 2 | **Instagram DM** (Graph API) | Fase 2 | Standard: 1 conta; Premium+: múltiplas |
| 3 | **Telegram** | Fase 2 | Premium+ apenas |
| 4 | **E-mail** | Fase 2 | Todos os planos |
| 5 | **TikTok DM** | Fase 3 | Premium+ apenas (API ainda imatura) |

### 11.2 WhatsApp — Modelo de Custos

**Conversas inclusas por plano**:

* Standard: 500/mês
* Premium: 2.000/mês

**Excedente**: Pacotes de créditos com markup de 30% sobre custo Meta.

### 11.3 Plano de Contingência de Canais

Se a Meta revogar ou restringir acesso à API:

1. **BSP secundário** como contingência imediata (360dialog/Gupshup)
2. **SMS via Zenvia** para mensagens críticas (confirmação de consulta, OTP)
3. **E-mail** como canal de fallback universal

### 11.4 Onboarding WhatsApp
> ⚠️ **Aviso de Risco e Compliance:** Esta opção utiliza bibliotecas não-oficiais que violam os Termos de Serviço da Meta. O PipeVitta oferece esta modalidade exclusivamente para clientes que optarem pela praticidade de não sofrerem "travas" da API oficial, **assumindo o risco total de banimento do número**. Um checkbox de aceite de risco obrigatório será exibido na interface antes da ativação.

Fluxo **Embedded Signup** da Meta:

1. Cliente faz login com Facebook dentro da PipeVitta
2. Cria/conecta o número de WhatsApp Business
3. Sistema recebe `WABA_ID` e `Phone_Number_ID`
4. Tokens armazenados no Vault (nunca no banco relacional)

Fluxo **Device Linking / QR Code**:

1. PipeVitta inicializa uma nova instância de sessão e exibe um QR Code na interface do sistema.
2. Cliente abre o aplicativo do WhatsApp no celular, acessa "Aparelhos Conectados" e escaneia o QR Code gerado.
3. Sistema autentica a conexão do dispositivo e recebe os dados de estado da sessão (Session Keys/Auth State).
4. Credenciais de sessão são criptografadas e armazenadas no Vault.

### 11.5 Integrações de Marketing (Ads)

* Conexão via OAuth 2.0 com: Meta Marketing API, Google Ads API, TikTok Marketing API
* Rate limiting e retry logic para lidar com limites das plataformas
* Cache de métricas com atualização em background (15-30 min)
* Webhooks para alterações de status de campanha
* Permissões: Apenas "Gestor de Marketing" ou "Admin"

### 11.6 TISS (Convênios) — Fase 2+

O PipeVitta atua como **orquestrador**, não implementa TISS nativamente:

* Gera guias (Consulta, SP/SADT, Internação)
* Utiliza APIs de middleware (Hub de Convênios) para transmissão e validação
* Retorno das guias (XML) junto às operadoras
* Conformidade ANS sem onerar a engenharia

### 11.7 Demais Integrações

| Integração | Tipo | Fase |
|------------|------|------|
| **Assinatura Eletrônica** | ClickSign, Assinafy, Memed | Fase 1 |
| **Meta CAPI** | Server-side events | Fase 2 |
| **Google Calendar** | iCal feed (unidirecional) → bidirecional | Fase 1 → Fase 2 |
| **Contabilidade** | Exportação fiscal automatizada | Fase 2 |
| **Telemedicina** | Daily.co (vídeo) | Fase 3 |
| **Gateway Pagamento (Clínicas)** | AbacatePay (link de pagamento) | Fase 2 |
| **Open Banking** | Conciliação bancária automática | Fase 3 |

---

## 12. Modelo de Negócios e Pricing

### 12.1 Planos de Assinatura (SaaS Recorrente)

O PipeVitta opera com **2 planos públicos** (Standard e Premium), **1 add-on** (Módulo IA), **1 combo** (Premium + IA) e **1 plano privado** (Enterprise).

#### Planos Públicos

| Recurso | Standard (R$269,90) | Premium (R$499,90) |
|---------|---------------------|--------------------|
| **Profissionais** | 3 | Ilimitado |
| **Pacientes ativos** | 1.000 | Ilimitado |
| **Storage** | 10 GB | 50 GB |
| **Conversas WhatsApp/mês** | 500 | 2.000 |
| **Usuários do sistema** | 5 | Ilimitado |
| **Canais** | 1 WhatsApp + 1 Instagram | Todos |
| **CRM** | ✅ | ✅ |
| **Estoque** | ✅ (básico) | ✅ (avançado: baixa automática, curva ABC) |
| **Marketing Intelligence** | ❌ | ✅ |
| **TISS/Convênios** | ❌ | ✅ |
| **Financeiro Avançado** | ❌ | ✅ (DRE, NFS-e, régua de cobrança, split comissões) |
| **IA Copilot** | ❌ | ✅ (100 interações/mês) |
| **IA Autônoma** | ❌ | ❌ |
| **Multi-clínicas** | ❌ | ❌ |
| **SSO** | ❌ | ❌ |

#### Módulo IA (Add-on) — R$299,00/mês

Pode ser adicionado a **qualquer plano** (Standard ou Premium):

* 5.000 interações/mês (Copilot + Autônoma)
* IA Copilot: Assistente para operadores
* IA Autônoma: Atendimento automático ao lead via WhatsApp
* Excedente: R$0,05 por interação adicional

#### Combo Premium \+ IA — R$678,90/mês

Assinatura unificada que combina o plano Premium (R$499,90) + Módulo IA (R$299,00) com **desconto de R$119,10**:

* Todas as features do Premium
* Todas as features do Módulo IA
* Posicionado como melhor custo-benefício
* **Nota**: Não é um plano separado — é a mesma combinação de Premium + Módulo IA com desconto na contratação conjunta

#### Plano Enterprise — Valor Negociável (Privado)

Plano **100% personalizado**, não listado publicamente. Requer contato comercial.

| Aspecto | Descrição |
|---------|-----------|
| **Público** | Holdings, franquias, redes de clínicas |
| **Pricing** | Negociável caso a caso, com base na personalização |
| **Multi-clínicas** | ✅ (Super Admin, impersonação, ranking de unidades) |
| **SSO** | ✅ (SAML/OIDC com Azure AD, Google Workspace) |
| **Features customizadas** | Módulos ativados/desativados conforme necessidade |
| **IA** | Limites e modelos negociáveis |
| **Storage** | Negociável |
| **Conversas WhatsApp** | Negociável |
| **Suporte** | Dedicado, com SLA diferenciado |
| **Migração Concierge** | ✅ (equipe PipeVitta migra dados do sistema legado) |
| **Personalização de RBAC** | Perfis e transações sob medida |

### 12.2 Programa de Indicação (Referral)

* Indicação para plano Standard: **5% de desconto** recorrente
* Indicação para Premium ou Premium + IA: **10% de desconto** recorrente
* O desconto permanece ativo enquanto o indicado mantiver a assinatura
* Campanha permanente — transforma clientes em embaixadores

### 12.3 Gateway de Pagamento

* **Principal**: AbacatePay (Pix + Boleto + Cartão com recorrência)
* **Fallback/Internacional**: Stripe

---

## 13. Configurações do Sistema

O PipeVitta possui um sistema robusto de configurações organizado em 8 categorias:

### 13.1 🏢 Clínica e Identidade

* Dados cadastrais, CNPJ, horários de funcionamento, endereços
* Multi-clínicas (planos Enterprise)
* Personalização visual: Logo, cores, nomenclatura customizada

### 13.2 ⚕️ Operação Clínica

* Catálogo de serviços: Procedimentos, preços, durações, códigos TISS
* Salas e equipamentos
* Lista de medicamentos (controle ANVISA)
* Modelos de documentos (templates)

### 13.3 👥 Equipe e Permissões

* Profissionais e comissões (especialidades, % de repasse)
* Usuários do sistema (RBAC granular)
* Configurações de caixa
* Certificados digitais (e-CPF) — upload, cofre criptografado, monitoramento de validade

### 13.4 📅 Agenda e Atendimento

* Regras de agendamento (horários, intervalos, feriados, bloqueios)
* Templates de mensagens (WhatsApp, e-mail — aprovação Meta)
* Régua de cobrança automática
* Disparo em massa

### 13.5 💰 Financeiro

* Formas de pagamento (gateways, Pix, cartão, boleto)
* Contas bancárias
* Regras de orçamento (limite de desconto, aprovação)
* Emissão de NFS-e
* Relatórios personalizados

### 13.6 🔌 Integrações

* Hub Omnichannel (WhatsApp, Instagram, Telegram, TikTok)
* Meta CAPI (Pixel, conversões server-side)
* Cofre de certificados (e-CNPJ, e-CPF)
* TISS (middleware de convênios)
* Assinatura eletrônica
* Contabilidade (exportação fiscal)

### 13.7 📈 Marketing e Anúncios

* Contas de anúncios (Meta, Google, TikTok)
* Templates de campanha por nicho
* Regras de atribuição e janela de conversão
* Alertas de performance (CAC, ROAS, CPA)
* Snippet de tracking para landing pages

### 13.8 🔒 Segurança e Sistema

* MFA obrigatório, políticas de senha
* Auditoria e logs
* Importação/exportação de dados, exclusão LGPD
* Portal do Paciente (aparência, termos, Magic Link)
* Configuração de IA (tom de voz, base RAG)

### 13.9 Gestão de Configurações

* **Hierarquia**: Global (tenant) > Unidade > Usuário
* **Cache**: Redis para performance
* **Validação**: Regras de negócio em tempo real
* **Versionamento**: Templates e fluxos de trabalho versionados
* **Import/Export entre unidades** (holdings):
  - Formato padrão: JSON (com JSON Schema para validação)
  - Formato alternativo: YAML (legibilidade humana)
  - Metadata: `version`, `exported_at`, `exported_by`, `foo_new_ops_version`
  - Detecção de incompatibilidades de versão com sugestão de migração

---

## 14. Roadmap Estratégico (Fases Revisadas)

### Fase 1: Core Clínico (MVP) — Meses 1-5

**Escopo**:

* Agenda Multi-recursos (4 visualizações + modal + detalhamento)
* PEP básico (visão geral, evolução, mídias, orçamentos)
* Financeiro Básico (apenas Fluxo de Caixa via Double-Entry, sem split de comissões)
* RBAC mínimo (3 perfis: Admin, Profissional, Recepcionista)
* Configurações essenciais (Clínica, Equipe, Agenda, Financeiro)
* Onboarding Wizard (5 passos)
* Tela de Login e Autenticação
* iCal feed para Google Calendar

**KPIs de sucesso**:

* 3 clínicas beta ativas
* 20+ agendamentos/dia por clínica
* NPS > 40
* Tempo médio de onboarding < 20 min
* Uptime > 99.5%

---

### Fase 1.5: Complemento do Core — Meses 5-7

**Escopo**:

* Portal do Paciente completo (15 telas: login, OTP, consultas, faturas, exames, NPS, perfil)
* Configurações completas (todas as 8 categorias)
* Estoque Básico (entrada/saída, alertas de validade)
* Split de Comissões Automático no Financeiro
* RBAC completo (6 perfis) + Audit Trail
* Odontograma básico
* Prescrição Digital

---

### Fase 2: Aquisição e Retenção (Growth) — Meses 7-11

**Escopo**:

* Integração WhatsApp Cloud API (Embedded Signup)
* CRM completo (Kanban, Lead Scoring, Distribuição automática)
* Inbox Omnichannel (WhatsApp + Instagram + Telegram)
* Tracking Server-Side (Meta CAPI)
* Marketing Intelligence básico (Dashboard, conexão Meta Ads, CAC/ROAS)
* Régua de Relacionamento (Anti-No-Show, NPS, Aniversariantes)
* Estoque Avançado (baixa automática via PEP, curva ABC)
* Link de pagamento integrado (AbacatePay)
* Google Calendar bidirecional
* Chat Interno Colaborativo (@menções)
* Dark Mode (toggle para usuário)
* PWA (notificações push, offline básico)

**KPIs de sucesso**:

* 10+ clínicas ativas (pagantes)
* > 70% dos leads com tracking CAPI
* > 25% de redução de no-show
* Baseline de mensagens WhatsApp/mês estabelecido

---

### Fase 3: Inteligência e Escala — Meses 11-16

**Escopo**:

* IA Autônoma com RAG configurável
* Voice Control para prontuários
* Smile/Face Design Studio (simulações 3D)
* Integração TISS e Convênios
* **Plano Enterprise**: Multi-clínicas / Holdings (Super Admin, impersonação, ranking de unidades)
* **Plano Enterprise**: SSO (SAML/OIDC)
* **Plano Enterprise**: Personalização de features e RBAC sob medida
* Marketing Intelligence Avançado (Attribution multi-touch, A/B testing, predictive budgeting)
* Telemedicina via Daily.co
* Social-to-CRM com TikTok
* App nativo (se demanda comprovada)
* Open Banking (conciliação bancária)
* Bug Bounty e SOC 2
* SNGPC (medicamentos controlados)

---

## 15. Requisitos Não-Funcionais (NFRs)

### 15.1 Disponibilidade e Performance
* **SLA target**: 99.5% (MVP), escalando para 99.9% (Fase 3)
* **RPO**: ≤ 1 hora (perda máxima de dados aceitável)
* **RTO**: ≤ 4 horas (tempo para restauração)
* **Backup**: Diário automatizado, testado mensalmente
* **DR**: Multi-AZ na AWS para produção
* **Onboarding**: Clínica apta a receber primeiro agendamento em ≤ 15 minutos

### 15.2 Testes
* **Nível**: Recomendado (\~60% de cobertura)
* **Unit tests**: Lógica de negócio (financeiro, RBAC, comissões)
* **Integration tests**: APIs externas (WhatsApp, Meta CAPI)
* **E2E**: Playwright para fluxos críticos (agendamento, prontuário, pagamento)
* **Staging**: Dados sintéticos, nunca dados reais

### 15.3 Notificações

| Canal | Uso | Fase |
|-------|-----|------|
| **In-app (sino)** | Todos os eventos | 1 |
| **E-mail** | Resumos diários, faturas, relatórios | 1 |
| **WhatsApp** | Apenas críticos (cancelamento, segurança) | 2 |
| **Push (PWA)** | Tempo real para consultas | 2 |
| **SMS** | Reservado para OTP | 1 |

### 15.4 Internacionalização
* **MVP**: Apenas pt-BR
* **Arquitetura**: i18n-ready (chaves de tradução nos componentes, moeda configurável)
* **Sem overhead no MVP**, mas evita retrabalho futuro

### 15.5 Acessibilidade
* **Target**: WCAG 2.1 AA
* **Foco**: Contraste de cores, navegação por teclado, labels em formulários, alt text em imagens

### 15.6 Design System
* **Base**: Material Design 3 token system (conforme protótipos das 53+ telas)
* **Tipografia**: Inter (Google Fonts)
* **Ícones**: Material Symbols Outlined
* **Dark Mode**: Estrutura de CSS variables/tokens desde o MVP; toggle visível na Fase 2
* **Component Library**: Definida nos protótipos (sidebar, topbar, tabs, drawers, FAB, cards)

---

## 16. Gestão de Riscos e Mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| 1 | Reprovação no App Review da Meta (WhatsApp/Instagram) | Alta | Crítico | Iniciar cadastro como Meta Tech Provider no Mês 1; burocracia leva semanas |
| 2 | Complexidade do padrão TISS e Convênios | Alta | Alto | Orçar APIs middleware no MVP; não construir motor TISS do zero |
| 3 | Rejeição da IA por médicos conservadores | Média | Alto | Posicionar como "Assistente Administrativa/SDR"; diagnóstico/conduta sempre humanos |
| 4 | Meta revogar acesso WhatsApp API | Baixa | Crítico | BSP secundário (360dialog) + SMS Zenvia como fallback |
| 5 | Vazamento de dados cross-tenant | Baixa | Crítico | RLS + middleware de tenant + pentest anual + SAST contínuo |
| 6 | Custos de IA ultrapassando receita | Média | Alto | Multi-provider com router; limites por plano; excedente cobrado |
| 7 | Scope creep no MVP | Alta | Alto | Fase 1 estritamente limitada; Feature Flags para rollout gradual |

---

## 17. Suporte e Autosserviço

### 17.1 Chat Interno Colaborativo (Fase 2)
* Funciona como Slack/Teams interno
* Recepcionista pode @mencionar o profissional no chat do prontuário
* Integrado ao contexto do paciente

### 17.2 Suporte Nível 1 via IA
* Chatbot treinado na Knowledge Base do PipeVitta
* Resolve dúvidas de configuração e uso
* Casos complexos escalam para humanos via WhatsApp e E-mail

---

## 18. Onboarding e Migração

### 18.1 Wizard de Implantação
* Fluxo guiado em 5 passos com barra de progresso
* Detecção automática de nicho (Odonto, Estética, Médica, Veterinária)
* Templates pré-configurados de funis, automações e estoque
* **Meta**: Primeiro agendamento em ≤ 15 minutos

### 18.2 Migração Assistida
* Importação nativa via CSV/Excel (pacientes, histórico financeiro)
* **Enterprise**: "Migração Concierge" (equipe PipeVitta trata dados do sistema legado)

---

