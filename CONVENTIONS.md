# Convenções e Diretrizes de Desenvolvimento — PipeVitta

Este documento reúne os padrões arquiteturais, regras de estilo de código, políticas de segurança e fluxos de trabalho do monorepo **PipeVitta**. Seu objetivo é garantir o alinhamento de múltiplos agentes de IA e engenheiros humanos que colaboram no projeto.

---

## 📂 Estrutura de Diretórios (Monorepo)

O projeto é estruturado como um monorepo baseado em **npm workspaces**:

```
pipe-vitta-monorepo/
├── apps/
│   ├── api/                   # NestJS — Backend Core & API Gateway
│   └── web-app/               # Next.js 15+ (App Router) — Painel da Clínica (RevOps)
├── packages/
│   ├── database/              # Schema Prisma, migrações SQL e scripts de Seed
│   └── design-system/         # Tokens MD3, CSS centralizado e configs do Tailwind
├── docker-compose.yml         # Serviços locais (Postgres, Redis, RabbitMQ, Unleash)
├── package.json               # Configuração do NPM Workspaces
└── tsconfig.json              # Configurações TypeScript globais
```

---

## 🔒 Segurança: Multi-Tenancy e Row Level Security (RLS)

O isolamento entre as clínicas (*tenants*) é assegurado a nível de banco de dados através de políticas **PostgreSQL RLS** e forçado usando a configuração `FORCE ROW LEVEL SECURITY`.

### 1. Papéis de Conexão no Banco
* **Usuário Limitado (`pipevitta_app`)**: Utilizado pelo backend em tempo de execução e testes automatizados. Este usuário está sujeito às políticas de RLS e **não** possui privilégios de superusuário ou Bypass RLS.
* **Usuário Administrador (`pipevitta_admin`)**: Utilizado exclusivamente para DDL (migrações) e para popular dados globais (`seed.ts`). Bypassa RLS automaticamente.

### 2. Injeção Dinâmica de Tenant
O identificador do tenant atual é extraído do cabeçalho da requisição ou decodificado de JWTs e injetado em um contexto seguro usando o `AsyncLocalStorage` (`tenantLocalStorage` em `packages/database`).
A extensão de query do Prisma intercepta todas as chamadas e executa a configuração local antes da consulta em uma transação segura:
```typescript
const [_, result] = await basePrisma.$transaction([
  basePrisma.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`),
  query(args),
]);
```

### 3. Convenção de Consultas Manuais em Testes e Workers
Devido às limitações de sandbox de bibliotecas como o Jest ou contextos fora do ciclo de vida HTTP do Express/NestJS, o `AsyncLocalStorage` pode perder o contexto.
* **Sempre que for necessário fazer queries manuais ou consultas em testes/background workers**, encapsule a consulta em um bloco `$transaction` manual:
```typescript
const patient = await db.client.$transaction(async (tx) => {
  await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`);
  return tx.patient.findFirst({ where: { id } });
});
```

---

## 🛑 Padrões do Backend (NestJS — `apps/api`)

### 1. Tipagem TypeScript
* **Sem `any`**: O uso do tipo `any` é proibido. Para valores dinâmicos ou desconhecidos, use `unknown` aliado a asserções (*type guards*).
* **Retornos de Métodos**: Declare explicitamente o tipo de retorno de todos os métodos, services e rotas de controllers (ex: `Promise<UserDto>` ou `Promise<void>`).

### 2. Validação e DTOs
* Toda rota que recebe payload de entrada (`@Body()`, `@Query()`, `@Param()`) deve conter uma classe DTO correspondente.
* Utilize as bibliotecas `class-validator` e `class-transformer` no DTO para validação.
* Configure o `ValidationPipe` global com `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.

### 3. Lógica de Domínio e Fluxos
* **Controllers**: Apenas mapeamento de rotas, DTOs e retorno de respostas.
* **Services**: Contêm as regras de negócio puras (ex: regras centavo-a-centavo de split financeiro, validações de recursos de agenda concorrentes).
* **Tratamento de Erros**: Lance exceções semânticas do NestJS (`NotFoundException`, `ConflictException`, `BadRequestException`). Nunca propague exceções cruas do banco.

---

## 💻 Padrões do Frontend (Next.js — `apps/web-app`)

### 1. App Router
* Todas as rotas usam o **Next.js App Router** dentro de `src/app/`.
* Mantenha as páginas que necessitam de autenticação agrupadas em diretórios de grupo para compartilhamento de layout, por exemplo:
  * `src/app/(auth)/login/page.tsx` (Sem sidebar/topbar shell)
  * `src/app/(dashboard)/layout.tsx` (Estrutura shell unificada)
  * `src/app/(dashboard)/page.tsx` (Dashboard principal)

### 2. Componentes (React 19)
* **Server Components**: Carregamento inicial de dados direto do banco/API e otimização de SEO.
* **Client Components**: Usados exclusivamente para interações complexas do usuário (modais, formulários, toggles). Declare a diretiva `'use client'` no topo.

### 3. Estilização: Tailwind CSS v4 & Design System
* Toda a estilização deve seguir estritamente o sistema **Material Design 3 (MD3)** definido no arquivo [DESIGN.md](file:///home/s163544417/Documentos/Thailan%20-%20Pessoal/Projetos/PipeVitta/DESIGN.md).
* **Carregamento de Configurações**: No arquivo global `globals.css`, importe o arquivo de configuração v3 compartilhado do design system:
  ```css
  @import "tailwindcss";
  @config "../../../../packages/design-system/tailwind.config.js";
  ```
* **Uso Estrito de Tokens**: É proibido o uso de cores hexadecimais *inline* no Tailwind. Use sempre as variáveis de cor semânticas:
  * Fundo primário: `bg-primary`
  * Textos: `text-on-background` ou `text-on-primary`
  * Containers de cartões: `bg-surface-container-lowest` (branco puro) ou `bg-surface-container` (cinza suave do MD3)
  * Bordas: `border-outline-variant`

### 4. Iconografia
* Use exclusivamente a biblioteca **Material Symbols Outlined** (carregada no layout do Next.js).
* Estrutura HTML: `<span className="material-symbols-outlined">nome_do_icone</span>`.
* Para ícones em estado ativo/selecionado, adicione a classe `.filled-icon`.

---

## 🤖 Guia de Trabalho para Agentes de IA

Sempre que iniciar ou continuar uma tarefa no repositório, você deve respeitar o fluxo abaixo:

1. **Investigar o Contexto**:
   * Leia a transcrição e o progresso da sessão anterior.
   * Consulte o arquivo `task.md` localizado no diretório de dados da aplicação (`/home/s163544417/.gemini/antigravity/brain/...`) para saber quais tarefas estão pendentes.
2. **Atualizar o Plano**:
   * Qualquer alteração arquitetural deve ser escrita em `implementation_plan.md` e aguardar a validação do usuário.
3. **Validação das Alterações**:
   * Sempre execute a suíte de testes e2e do backend antes de concluir qualquer etapa:
     `npm run db:seed && npm run test:e2e --workspace=apps/api`
   * Certifique-se de que o build do frontend Next.js complete sem erros:
     `npm run build --workspace=apps/web-app`
