# CRM de Tráfego Pago — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um CRM web em português com login, follow-up de leads, segmentação por cidade, gestão de alunos e exportação CSV, deployado via Docker no EasyPanel.

**Architecture:** Next.js 14 App Router para frontend e rotas de API. Supabase cloud para banco PostgreSQL e autenticação. Todos os dados são compartilhados entre usuários autenticados (RLS de time compartilhado). CSV gerado no navegador.

**Tech Stack:** Next.js 14, TypeScript 5 (strict), Tailwind CSS 3, shadcn/ui, @supabase/supabase-js 2, @supabase/ssr, Jest, @testing-library/react, @testing-library/jest-dom

## Global Constraints

- Todo texto de UI em Português (Brasil)
- Dark mode fixo (sem toggle de tema)
- Rotas `/dashboard/*` exigem autenticação; não autenticados → `/login`
- Rota `/dashboard/config` exige role `admin`; vendedores → `/dashboard/follow-up`
- CSV: UTF-8 com BOM (`﻿`), separador vírgula, compatível com Excel
- RLS: time compartilhado — qualquer autenticado lê/escreve todos os registros
- Node.js 20, TypeScript strict mode, App Router (não Pages Router)
- Nomes de variáveis/funções em inglês; textos de UI em português

---

## Mapa de Arquivos

```
src/
  app/
    layout.tsx                  # Root HTML layout, dark class no <html>
    page.tsx                    # Redireciona para /login ou /dashboard
    login/
      page.tsx                  # Página de login (Server Component)
      actions.ts                # Server Action: signIn, signOut
    dashboard/
      layout.tsx                # Layout com sidebar fixa
      page.tsx                  # Redireciona para /dashboard/follow-up
      follow-up/
        page.tsx                # Aba Follow-up
      cidades/
        page.tsx                # Aba Tráfego por Cidade
      alunos/
        page.tsx                # Aba Alunos
      config/
        page.tsx                # Aba Configurações (admin only)
  components/
    sidebar.tsx                 # Navegação lateral com visibilidade por role
    formulario-lead.tsx         # Modal criar/editar lead (Dialog)
    tabela-leads.tsx            # Tabela de leads com paginação
    barra-filtros.tsx           # Filtros de data e status
    modal-follow-up.tsx         # Modal registrar follow-up
    cards-cidade.tsx            # Cards com total de leads por cidade
    formulario-aluno.tsx        # Modal criar/editar aluno
    tabela-alunos.tsx           # Tabela de alunos com paginação
    botao-exportar-csv.tsx      # Botão que gera e baixa CSV
  lib/
    supabase/
      client.ts                 # createBrowserClient()
      server.ts                 # createServerClient() para Server Components
    types.ts                    # Interfaces: Lead, Cidade, Aluno, FollowUp
    csv.ts                      # generateCSV() e downloadCSV()
    date-filters.ts             # getDateRange() para filtros de 7/14/30 dias
  hooks/
    use-leads.ts                # CRUD de leads via Supabase
    use-cidades.ts              # CRUD de cidades via Supabase
    use-alunos.ts               # CRUD de alunos via Supabase
    use-follow-ups.ts           # Buscar e criar follow-ups de um lead
  middleware.ts                 # Proteção de rotas + redirect por role
supabase/
  migrations/
    001_initial_schema.sql      # Tabelas + RLS policies
Dockerfile                      # Build multi-stage para produção
.env.example                    # Template de variáveis de ambiente
```

---

### Tarefa 1: Inicialização do Projeto

**Files:**
- Create: `package.json` (via npx)
- Create: `tailwind.config.ts`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`

**Interfaces:**
- Produces: projeto Next.js configurado com TypeScript, Tailwind, shadcn/ui e Jest prontos

- [ ] **Passo 1: Inicializar projeto Next.js 14**

```bash
cd "C:\Users\user\Desktop\Curso Nathan IA\projeto"
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Quando perguntado, responda:
- Would you like to use Turbopack? → No

- [ ] **Passo 2: Instalar dependências**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom ts-jest
```

- [ ] **Passo 3: Inicializar shadcn/ui**

```bash
npx shadcn@latest init
```

Quando perguntado:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Depois instalar os componentes necessários:

```bash
npx shadcn@latest add button dialog input label select table badge
```

- [ ] **Passo 4: Configurar Jest**

Criar `jest.config.ts`:

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default createJestConfig(config)
```

Criar `jest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

Adicionar ao `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **Passo 5: Criar .env.example**

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

Copiar para `.env.local` e preencher com os valores reais do Supabase.

- [ ] **Passo 6: Configurar dark mode no layout raiz**

Editar `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CRM Tráfego',
  description: 'Sistema de gestão de leads e alunos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Passo 7: Verificar que o projeto roda**

```bash
npm run dev
```

Acesse http://localhost:3000 — deve mostrar a página padrão do Next.js sem erros.

- [ ] **Passo 8: Commit**

```bash
git init
git add .
git commit -m "feat: inicializar projeto Next.js com TypeScript, Tailwind, shadcn/ui e Jest"
```

---

### Tarefa 2: Schema do Banco de Dados

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Interfaces:**
- Produces: tabelas `leads`, `cidades`, `alunos`, `follow_ups` com RLS ativo no Supabase

- [ ] **Passo 1: Criar arquivo de migração**

Criar `supabase/migrations/001_initial_schema.sql`:

```sql
-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de cidades
CREATE TABLE cidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  estado TEXT NOT NULL
);

-- Tabela de leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  data_contato DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('respondeu', 'nao_respondeu')),
  cidade_id UUID REFERENCES cidades(id) ON DELETE SET NULL,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de alunos
CREATE TABLE alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  data_matricula DATE NOT NULL,
  curso TEXT NOT NULL,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de follow-ups
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ativar RLS em todas as tabelas
ALTER TABLE cidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: time compartilhado — qualquer autenticado acessa tudo

-- cidades
CREATE POLICY "autenticados podem ler cidades" ON cidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir cidades" ON cidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar cidades" ON cidades FOR UPDATE TO authenticated USING (true);
CREATE POLICY "autenticados podem deletar cidades" ON cidades FOR DELETE TO authenticated USING (true);

-- leads
CREATE POLICY "autenticados podem ler leads" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir leads" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar leads" ON leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "autenticados podem deletar leads" ON leads FOR DELETE TO authenticated USING (true);

-- alunos
CREATE POLICY "autenticados podem ler alunos" ON alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir alunos" ON alunos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar alunos" ON alunos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "autenticados podem deletar alunos" ON alunos FOR DELETE TO authenticated USING (true);

-- follow_ups
CREATE POLICY "autenticados podem ler follow_ups" ON follow_ups FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir follow_ups" ON follow_ups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar follow_ups" ON follow_ups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "autenticados podem deletar follow_ups" ON follow_ups FOR DELETE TO authenticated USING (true);
```

- [ ] **Passo 2: Executar a migração no Supabase**

No painel do Supabase (supabase.com):
1. Abrir o projeto → SQL Editor
2. Colar o conteúdo do arquivo acima
3. Clicar em "Run"
4. Verificar que as 4 tabelas aparecem em Table Editor

- [ ] **Passo 3: Commit**

```bash
git add supabase/
git commit -m "feat: adicionar schema inicial do banco de dados com RLS"
```

---

### Tarefa 3: Tipos TypeScript + Utilitários

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/csv.ts`
- Create: `src/lib/date-filters.ts`
- Create: `src/__tests__/csv.test.ts`
- Create: `src/__tests__/date-filters.test.ts`

**Interfaces:**
- Produces:
  - `Lead`, `Cidade`, `Aluno`, `FollowUp` (interfaces exportadas de `types.ts`)
  - `generateCSV(rows, columns): string` e `downloadCSV(content, filename): void` (de `csv.ts`)
  - `getDateRange(filter: DateFilter): { start: Date; end: Date }` (de `date-filters.ts`)
  - `DateFilter = '7dias' | '14dias' | '30dias' | 'personalizado' | 'todos'`

- [ ] **Passo 1: Escrever testes para csv.ts**

Criar `src/__tests__/csv.test.ts`:

```typescript
import { generateCSV } from '@/lib/csv'

describe('generateCSV', () => {
  it('inclui BOM UTF-8 para compatibilidade com Excel', () => {
    const csv = generateCSV([{ nome: 'João' }], ['nome'])
    expect(csv.startsWith('﻿')).toBe(true)
  })

  it('gera cabeçalho com colunas corretas', () => {
    const csv = generateCSV([], ['nome', 'telefone', 'email'])
    expect(csv).toContain('nome,telefone,email')
  })

  it('gera linha de dados corretamente', () => {
    const csv = generateCSV(
      [{ nome: 'Maria', telefone: '11999999999', email: 'maria@email.com' }],
      ['nome', 'telefone', 'email']
    )
    expect(csv).toContain('Maria,11999999999,maria@email.com')
  })

  it('trata campos com vírgula usando aspas duplas', () => {
    const csv = generateCSV([{ nome: 'Silva, João' }], ['nome'])
    expect(csv).toContain('"Silva, João"')
  })

  it('retorna apenas cabeçalho quando não há dados', () => {
    const csv = generateCSV([], ['nome'])
    const lines = csv.replace('﻿', '').trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('nome')
  })
})
```

- [ ] **Passo 2: Rodar teste para confirmar falha**

```bash
npx jest csv.test --no-coverage
```

Esperado: FAIL — `Cannot find module '@/lib/csv'`

- [ ] **Passo 3: Implementar csv.ts**

Criar `src/lib/csv.ts`:

```typescript
export function generateCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T)[]
): string {
  const BOM = '﻿'
  const header = columns.join(',')

  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const value = String(row[col] ?? '')
        return value.includes(',') ? `"${value}"` : value
      })
      .join(',')
  )

  return BOM + [header, ...dataRows].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Passo 4: Rodar teste para confirmar aprovação**

```bash
npx jest csv.test --no-coverage
```

Esperado: PASS (5 testes)

- [ ] **Passo 5: Escrever testes para date-filters.ts**

Criar `src/__tests__/date-filters.test.ts`:

```typescript
import { getDateRange } from '@/lib/date-filters'

describe('getDateRange', () => {
  it('retorna range de 7 dias', () => {
    const { start, end } = getDateRange('7dias')
    const diffMs = end.getTime() - start.getTime()
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDias).toBe(7)
  })

  it('retorna range de 14 dias', () => {
    const { start, end } = getDateRange('14dias')
    const diffDias = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDias).toBe(14)
  })

  it('retorna range de 30 dias', () => {
    const { start, end } = getDateRange('30dias')
    const diffDias = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDias).toBe(30)
  })

  it('retorna null para filtro "todos"', () => {
    const result = getDateRange('todos')
    expect(result).toBeNull()
  })
})
```

- [ ] **Passo 6: Rodar para confirmar falha**

```bash
npx jest date-filters.test --no-coverage
```

Esperado: FAIL — `Cannot find module '@/lib/date-filters'`

- [ ] **Passo 7: Implementar date-filters.ts**

Criar `src/lib/date-filters.ts`:

```typescript
export type DateFilter = '7dias' | '14dias' | '30dias' | 'personalizado' | 'todos'

export function getDateRange(filter: DateFilter): { start: Date; end: Date } | null {
  if (filter === 'todos' || filter === 'personalizado') return null

  const dias = filter === '7dias' ? 7 : filter === '14dias' ? 14 : 30
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - dias)
  return { start, end }
}

export function formatDateBR(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return d.toLocaleDateString('pt-BR')
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
```

- [ ] **Passo 8: Rodar para confirmar aprovação**

```bash
npx jest date-filters.test --no-coverage
```

Esperado: PASS (4 testes)

- [ ] **Passo 9: Criar types.ts**

Criar `src/lib/types.ts`:

```typescript
export interface Cidade {
  id: string
  nome: string
  estado: string
}

export interface Lead {
  id: string
  nome: string
  telefone: string
  email: string | null
  data_contato: string
  status: 'respondeu' | 'nao_respondeu'
  cidade_id: string | null
  criado_por: string | null
  criado_em: string
  cidade?: Cidade
}

export interface Aluno {
  id: string
  nome: string
  telefone: string
  email: string
  data_matricula: string
  curso: string
  criado_por: string | null
  criado_em: string
}

export interface FollowUp {
  id: string
  lead_id: string
  data: string
  observacao: string
  usuario_id: string | null
}
```

- [ ] **Passo 10: Commit**

```bash
git add src/lib/ src/__tests__/
git commit -m "feat: adicionar tipos TypeScript e utilitários CSV e filtros de data"
```

---

### Tarefa 4: Cliente Supabase + Middleware

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` de `.env.local`
- Produces:
  - `createClient()` (browser, de `client.ts`) — usado em Client Components e hooks
  - `createServerClient()` (server, de `server.ts`) — usado em Server Components e Actions
  - Middleware que protege `/dashboard/*` e redireciona por role

- [ ] **Passo 1: Criar cliente browser**

Criar `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Passo 2: Criar cliente servidor**

Criar `src/lib/supabase/server.ts`:

```typescript
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Passo 3: Criar middleware**

Criar `src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Não autenticado tentando acessar dashboard → login
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Autenticado na página de login → dashboard
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Vendedor tentando acessar /dashboard/config → follow-up
  if (user && request.nextUrl.pathname.startsWith('/dashboard/config')) {
    const role = user.user_metadata?.role as string | undefined
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/follow-up', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Passo 4: Verificar que o servidor ainda roda sem erros**

```bash
npm run dev
```

Acesse http://localhost:3000 — deve redirecionar para `/login` (ainda não criada, resultará em 404 por enquanto, mas sem erro de compilação).

- [ ] **Passo 5: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts
git commit -m "feat: adicionar cliente Supabase e middleware de autenticação"
```

---

### Tarefa 5: Página de Login

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/__tests__/login.test.tsx`

**Interfaces:**
- Consumes: `createClient()` de `@/lib/supabase/client`; `createServerClient()` de `@/lib/supabase/server`
- Produces: página `/login` com formulário email+senha funcional

- [ ] **Passo 1: Escrever teste do formulário de login**

Criar `src/__tests__/login.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'

// Mock do Server Action
jest.mock('@/app/login/actions', () => ({
  signIn: jest.fn(),
}))

describe('LoginPage', () => {
  it('renderiza campos de email e senha', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('renderiza botão de entrar', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('mostra mensagem de erro quando passada via searchParams', () => {
    render(<LoginPage searchParams={{ error: 'Credenciais inválidas' }} />)
    expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Rodar para confirmar falha**

```bash
npx jest login.test --no-coverage
```

Esperado: FAIL — módulo não encontrado

- [ ] **Passo 3: Criar Server Action de login**

Criar `src/app/login/actions.ts`:

```typescript
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent('Email ou senha inválidos')}`)
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Passo 4: Criar página de login**

Criar `src/app/login/page.tsx`:

```typescript
import { signIn } from './actions'

interface Props {
  searchParams?: { error?: string }
}

export default function LoginPage({ searchParams }: Props) {
  const error = searchParams?.error

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 rounded-xl border border-border bg-card shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">CRM Tráfego</h1>
          <p className="text-sm text-muted-foreground">Entre com sua conta para acessar</p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form action={signIn} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Passo 5: Criar página raiz com redirect**

Criar `src/app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
```

- [ ] **Passo 6: Rodar os testes**

```bash
npx jest login.test --no-coverage
```

Esperado: PASS (3 testes)

- [ ] **Passo 7: Testar manualmente o fluxo de login**

```bash
npm run dev
```

1. Acesse http://localhost:3000 — deve redirecionar para `/login`
2. Insira email e senha inválidos — deve mostrar mensagem de erro
3. Insira as credenciais reais do Supabase — deve redirecionar para `/dashboard` (ainda 404)

- [ ] **Passo 8: Commit**

```bash
git add src/app/
git commit -m "feat: adicionar página de login com Server Action e redirect"
```

---

### Tarefa 6: Layout do Dashboard + Sidebar

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/sidebar.tsx`
- Create: `src/__tests__/sidebar.test.tsx`

**Interfaces:**
- Consumes: `signOut` de `@/app/login/actions`; `user.user_metadata.role` para visibilidade de Configurações
- Produces: layout com sidebar fixa exibindo Follow-up, Cidades, Alunos (e Configurações só para admin)

- [ ] **Passo 1: Escrever teste do Sidebar**

Criar `src/__tests__/sidebar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/sidebar'

// Mock do next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/follow-up',
}))

describe('Sidebar', () => {
  it('exibe itens de navegação para vendedor', () => {
    render(<Sidebar role="vendedor" />)
    expect(screen.getByText('Follow-up')).toBeInTheDocument()
    expect(screen.getByText('Cidades')).toBeInTheDocument()
    expect(screen.getByText('Alunos')).toBeInTheDocument()
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
  })

  it('exibe Configurações para admin', () => {
    render(<Sidebar role="admin" />)
    expect(screen.getByText('Configurações')).toBeInTheDocument()
  })

  it('exibe botão de sair', () => {
    render(<Sidebar role="vendedor" />)
    expect(screen.getByText('Sair')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Rodar para confirmar falha**

```bash
npx jest sidebar.test --no-coverage
```

Esperado: FAIL — módulo não encontrado

- [ ] **Passo 3: Criar componente Sidebar**

Criar `src/components/sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'

interface SidebarProps {
  role: string
}

const navItems = [
  { href: '/dashboard/follow-up', label: 'Follow-up' },
  { href: '/dashboard/cidades', label: 'Cidades' },
  { href: '/dashboard/alunos', label: 'Alunos' },
]

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const items = role === 'admin'
    ? [...navItems, { href: '/dashboard/config', label: 'Configurações' }]
    : navItems

  return (
    <aside className="w-56 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-bold text-foreground">CRM Tráfego</h2>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-border">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
```

- [ ] **Passo 4: Criar layout do dashboard**

Criar `src/app/dashboard/layout.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = (user.user_metadata?.role as string) ?? 'vendedor'

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Passo 5: Criar página /dashboard com redirect**

Criar `src/app/dashboard/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/dashboard/follow-up')
}
```

- [ ] **Passo 6: Criar placeholders das abas para navegação funcionar**

Criar `src/app/dashboard/follow-up/page.tsx`:
```typescript
export default function FollowUpPage() {
  return <div><h1 className="text-2xl font-bold text-foreground">Follow-up</h1></div>
}
```

Criar `src/app/dashboard/cidades/page.tsx`:
```typescript
export default function CidadesPage() {
  return <div><h1 className="text-2xl font-bold text-foreground">Tráfego por Cidade</h1></div>
}
```

Criar `src/app/dashboard/alunos/page.tsx`:
```typescript
export default function AlunosPage() {
  return <div><h1 className="text-2xl font-bold text-foreground">Alunos</h1></div>
}
```

Criar `src/app/dashboard/config/page.tsx`:
```typescript
export default function ConfigPage() {
  return <div><h1 className="text-2xl font-bold text-foreground">Configurações</h1></div>
}
```

- [ ] **Passo 7: Rodar testes**

```bash
npx jest sidebar.test --no-coverage
```

Esperado: PASS (3 testes)

- [ ] **Passo 8: Verificar visualmente**

```bash
npm run dev
```

Faça login e confirme: sidebar visível, navegação funcionando, Configurações aparece/desaparece conforme role.

- [ ] **Passo 9: Commit**

```bash
git add src/app/dashboard/ src/components/sidebar.tsx
git commit -m "feat: adicionar layout do dashboard com sidebar e navegação"
```

---

### Tarefa 7: Hooks de Dados

**Files:**
- Create: `src/hooks/use-leads.ts`
- Create: `src/hooks/use-cidades.ts`
- Create: `src/hooks/use-alunos.ts`
- Create: `src/hooks/use-follow-ups.ts`

**Interfaces:**
- Consumes: `createClient()` de `@/lib/supabase/client`; `Lead`, `Cidade`, `Aluno`, `FollowUp` de `@/lib/types`
- Produces:
  - `useLeads(): { leads, loading, createLead, updateLead, deleteLead, refetch }`
  - `useCidades(): { cidades, loading, createCidade, updateCidade, deleteCidade, refetch }`
  - `useAlunos(): { alunos, loading, createAluno, updateAluno, deleteAluno, refetch }`
  - `useFollowUps(leadId): { followUps, loading, createFollowUp }`

- [ ] **Passo 1: Criar use-leads.ts**

Criar `src/hooks/use-leads.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from '@/lib/types'

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('*, cidade:cidades(id, nome, estado)')
      .order('data_contato', { ascending: false })
    setLeads(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const createLead = async (lead: Omit<Lead, 'id' | 'criado_em' | 'cidade'> & { criado_por: string }) => {
    const { error } = await supabase.from('leads').insert(lead)
    if (!error) await fetchLeads()
    return { error }
  }

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error } = await supabase.from('leads').update(updates).eq('id', id)
    if (!error) await fetchLeads()
    return { error }
  }

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (!error) await fetchLeads()
    return { error }
  }

  return { leads, loading, createLead, updateLead, deleteLead, refetch: fetchLeads }
}
```

- [ ] **Passo 2: Criar use-cidades.ts**

Criar `src/hooks/use-cidades.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cidade } from '@/lib/types'

export function useCidades() {
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCidades = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('cidades').select('*').order('nome')
    setCidades(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCidades() }, [fetchCidades])

  const createCidade = async (cidade: Omit<Cidade, 'id'>) => {
    const { error } = await supabase.from('cidades').insert(cidade)
    if (!error) await fetchCidades()
    return { error }
  }

  const updateCidade = async (id: string, updates: Partial<Cidade>) => {
    const { error } = await supabase.from('cidades').update(updates).eq('id', id)
    if (!error) await fetchCidades()
    return { error }
  }

  const deleteCidade = async (id: string) => {
    const { error } = await supabase.from('cidades').delete().eq('id', id)
    if (!error) await fetchCidades()
    return { error }
  }

  return { cidades, loading, createCidade, updateCidade, deleteCidade, refetch: fetchCidades }
}
```

- [ ] **Passo 3: Criar use-alunos.ts**

Criar `src/hooks/use-alunos.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Aluno } from '@/lib/types'

export function useAlunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAlunos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('alunos')
      .select('*')
      .order('data_matricula', { ascending: false })
    setAlunos(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAlunos() }, [fetchAlunos])

  const createAluno = async (aluno: Omit<Aluno, 'id' | 'criado_em'> & { criado_por: string }) => {
    const { error } = await supabase.from('alunos').insert(aluno)
    if (!error) await fetchAlunos()
    return { error }
  }

  const updateAluno = async (id: string, updates: Partial<Aluno>) => {
    const { error } = await supabase.from('alunos').update(updates).eq('id', id)
    if (!error) await fetchAlunos()
    return { error }
  }

  const deleteAluno = async (id: string) => {
    const { error } = await supabase.from('alunos').delete().eq('id', id)
    if (!error) await fetchAlunos()
    return { error }
  }

  return { alunos, loading, createAluno, updateAluno, deleteAluno, refetch: fetchAlunos }
}
```

- [ ] **Passo 4: Criar use-follow-ups.ts**

Criar `src/hooks/use-follow-ups.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FollowUp } from '@/lib/types'

export function useFollowUps(leadId: string) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchFollowUps = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('lead_id', leadId)
      .order('data', { ascending: false })
    setFollowUps(data ?? [])
    setLoading(false)
  }, [supabase, leadId])

  useEffect(() => { fetchFollowUps() }, [fetchFollowUps])

  const createFollowUp = async (payload: { data: string; observacao: string; usuario_id: string }) => {
    const { error } = await supabase.from('follow_ups').insert({ ...payload, lead_id: leadId })
    if (!error) await fetchFollowUps()
    return { error }
  }

  return { followUps, loading, createFollowUp }
}
```

- [ ] **Passo 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: adicionar hooks de dados para leads, cidades, alunos e follow-ups"
```

---

### Tarefa 8: Aba Follow-up

**Files:**
- Create: `src/components/formulario-lead.tsx`
- Create: `src/components/barra-filtros.tsx`
- Create: `src/components/modal-follow-up.tsx`
- Create: `src/components/tabela-leads.tsx`
- Modify: `src/app/dashboard/follow-up/page.tsx`
- Create: `src/__tests__/barra-filtros.test.tsx`

**Interfaces:**
- Consumes: `useLeads()`, `useCidades()`, `useFollowUps()`, `getDateRange()`, `DateFilter`, `formatDateBR()`, `Lead`, `Cidade`
- Produces: aba Follow-up completa com filtros, tabela, modal de lead e modal de follow-up

- [ ] **Passo 1: Escrever teste do BarraFiltros**

Criar `src/__tests__/barra-filtros.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BarraFiltros } from '@/components/barra-filtros'

describe('BarraFiltros', () => {
  it('renderiza opções de filtro de data', () => {
    render(<BarraFiltros onFilterChange={jest.fn()} />)
    expect(screen.getByText('Últimos 7 dias')).toBeInTheDocument()
    expect(screen.getByText('Últimos 14 dias')).toBeInTheDocument()
    expect(screen.getByText('Último mês')).toBeInTheDocument()
    expect(screen.getByText('Todos')).toBeInTheDocument()
  })

  it('renderiza filtros de status', () => {
    render(<BarraFiltros onFilterChange={jest.fn()} />)
    expect(screen.getByText('Respondeu')).toBeInTheDocument()
    expect(screen.getByText('Não Respondeu')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Rodar para confirmar falha**

```bash
npx jest barra-filtros.test --no-coverage
```

Esperado: FAIL — módulo não encontrado

- [ ] **Passo 3: Criar BarraFiltros**

Criar `src/components/barra-filtros.tsx`:

```typescript
'use client'

import type { DateFilter } from '@/lib/date-filters'

interface BarraFiltrosProps {
  filtroData: DateFilter
  filtroStatus: 'todos' | 'respondeu' | 'nao_respondeu'
  dataInicio?: string
  dataFim?: string
  onFilterChange: (filtros: {
    filtroData: DateFilter
    filtroStatus: 'todos' | 'respondeu' | 'nao_respondeu'
    dataInicio?: string
    dataFim?: string
  }) => void
}

export function BarraFiltros({ filtroData, filtroStatus, dataInicio, dataFim, onFilterChange }: BarraFiltrosProps) {
  const dateOptions: { value: DateFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: '7dias', label: 'Últimos 7 dias' },
    { value: '14dias', label: 'Últimos 14 dias' },
    { value: '30dias', label: 'Último mês' },
    { value: 'personalizado', label: 'Personalizado' },
  ]

  const statusOptions = [
    { value: 'todos' as const, label: 'Todos' },
    { value: 'respondeu' as const, label: 'Respondeu' },
    { value: 'nao_respondeu' as const, label: 'Não Respondeu' },
  ]

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Período</label>
        <select
          value={filtroData}
          onChange={(e) => onFilterChange({ filtroData: e.target.value as DateFilter, filtroStatus, dataInicio, dataFim })}
          className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {dateOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {filtroData === 'personalizado' && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <input
              type="date"
              value={dataInicio ?? ''}
              onChange={(e) => onFilterChange({ filtroData, filtroStatus, dataInicio: e.target.value, dataFim })}
              className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <input
              type="date"
              value={dataFim ?? ''}
              onChange={(e) => onFilterChange({ filtroData, filtroStatus, dataInicio, dataFim: e.target.value })}
              className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </>
      )}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Status</label>
        <select
          value={filtroStatus}
          onChange={(e) => onFilterChange({ filtroData, filtroStatus: e.target.value as typeof filtroStatus, dataInicio, dataFim })}
          className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Passo 4: Criar FormularioLead**

Criar `src/components/formulario-lead.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Lead, Cidade } from '@/lib/types'
import { todayISO } from '@/lib/date-filters'

interface FormularioLeadProps {
  lead?: Lead
  cidades: Cidade[]
  onSave: (data: Omit<Lead, 'id' | 'criado_em' | 'cidade' | 'criado_por'>) => Promise<void>
  onClose: () => void
}

export function FormularioLead({ lead, cidades, onSave, onClose }: FormularioLeadProps) {
  const [form, setForm] = useState({
    nome: lead?.nome ?? '',
    telefone: lead?.telefone ?? '',
    email: lead?.email ?? '',
    data_contato: lead?.data_contato ?? todayISO(),
    status: lead?.status ?? 'nao_respondeu' as Lead['status'],
    cidade_id: lead?.cidade_id ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      email: form.email || null,
      cidade_id: form.cidade_id || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-4">
          {lead ? 'Editar Lead' : 'Novo Lead'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Nome *</label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Telefone *</label>
            <input
              required
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Data de Contato *</label>
            <input
              type="date"
              required
              value={form.data_contato}
              onChange={(e) => setForm({ ...form, data_contato: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Status *</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Lead['status'] })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="nao_respondeu">Não Respondeu</option>
              <option value="respondeu">Respondeu</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Cidade</label>
            <select
              value={form.cidade_id}
              onChange={(e) => setForm({ ...form, cidade_id: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sem cidade</option>
              {cidades.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} - {c.estado}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Passo 5: Criar ModalFollowUp**

Criar `src/components/modal-follow-up.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { todayISO, formatDateBR } from '@/lib/date-filters'
import type { FollowUp } from '@/lib/types'

interface ModalFollowUpProps {
  leadNome: string
  followUps: FollowUp[]
  onSave: (data: { data: string; observacao: string }) => Promise<void>
  onClose: () => void
}

export function ModalFollowUp({ leadNome, followUps, onSave, onClose }: ModalFollowUpProps) {
  const [form, setForm] = useState({ data: todayISO(), observacao: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setForm({ data: todayISO(), observacao: '' })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-1">Follow-up</h2>
        <p className="text-sm text-muted-foreground mb-4">{leadNome}</p>

        <form onSubmit={handleSubmit} className="space-y-3 mb-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Data da interação</label>
            <input
              type="date"
              required
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Observação</label>
            <textarea
              required
              rows={3}
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              placeholder="O que foi conversado..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>

        {followUps.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground">Histórico</p>
            {followUps.map((fu) => (
              <div key={fu.id} className="text-sm">
                <span className="font-medium text-foreground">{formatDateBR(fu.data)}</span>
                <span className="text-muted-foreground ml-2">{fu.observacao}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Passo 6: Criar TabelaLeads**

Criar `src/components/tabela-leads.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Lead, Cidade } from '@/lib/types'
import { formatDateBR } from '@/lib/date-filters'
import { ModalFollowUp } from './modal-follow-up'
import { useFollowUps } from '@/hooks/use-follow-ups'
import { createClient } from '@/lib/supabase/client'

interface TabelaLeadsProps {
  leads: Lead[]
  cidades: Cidade[]
  onEdit: (lead: Lead) => void
  onDelete: (id: string) => void
}

const PAGE_SIZE = 20

function FollowUpCell({ lead }: { lead: Lead }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const { followUps, createFollowUp } = useFollowUps(lead.id)

  const handleSave = async (data: { data: string; observacao: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    await createFollowUp({ ...data, usuario_id: user?.id ?? '' })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 rounded border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        Follow-up {followUps.length > 0 && `(${followUps.length})`}
      </button>
      {open && (
        <ModalFollowUp
          leadNome={lead.nome}
          followUps={followUps}
          onSave={handleSave}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export function TabelaLeads({ leads, onEdit, onDelete }: TabelaLeadsProps) {
  const [pagina, setPagina] = useState(1)
  const total = leads.length
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginados = leads.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Nome', 'Telefone', 'Data de Contato', 'Status', 'Cidade', 'Ações'].map((col) => (
                <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum lead encontrado
                </td>
              </tr>
            )}
            {paginados.map((lead) => (
              <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{lead.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.telefone}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateBR(lead.data_contato)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    lead.status === 'respondeu'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {lead.status === 'respondeu' ? 'Respondeu' : 'Não Respondeu'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lead.cidade ? `${lead.cidade.nome} - ${lead.cidade.estado}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(lead)}
                      className="text-xs px-2 py-1 rounded border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(lead.id)}
                      className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Deletar
                    </button>
                    <FollowUpCell lead={lead} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} leads</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <span className="px-3 py-1">{pagina} / {totalPaginas}</span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Passo 7: Implementar página Follow-up**

Substituir `src/app/dashboard/follow-up/page.tsx`:

```typescript
'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLeads } from '@/hooks/use-leads'
import { useCidades } from '@/hooks/use-cidades'
import { BarraFiltros } from '@/components/barra-filtros'
import { TabelaLeads } from '@/components/tabela-leads'
import { FormularioLead } from '@/components/formulario-lead'
import { getDateRange, type DateFilter } from '@/lib/date-filters'
import type { Lead } from '@/lib/types'

export default function FollowUpPage() {
  const { leads, loading, createLead, updateLead, deleteLead } = useLeads()
  const { cidades } = useCidades()
  const [modalAberto, setModalAberto] = useState(false)
  const [leadEditando, setLeadEditando] = useState<Lead | undefined>()
  const [filtroData, setFiltroData] = useState<DateFilter>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'respondeu' | 'nao_respondeu'>('todos')
  const [dataInicio, setDataInicio] = useState<string>()
  const [dataFim, setDataFim] = useState<string>()

  const leadsFiltrados = useMemo(() => {
    let resultado = leads

    const range = filtroData === 'personalizado'
      ? (dataInicio && dataFim ? { start: new Date(dataInicio), end: new Date(dataFim) } : null)
      : getDateRange(filtroData)

    if (range) {
      resultado = resultado.filter((l) => {
        const data = new Date(l.data_contato + 'T00:00:00')
        return data >= range.start && data <= range.end
      })
    }

    if (filtroStatus !== 'todos') {
      resultado = resultado.filter((l) => l.status === filtroStatus)
    }

    return resultado
  }, [leads, filtroData, filtroStatus, dataInicio, dataFim])

  const handleSave = async (data: Omit<Lead, 'id' | 'criado_em' | 'cidade' | 'criado_por'>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const criado_por = user?.id ?? ''

    if (leadEditando) {
      await updateLead(leadEditando.id, data)
    } else {
      await createLead({ ...data, criado_por })
    }
    setLeadEditando(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Follow-up</h1>
        <button
          onClick={() => { setLeadEditando(undefined); setModalAberto(true) }}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Novo Lead
        </button>
      </div>

      <BarraFiltros
        filtroData={filtroData}
        filtroStatus={filtroStatus}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onFilterChange={({ filtroData: fd, filtroStatus: fs, dataInicio: di, dataFim: df }) => {
          setFiltroData(fd)
          setFiltroStatus(fs)
          setDataInicio(di)
          setDataFim(df)
        }}
      />

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <TabelaLeads
          leads={leadsFiltrados}
          cidades={cidades}
          onEdit={(lead) => { setLeadEditando(lead); setModalAberto(true) }}
          onDelete={deleteLead}
        />
      )}

      {modalAberto && (
        <FormularioLead
          lead={leadEditando}
          cidades={cidades}
          onSave={handleSave}
          onClose={() => { setModalAberto(false); setLeadEditando(undefined) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Passo 8: Rodar testes**

```bash
npx jest barra-filtros.test --no-coverage
```

Esperado: PASS (2 testes)

- [ ] **Passo 9: Testar manualmente a aba Follow-up**

```bash
npm run dev
```

1. Faça login e acesse `/dashboard/follow-up`
2. Clique em "+ Novo Lead" e cadastre um lead com cidade
3. Verifique que o lead aparece na tabela
4. Teste os filtros de data e status
5. Clique em "Follow-up" e registre uma interação

- [ ] **Passo 10: Commit**

```bash
git add src/components/ src/app/dashboard/follow-up/
git commit -m "feat: implementar aba Follow-up com filtros, tabela e modal de follow-up"
```

---

### Tarefa 9: Aba Cidades + Exportação CSV

**Files:**
- Create: `src/components/cards-cidade.tsx`
- Create: `src/components/botao-exportar-csv.tsx`
- Modify: `src/app/dashboard/cidades/page.tsx`
- Create: `src/__tests__/botao-exportar-csv.test.tsx`

**Interfaces:**
- Consumes: `useLeads()`, `useCidades()`, `generateCSV()`, `downloadCSV()`, `Lead`, `Cidade`
- Produces: aba Cidades com cards por cidade, filtro, tabela de leads e exportação CSV

- [ ] **Passo 1: Escrever teste do BotaoExportarCSV**

Criar `src/__tests__/botao-exportar-csv.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { BotaoExportarCSV } from '@/components/botao-exportar-csv'

describe('BotaoExportarCSV', () => {
  it('renderiza botão com texto correto', () => {
    render(<BotaoExportarCSV dados={[]} colunas={['nome']} nomeArquivo="test.csv" />)
    expect(screen.getByText('Exportar CSV')).toBeInTheDocument()
  })

  it('botão está desabilitado quando não há dados', () => {
    render(<BotaoExportarCSV dados={[]} colunas={['nome']} nomeArquivo="test.csv" />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('botão está habilitado quando há dados', () => {
    render(
      <BotaoExportarCSV
        dados={[{ nome: 'João' }]}
        colunas={['nome']}
        nomeArquivo="test.csv"
      />
    )
    expect(screen.getByRole('button')).not.toBeDisabled()
  })
})
```

- [ ] **Passo 2: Rodar para confirmar falha**

```bash
npx jest botao-exportar-csv.test --no-coverage
```

Esperado: FAIL — módulo não encontrado

- [ ] **Passo 3: Criar BotaoExportarCSV**

Criar `src/components/botao-exportar-csv.tsx`:

```typescript
'use client'

import { generateCSV, downloadCSV } from '@/lib/csv'

interface BotaoExportarCSVProps<T extends Record<string, unknown>> {
  dados: T[]
  colunas: (keyof T)[]
  nomeArquivo: string
}

export function BotaoExportarCSV<T extends Record<string, unknown>>({
  dados,
  colunas,
  nomeArquivo,
}: BotaoExportarCSVProps<T>) {
  const handleExport = () => {
    const csv = generateCSV(dados, colunas)
    downloadCSV(csv, nomeArquivo)
  }

  return (
    <button
      onClick={handleExport}
      disabled={dados.length === 0}
      className="px-4 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Exportar CSV
    </button>
  )
}
```

- [ ] **Passo 4: Criar CardsCidade**

Criar `src/components/cards-cidade.tsx`:

```typescript
'use client'

import type { Cidade, Lead } from '@/lib/types'

interface CardsCidadeProps {
  cidades: Cidade[]
  leads: Lead[]
  cidadeSelecionada: string
  onSelecionar: (cidadeId: string) => void
}

export function CardsCidade({ cidades, leads, cidadeSelecionada, onSelecionar }: CardsCidadeProps) {
  const contagemPorCidade = cidades.reduce<Record<string, number>>((acc, c) => {
    acc[c.id] = leads.filter((l) => l.cidade_id === c.id).length
    return acc
  }, {})

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <button
        onClick={() => onSelecionar('')}
        className={`p-4 rounded-lg border text-left transition-colors ${
          cidadeSelecionada === ''
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:bg-accent'
        }`}
      >
        <p className="text-sm font-medium text-foreground">Todas as cidades</p>
        <p className="text-2xl font-bold text-foreground mt-1">
          {leads.filter((l) => l.cidade_id).length}
        </p>
        <p className="text-xs text-muted-foreground">leads com cidade</p>
      </button>

      {cidades.map((cidade) => (
        <button
          key={cidade.id}
          onClick={() => onSelecionar(cidade.id)}
          className={`p-4 rounded-lg border text-left transition-colors ${
            cidadeSelecionada === cidade.id
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:bg-accent'
          }`}
        >
          <p className="text-sm font-medium text-foreground">{cidade.nome}</p>
          <p className="text-xs text-muted-foreground mb-1">{cidade.estado}</p>
          <p className="text-2xl font-bold text-foreground">{contagemPorCidade[cidade.id] ?? 0}</p>
          <p className="text-xs text-muted-foreground">leads</p>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Passo 5: Implementar página Cidades**

Substituir `src/app/dashboard/cidades/page.tsx`:

```typescript
'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLeads } from '@/hooks/use-leads'
import { useCidades } from '@/hooks/use-cidades'
import { CardsCidade } from '@/components/cards-cidade'
import { TabelaLeads } from '@/components/tabela-leads'
import { FormularioLead } from '@/components/formulario-lead'
import { BotaoExportarCSV } from '@/components/botao-exportar-csv'
import type { Lead } from '@/lib/types'

export default function CidadesPage() {
  const { leads, loading, createLead, updateLead, deleteLead } = useLeads()
  const { cidades } = useCidades()
  const [cidadeSelecionada, setCidadeSelecionada] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [leadEditando, setLeadEditando] = useState<Lead | undefined>()

  const leadsComCidade = useMemo(
    () => leads.filter((l) => l.cidade_id),
    [leads]
  )

  const leadsFiltrados = useMemo(() => {
    if (!cidadeSelecionada) return leadsComCidade
    return leadsComCidade.filter((l) => l.cidade_id === cidadeSelecionada)
  }, [leadsComCidade, cidadeSelecionada])

  const cidadeAtual = cidades.find((c) => c.id === cidadeSelecionada)

  const dadosCSV = leadsFiltrados.map((l) => ({
    nome: l.nome,
    telefone: l.telefone,
    email: l.email ?? '',
  }))

  const nomeArquivoCSV = cidadeAtual
    ? `leads-${cidadeAtual.nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    : `leads-todas-cidades-${new Date().toISOString().split('T')[0]}.csv`

  const handleSave = async (data: Omit<Lead, 'id' | 'criado_em' | 'cidade' | 'criado_por'>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const criado_por = user?.id ?? ''

    if (leadEditando) {
      await updateLead(leadEditando.id, data)
    } else {
      await createLead({ ...data, criado_por })
    }
    setLeadEditando(undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tráfego por Cidade</h1>
        <button
          onClick={() => { setLeadEditando(undefined); setModalAberto(true) }}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Novo Lead
        </button>
      </div>

      <CardsCidade
        cidades={cidades}
        leads={leadsComCidade}
        cidadeSelecionada={cidadeSelecionada}
        onSelecionar={setCidadeSelecionada}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {leadsFiltrados.length} leads {cidadeAtual ? `em ${cidadeAtual.nome}` : 'com cidade'}
        </p>
        <BotaoExportarCSV
          dados={dadosCSV}
          colunas={['nome', 'telefone', 'email']}
          nomeArquivo={nomeArquivoCSV}
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <TabelaLeads
          leads={leadsFiltrados}
          cidades={cidades}
          onEdit={(lead) => { setLeadEditando(lead); setModalAberto(true) }}
          onDelete={deleteLead}
        />
      )}

      {modalAberto && (
        <FormularioLead
          lead={leadEditando}
          cidades={cidades}
          onSave={handleSave}
          onClose={() => { setModalAberto(false); setLeadEditando(undefined) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Passo 6: Rodar testes**

```bash
npx jest botao-exportar-csv.test --no-coverage
```

Esperado: PASS (3 testes)

- [ ] **Passo 7: Testar manualmente**

1. Acesse `/dashboard/cidades`
2. Clique em um card de cidade — tabela filtra
3. Clique em "Exportar CSV" — arquivo baixado, abre no Excel com acentos corretos

- [ ] **Passo 8: Commit**

```bash
git add src/components/cards-cidade.tsx src/components/botao-exportar-csv.tsx src/app/dashboard/cidades/
git commit -m "feat: implementar aba Cidades com cards, filtro por cidade e exportação CSV"
```

---

### Tarefa 10: Aba Alunos

**Files:**
- Create: `src/components/formulario-aluno.tsx`
- Create: `src/components/tabela-alunos.tsx`
- Modify: `src/app/dashboard/alunos/page.tsx`

**Interfaces:**
- Consumes: `useAlunos()`, `generateCSV()`, `downloadCSV()`, `BotaoExportarCSV`, `formatDateBR()`, `Aluno`
- Produces: aba Alunos com CRUD completo e exportação CSV

- [ ] **Passo 1: Criar FormularioAluno**

Criar `src/components/formulario-aluno.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Aluno } from '@/lib/types'
import { todayISO } from '@/lib/date-filters'

interface FormularioAlunoProps {
  aluno?: Aluno
  onSave: (data: Omit<Aluno, 'id' | 'criado_em' | 'criado_por'>) => Promise<void>
  onClose: () => void
}

export function FormularioAluno({ aluno, onSave, onClose }: FormularioAlunoProps) {
  const [form, setForm] = useState({
    nome: aluno?.nome ?? '',
    telefone: aluno?.telefone ?? '',
    email: aluno?.email ?? '',
    data_matricula: aluno?.data_matricula ?? todayISO(),
    curso: aluno?.curso ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-4">
          {aluno ? 'Editar Aluno' : 'Novo Aluno'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {(['nome', 'telefone', 'email', 'curso'] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-sm font-medium text-foreground capitalize">
                {field === 'nome' ? 'Nome *' : field === 'telefone' ? 'Telefone *' : field === 'email' ? 'Email *' : 'Curso *'}
              </label>
              <input
                required
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Data de Matrícula *</label>
            <input
              type="date"
              required
              value={form.data_matricula}
              onChange={(e) => setForm({ ...form, data_matricula: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Passo 2: Criar TabelaAlunos**

Criar `src/components/tabela-alunos.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Aluno } from '@/lib/types'
import { formatDateBR } from '@/lib/date-filters'

interface TabelaAlunosProps {
  alunos: Aluno[]
  onEdit: (aluno: Aluno) => void
  onDelete: (id: string) => void
}

const PAGE_SIZE = 20

export function TabelaAlunos({ alunos, onEdit, onDelete }: TabelaAlunosProps) {
  const [pagina, setPagina] = useState(1)
  const total = alunos.length
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginados = alunos.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Nome', 'Telefone', 'Email', 'Curso', 'Data de Matrícula', 'Ações'].map((col) => (
                <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum aluno cadastrado
                </td>
              </tr>
            )}
            {paginados.map((aluno) => (
              <tr key={aluno.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{aluno.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{aluno.telefone}</td>
                <td className="px-4 py-3 text-muted-foreground">{aluno.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{aluno.curso}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateBR(aluno.data_matricula)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(aluno)} className="text-xs px-2 py-1 rounded border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      Editar
                    </button>
                    <button onClick={() => onDelete(aluno.id)} className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                      Deletar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} alunos</span>
          <div className="flex gap-2">
            <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors">Anterior</button>
            <span className="px-3 py-1">{pagina} / {totalPaginas}</span>
            <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors">Próximo</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Passo 3: Implementar página Alunos**

Substituir `src/app/dashboard/alunos/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAlunos } from '@/hooks/use-alunos'
import { FormularioAluno } from '@/components/formulario-aluno'
import { TabelaAlunos } from '@/components/tabela-alunos'
import { BotaoExportarCSV } from '@/components/botao-exportar-csv'
import type { Aluno } from '@/lib/types'

export default function AlunosPage() {
  const { alunos, loading, createAluno, updateAluno, deleteAluno } = useAlunos()
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | undefined>()

  const dadosCSV = alunos.map((a) => ({
    nome: a.nome,
    telefone: a.telefone,
    email: a.email,
  }))

  const nomeArquivoCSV = `alunos-${new Date().toISOString().split('T')[0]}.csv`

  const handleSave = async (data: Omit<Aluno, 'id' | 'criado_em' | 'criado_por'>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const criado_por = user?.id ?? ''

    if (alunoEditando) {
      await updateAluno(alunoEditando.id, data)
    } else {
      await createAluno({ ...data, criado_por })
    }
    setAlunoEditando(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
        <div className="flex gap-2">
          <BotaoExportarCSV
            dados={dadosCSV}
            colunas={['nome', 'telefone', 'email']}
            nomeArquivo={nomeArquivoCSV}
          />
          <button
            onClick={() => { setAlunoEditando(undefined); setModalAberto(true) }}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Novo Aluno
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <TabelaAlunos
          alunos={alunos}
          onEdit={(aluno) => { setAlunoEditando(aluno); setModalAberto(true) }}
          onDelete={deleteAluno}
        />
      )}

      {modalAberto && (
        <FormularioAluno
          aluno={alunoEditando}
          onSave={handleSave}
          onClose={() => { setModalAberto(false); setAlunoEditando(undefined) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Passo 4: Testar manualmente**

1. Acesse `/dashboard/alunos`
2. Cadastre um aluno
3. Edite e delete
4. Clique "Exportar CSV" — arquivo com nome, telefone, email

- [ ] **Passo 5: Commit**

```bash
git add src/components/formulario-aluno.tsx src/components/tabela-alunos.tsx src/app/dashboard/alunos/
git commit -m "feat: implementar aba Alunos com CRUD e exportação CSV"
```

---

### Tarefa 11: Aba Configurações (Admin)

**Files:**
- Modify: `src/app/dashboard/config/page.tsx`

**Interfaces:**
- Consumes: `useCidades()`, `SUPABASE_SERVICE_ROLE_KEY` via Server Action, `createServerClient()`
- Produces: aba Configurações com gestão de usuários (via Supabase Admin API), cidades e troca de senha

- [ ] **Passo 1: Criar Server Actions de configurações**

Criar `src/app/dashboard/config/actions.ts`:

```typescript
'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function convidarUsuario(formData: FormData) {
  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const admin = getAdminClient()

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
  })

  if (error) return { error: error.message }
  return { error: null }
}

export async function removerUsuario(userId: string) {
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  return { error: null }
}

export async function trocarSenha(formData: FormData) {
  const novaSenha = formData.get('novaSenha') as string
  const supabase = await createServerClient()
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) return { error: error.message }
  return { error: null }
}

export async function listarUsuarios() {
  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return []
  return data.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    role: (u.user_metadata?.role as string) ?? 'vendedor',
  }))
}
```

Adicionar `NEXT_PUBLIC_APP_URL` ao `.env.local`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
(No EasyPanel, trocar para a URL real do domínio)

- [ ] **Passo 2: Implementar página de Configurações**

Substituir `src/app/dashboard/config/page.tsx`:

```typescript
import { listarUsuarios } from './actions'
import { ConfigClient } from './config-client'

export default async function ConfigPage() {
  const usuarios = await listarUsuarios()
  return <ConfigClient usuariosIniciais={usuarios} />
}
```

Criar `src/app/dashboard/config/config-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useCidades } from '@/hooks/use-cidades'
import { convidarUsuario, removerUsuario, trocarSenha } from './actions'

interface Usuario {
  id: string
  email: string
  role: string
}

export function ConfigClient({ usuariosIniciais }: { usuariosIniciais: Usuario[] }) {
  const { cidades, createCidade, updateCidade, deleteCidade } = useCidades()
  const [usuarios] = useState<Usuario[]>(usuariosIniciais)
  const [mensagem, setMensagem] = useState('')
  const [novaCidade, setNovaCidade] = useState({ nome: '', estado: '' })

  const handleConvidar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const { error } = await convidarUsuario(form)
    setMensagem(error ? `Erro: ${error}` : 'Convite enviado! O usuário receberá um email.')
    if (!error) (e.target as HTMLFormElement).reset()
  }

  const handleTrocarSenha = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const { error } = await trocarSenha(form)
    setMensagem(error ? `Erro: ${error}` : 'Senha alterada com sucesso!')
    if (!error) (e.target as HTMLFormElement).reset()
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      {mensagem && (
        <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
          <p className="text-sm text-foreground">{mensagem}</p>
        </div>
      )}

      {/* Convidar usuário */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Convidar Usuário</h2>
        <form onSubmit={handleConvidar} className="flex gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="email@exemplo.com"
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            name="role"
            className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="vendedor">Vendedor</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Convidar
          </button>
        </form>
      </section>

      {/* Lista de usuários */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Usuários</h2>
        <div className="rounded-lg border border-border divide-y divide-border">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{u.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
              </div>
              <button
                onClick={async () => {
                  if (confirm('Remover este usuário?')) await removerUsuario(u.id)
                }}
                className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Gerenciar cidades */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Cidades</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await createCidade(novaCidade)
            setNovaCidade({ nome: '', estado: '' })
          }}
          className="flex gap-2"
        >
          <input
            required
            placeholder="Nome da cidade"
            value={novaCidade.nome}
            onChange={(e) => setNovaCidade({ ...novaCidade, nome: e.target.value })}
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            required
            placeholder="UF"
            maxLength={2}
            value={novaCidade.estado}
            onChange={(e) => setNovaCidade({ ...novaCidade, estado: e.target.value.toUpperCase() })}
            className="w-16 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Adicionar
          </button>
        </form>

        <div className="rounded-lg border border-border divide-y divide-border">
          {cidades.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">{c.nome} — {c.estado}</span>
              <button
                onClick={() => deleteCidade(c.id)}
                className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Trocar senha */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Trocar Senha</h2>
        <form onSubmit={handleTrocarSenha} className="flex gap-2">
          <input
            name="novaSenha"
            type="password"
            required
            minLength={6}
            placeholder="Nova senha (mín. 6 caracteres)"
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Alterar
          </button>
        </form>
      </section>
    </div>
  )
}
```

- [ ] **Passo 3: Testar manualmente como admin**

1. Acesse `/dashboard/config` com usuário admin
2. Convide um novo usuário — verifique que email é enviado pelo Supabase
3. Adicione uma cidade — deve aparecer na lista e nos dropdowns
4. Troque a senha

- [ ] **Passo 4: Commit**

```bash
git add src/app/dashboard/config/
git commit -m "feat: implementar aba Configurações com gestão de usuários, cidades e senha"
```

---

### Tarefa 12: Dockerfile + Deploy

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Produces: imagem Docker pronta para deploy no EasyPanel, porta 3000

- [ ] **Passo 1: Criar .dockerignore**

Criar `.dockerignore`:

```
node_modules
.next
.env.local
.env*.local
npm-debug.log*
.git
.gitignore
README.md
docs/
```

- [ ] **Passo 2: Criar Dockerfile multi-stage**

Criar `Dockerfile`:

```dockerfile
# Estágio 1: Dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Estágio 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Estágio 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Passo 3: Habilitar output standalone no Next.js**

Editar `next.config.ts` para adicionar `output: 'standalone'`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Passo 4: Verificar build local**

```bash
npm run build
```

Esperado: build concluído sem erros.

- [ ] **Passo 5: Testar build Docker localmente (opcional)**

Se Docker estiver instalado:

```bash
docker build -t crm-trafego .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=sua_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave \
  -e SUPABASE_SERVICE_ROLE_KEY=sua_service_key \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  crm-trafego
```

Acesse http://localhost:3000 e verifique que o login funciona.

- [ ] **Passo 6: Configurar no EasyPanel**

No painel do EasyPanel:
1. Criar nova app → "From Dockerfile"
2. Apontar para o repositório ou fazer upload
3. Configurar variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (URL pública do domínio no EasyPanel)
4. Porta: 3000
5. Deploy

- [ ] **Passo 7: Commit final**

```bash
git add Dockerfile .dockerignore next.config.ts
git commit -m "feat: adicionar Dockerfile multi-stage para deploy no EasyPanel"
```

---

## Checklist de Cobertura do Spec

| Requisito do Spec | Tarefa |
|---|---|
| Login com email e senha | Tarefa 5 |
| Proteção de rotas `/dashboard/*` | Tarefa 4 |
| Redirect vendedor de `/dashboard/config` | Tarefa 4 |
| Sidebar com visibilidade por role | Tarefa 6 |
| Aba Follow-up com filtros 7/14/30 dias e personalizado | Tarefa 8 |
| Formulário unificado de lead (todos os campos) | Tarefa 8 |
| Modal de Follow-up com histórico | Tarefa 8 |
| Aba Cidades com cards por cidade | Tarefa 9 |
| Exportação CSV de leads por cidade | Tarefa 9 |
| Aba Alunos com CRUD | Tarefa 10 |
| Exportação CSV de alunos | Tarefa 10 |
| Aba Configurações (admin) — convidar usuários | Tarefa 11 |
| Aba Configurações — gerenciar cidades | Tarefa 11 |
| Aba Configurações — trocar senha | Tarefa 11 |
| CSV UTF-8 com BOM para Excel | Tarefa 3 |
| Dark mode em português | Tarefa 1 |
| RLS time compartilhado | Tarefa 2 |
| Dockerfile para EasyPanel | Tarefa 12 |
