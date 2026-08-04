# WhatsApp dentro do CRM (Z-API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma aba "WhatsApp" ao CRM onde o time conversa de verdade (texto, imagem, áudio, nos dois sentidos) com leads através de um ou mais números conectados via Z-API, com caixa de entrada compartilhada e cadastro rápido de lead a partir da conversa.

**Architecture:** Next.js Server Actions + uma rota de API (webhook) chamam a REST API da Z-API para enviar mensagens e recebem eventos dela via webhook. Tudo persiste no Supabase (Postgres + Storage), e a tela usa Supabase Realtime para atualizar sozinha quando chega mensagem nova. Segue exatamente os padrões já estabelecidos no restante do CRM (hooks `use-*` com Supabase client no navegador, Server Actions com `createServerClient()`/`createAdminClient()`, RLS de "time compartilhado").

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Supabase (Postgres, Realtime, Storage, Auth) + Z-API (REST + webhook).

## Global Constraints

- Toda a interface em português (nomes de variáveis de domínio, labels, mensagens de erro), consistente com o resto do CRM.
- RLS "time compartilhado": qualquer usuário autenticado lê e escreve as tabelas de conversas/mensagens — sem isolamento por usuário (spec seção 3.5).
- Credenciais da Z-API (`token`, `client_token`, `webhook_secret`) nunca chegam ao navegador — só Server Actions / service role as leem (spec seção 3.5 e 7).
- Mídia fica em bucket privado do Supabase Storage, nunca pública (spec seção 7).
- Sem suporte a documentos/PDF, figurinhas, confirmação de leitura, grupos, mensagens automáticas nesta versão (spec seção 10).
- O endpoint de webhook não é testável com `localhost` — só depois do deploy ou com túnel (spec seção 8). O envio (CRM → Z-API) não tem essa limitação.
- Endpoints e formato de payload da Z-API usados neste plano foram confirmados em `developer.z-api.io` em 2026-08-04. Se a Z-API tiver mudado algo até a implementação, ajuste o código dos Tasks 4 e 7 conforme a documentação atual no momento — não são garantidos como imutáveis.

---

## Mapa de arquivos

**Novos:**
- `supabase/migrations/003_whatsapp.sql`
- `src/lib/supabase/admin.ts`
- `src/lib/zapi/webhook.ts` + teste
- `src/lib/zapi/cliente.ts`
- `src/lib/zapi/midia.ts`
- `src/app/dashboard/whatsapp/actions.ts`
- `src/app/dashboard/whatsapp/page.tsx`
- `src/app/api/webhooks/zapi/[instanciaId]/route.ts`
- `src/hooks/use-whatsapp-instancias.ts`
- `src/hooks/use-whatsapp-conversas.ts`
- `src/hooks/use-whatsapp-mensagens.ts`
- `src/components/whatsapp/bolha-mensagem.tsx` + teste
- `src/components/whatsapp/lista-conversas.tsx` + teste
- `src/components/whatsapp/janela-conversa.tsx` + teste
- `src/components/whatsapp/modal-cadastrar-lead.tsx` + teste
- `src/components/whatsapp/formulario-instancia.tsx` + teste

**Modificados:**
- `src/lib/types.ts` (novos tipos)
- `src/app/dashboard/config/actions.ts` (usa `createAdminClient` compartilhado + novas actions de instância)
- `src/app/dashboard/config/config-client.tsx` (seção de WhatsApp)
- `src/components/sidebar.tsx` (novo item de navegação)
- `src/__tests__/sidebar.test.tsx` (ajustar para o novo item)

---

### Task 1: Migração do banco de dados

**Files:**
- Create: `supabase/migrations/003_whatsapp.sql`

**Interfaces:**
- Produces: tabelas `whatsapp_instancias(id, apelido, telefone, instance_id, token, client_token, webhook_secret, ativo, criado_em)`, `whatsapp_conversas(id, instancia_id, telefone_contato, nome_contato, lead_id, ultima_mensagem_em, criado_em)`, `whatsapp_mensagens(id, conversa_id, direcao, tipo, conteudo_texto, midia_url, enviado_por, status_envio, criado_em)`; bucket de Storage `whatsapp-midia` (privado).

- [ ] **Step 1: Escrever a migração**

```sql
-- supabase/migrations/003_whatsapp.sql

CREATE TABLE whatsapp_instancias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apelido TEXT NOT NULL,
  telefone TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  token TEXT NOT NULL,
  client_token TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_conversas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instancia_id UUID REFERENCES whatsapp_instancias(id) ON DELETE SET NULL,
  telefone_contato TEXT NOT NULL,
  nome_contato TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ultima_mensagem_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (instancia_id, telefone_contato)
);

CREATE TABLE whatsapp_mensagens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id UUID NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  direcao TEXT NOT NULL CHECK (direcao IN ('recebida', 'enviada')),
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'imagem', 'audio')),
  conteudo_texto TEXT,
  midia_url TEXT,
  enviado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  status_envio TEXT NOT NULL DEFAULT 'enviado' CHECK (status_envio IN ('enviando', 'enviado', 'falhou')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE whatsapp_instancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_mensagens ENABLE ROW LEVEL SECURITY;

-- whatsapp_instancias: só leitura para o cliente autenticado (dropdown de
-- filtro / lista em Configurações). Toda escrita acontece via service role
-- nas Server Actions admin (mesmo padrão de convidarUsuario/removerUsuario
-- em dashboard/config/actions.ts), então não há política de INSERT/UPDATE/
-- DELETE aqui — service role sempre ignora RLS.
CREATE POLICY "autenticados podem ler instancias" ON whatsapp_instancias FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON whatsapp_instancias FROM authenticated;
GRANT SELECT (id, apelido, telefone, ativo, criado_em) ON whatsapp_instancias TO authenticated;

-- whatsapp_conversas: autenticados leem tudo e atualizam (vincular lead_id,
-- atualizar ultima_mensagem_em ao enviar). Só o webhook (service role) cria
-- conversa nova a partir de mensagem recebida — sem política de INSERT.
CREATE POLICY "autenticados podem ler conversas" ON whatsapp_conversas FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem atualizar conversas" ON whatsapp_conversas FOR UPDATE TO authenticated USING (true);

-- whatsapp_mensagens: autenticados leem tudo, inserem mensagens com
-- enviado_por = eles mesmos (mesma proteção de autoria de criado_por em
-- leads/alunos), e só podem atualizar o status de envio (não o conteúdo).
CREATE POLICY "autenticados podem ler mensagens" ON whatsapp_mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir mensagens" ON whatsapp_mensagens FOR INSERT TO authenticated WITH CHECK (enviado_por = auth.uid());
CREATE POLICY "autenticados podem atualizar mensagens" ON whatsapp_mensagens FOR UPDATE TO authenticated USING (true);

REVOKE UPDATE ON whatsapp_mensagens FROM authenticated;
GRANT UPDATE (status_envio) ON whatsapp_mensagens TO authenticated;

-- Storage: bucket privado para fotos e áudios do WhatsApp.
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-midia', 'whatsapp-midia', false);

CREATE POLICY "autenticados podem ler midia whatsapp" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'whatsapp-midia');
CREATE POLICY "autenticados podem enviar midia whatsapp" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'whatsapp-midia');
```

- [ ] **Step 2: Aplicar a migração no Supabase real**

Use a ferramenta MCP do Supabase (`apply_migration`, projeto `lwitpxfbuhqdgfdaclwn`, nome `whatsapp`) com o SQL acima. Depois, rode `list_tables` e `get_advisors` (tipo `security`) para confirmar que as 3 tabelas existem, RLS está ativo, e não apareceu nenhum alerta novo.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_whatsapp.sql
git commit -m "feat: adicionar tabelas e storage para integração WhatsApp (Z-API)"
```

---

### Task 2: Tipos TypeScript e cliente admin compartilhado

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/supabase/admin.ts`
- Modify: `src/app/dashboard/config/actions.ts:1-12`

**Interfaces:**
- Produces: `WhatsappInstancia`, `WhatsappConversa`, `WhatsappMensagem` (em `@/lib/types`); `createAdminClient()` (em `@/lib/supabase/admin`).

- [ ] **Step 1: Adicionar os tipos em `src/lib/types.ts`**

Adicione ao final do arquivo (depois de `FollowUp`):

```ts
export interface WhatsappInstancia {
  id: string
  apelido: string
  telefone: string
  ativo: boolean
}

export interface WhatsappConversa {
  id: string
  instancia_id: string | null
  telefone_contato: string
  nome_contato: string | null
  lead_id: string | null
  ultima_mensagem_em: string
  criado_em: string
  instancia?: WhatsappInstancia
  lead?: Pick<Lead, 'id' | 'nome'>
}

export interface WhatsappMensagem {
  id: string
  conversa_id: string
  direcao: 'recebida' | 'enviada'
  tipo: 'texto' | 'imagem' | 'audio'
  conteudo_texto: string | null
  midia_url: string | null
  enviado_por: string | null
  status_envio: 'enviando' | 'enviado' | 'falhou'
  criado_em: string
}
```

- [ ] **Step 2: Extrair o cliente admin compartilhado**

Crie `src/lib/supabase/admin.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 3: Atualizar `src/app/dashboard/config/actions.ts` para usar o cliente compartilhado**

Troque:

```ts
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

Por:

```ts
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
```

E troque as 3 chamadas `getAdminClient()` (dentro de `convidarUsuario`, `removerUsuario`, `listarUsuarios`) por `createAdminClient()`.

- [ ] **Step 4: Rodar a suíte de testes e o typecheck para garantir que nada quebrou**

Run: `npm test && npx tsc --noEmit`
Expected: todos os testes passam (o comportamento de `config/actions.ts` não mudou, só a origem da função).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/supabase/admin.ts src/app/dashboard/config/actions.ts
git commit -m "refactor: extrair cliente admin do Supabase compartilhado e adicionar tipos do WhatsApp"
```

---

### Task 3: `lib/zapi` — validação de webhook e parser de mensagem recebida (TDD)

**Files:**
- Create: `src/lib/zapi/webhook.ts`
- Test: `src/__tests__/zapi-webhook.test.ts`

**Interfaces:**
- Produces: `validarAssinaturaWebhook(secretRecebido: string | null, secretEsperado: string): boolean`, `extrairMensagemRecebida(payload: unknown): MensagemRecebidaZApi | null`, `interface MensagemRecebidaZApi { telefone: string; nomeContato: string | null; tipo: 'texto' | 'imagem' | 'audio'; conteudoTexto: string | null; midiaUrl: string | null; momento: Date }`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// src/__tests__/zapi-webhook.test.ts
import { validarAssinaturaWebhook, extrairMensagemRecebida } from '@/lib/zapi/webhook'

describe('validarAssinaturaWebhook', () => {
  it('retorna true quando o segredo bate', () => {
    expect(validarAssinaturaWebhook('abc123', 'abc123')).toBe(true)
  })

  it('retorna false quando o segredo não bate', () => {
    expect(validarAssinaturaWebhook('abc123', 'outroSegredo')).toBe(false)
  })

  it('retorna false quando não veio segredo nenhum', () => {
    expect(validarAssinaturaWebhook(null, 'abc123')).toBe(false)
  })
})

describe('extrairMensagemRecebida', () => {
  it('extrai mensagem de texto', () => {
    const payload = {
      type: 'ReceivedCallback',
      fromMe: false,
      phone: '5544999999999',
      momment: 1632228638000,
      senderName: 'Maria',
      text: { message: 'Oi, quero saber mais sobre o curso' },
    }
    expect(extrairMensagemRecebida(payload)).toEqual({
      telefone: '5544999999999',
      nomeContato: 'Maria',
      tipo: 'texto',
      conteudoTexto: 'Oi, quero saber mais sobre o curso',
      midiaUrl: null,
      momento: new Date(1632228638000),
    })
  })

  it('extrai mensagem de imagem com legenda', () => {
    const payload = {
      type: 'ReceivedCallback',
      fromMe: false,
      phone: '5544999999999',
      momment: 1632228828000,
      senderName: 'Maria',
      image: { imageUrl: 'https://z-api.example/img.jpg', caption: 'Print do erro' },
    }
    expect(extrairMensagemRecebida(payload)).toEqual({
      telefone: '5544999999999',
      nomeContato: 'Maria',
      tipo: 'imagem',
      conteudoTexto: 'Print do erro',
      midiaUrl: 'https://z-api.example/img.jpg',
      momento: new Date(1632228828000),
    })
  })

  it('extrai mensagem de áudio', () => {
    const payload = {
      type: 'ReceivedCallback',
      fromMe: false,
      phone: '5544999999999',
      momment: 1632228849000,
      senderName: null,
      audio: { audioUrl: 'https://z-api.example/audio.ogg' },
    }
    expect(extrairMensagemRecebida(payload)).toEqual({
      telefone: '5544999999999',
      nomeContato: null,
      tipo: 'audio',
      conteudoTexto: null,
      midiaUrl: 'https://z-api.example/audio.ogg',
      momento: new Date(1632228849000),
    })
  })

  it('ignora mensagens enviadas por mim mesmo (fromMe true)', () => {
    const payload = {
      type: 'ReceivedCallback',
      fromMe: true,
      phone: '5544999999999',
      momment: 1632228638000,
      text: { message: 'Oi' },
    }
    expect(extrairMensagemRecebida(payload)).toBeNull()
  })

  it('ignora eventos que não são de mensagem recebida', () => {
    const payload = { type: 'MessageStatusCallback', phone: '5544999999999' }
    expect(extrairMensagemRecebida(payload)).toBeNull()
  })

  it('ignora payload malformado sem phone', () => {
    const payload = { type: 'ReceivedCallback', fromMe: false, momment: 123, text: { message: 'oi' } }
    expect(extrairMensagemRecebida(payload)).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx jest src/__tests__/zapi-webhook.test.ts`
Expected: FAIL — `Cannot find module '@/lib/zapi/webhook'`.

- [ ] **Step 3: Implementar**

```ts
// src/lib/zapi/webhook.ts
import { timingSafeEqual } from 'crypto'

export function validarAssinaturaWebhook(secretRecebido: string | null, secretEsperado: string): boolean {
  if (!secretRecebido) return false
  const a = Buffer.from(secretRecebido)
  const b = Buffer.from(secretEsperado)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export interface MensagemRecebidaZApi {
  telefone: string
  nomeContato: string | null
  tipo: 'texto' | 'imagem' | 'audio'
  conteudoTexto: string | null
  midiaUrl: string | null
  momento: Date
}

export function extrairMensagemRecebida(payload: unknown): MensagemRecebidaZApi | null {
  if (typeof payload !== 'object' || payload === null) return null
  const p = payload as Record<string, unknown>

  if (p.type !== 'ReceivedCallback') return null
  if (p.fromMe === true) return null
  if (typeof p.phone !== 'string') return null
  if (typeof p.momment !== 'number') return null

  const nomeContato = typeof p.senderName === 'string' ? p.senderName : null
  const momento = new Date(p.momment)

  const texto = p.text as { message?: string } | undefined
  if (texto && typeof texto.message === 'string') {
    return { telefone: p.phone, nomeContato, tipo: 'texto', conteudoTexto: texto.message, midiaUrl: null, momento }
  }

  const imagem = p.image as { imageUrl?: string; caption?: string } | undefined
  if (imagem && typeof imagem.imageUrl === 'string') {
    return { telefone: p.phone, nomeContato, tipo: 'imagem', conteudoTexto: imagem.caption || null, midiaUrl: imagem.imageUrl, momento }
  }

  const audio = p.audio as { audioUrl?: string } | undefined
  if (audio && typeof audio.audioUrl === 'string') {
    return { telefone: p.phone, nomeContato, tipo: 'audio', conteudoTexto: null, midiaUrl: audio.audioUrl, momento }
  }

  return null
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx jest src/__tests__/zapi-webhook.test.ts`
Expected: PASS, 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/zapi/webhook.ts src/__tests__/zapi-webhook.test.ts
git commit -m "feat: adicionar validação de webhook e parser de mensagem recebida da Z-API"
```

---

### Task 4: `lib/zapi` — cliente de envio e download de mídia

**Files:**
- Create: `src/lib/zapi/cliente.ts`
- Create: `src/lib/zapi/midia.ts`

**Interfaces:**
- Consumes: nenhuma (task independente).
- Produces: `enviarTexto(credenciais, telefone, mensagem)`, `enviarImagem(credenciais, telefone, imagemUrl, legenda?)`, `enviarAudio(credenciais, telefone, audioUrl)` — todas retornam `Promise<{ ok: true; data: { zaapId: string; messageId: string } } | { ok: false; erro: string }>`; `interface CredenciaisInstancia { instance_id: string; token: string; client_token: string }`; `baixarEArmazenarMidia(admin: SupabaseClient, urlOrigem: string, tipo: 'imagem' | 'audio'): Promise<string | null>` (retorna o caminho no Storage, não uma URL).

Sem teste automatizado nesta task: as três funções de envio fazem chamadas HTTP reais para a Z-API, e testar isso de verdade exige uma instância conectada (só possível manualmente, ver Task 15). O parsing/validação que dá pra testar sem rede já foi coberto na Task 3.

- [ ] **Step 1: Implementar o cliente de envio**

```ts
// src/lib/zapi/cliente.ts
const BASE_URL = 'https://api.z-api.io'

export interface CredenciaisInstancia {
  instance_id: string
  token: string
  client_token: string
}

interface RespostaEnvioZApi {
  zaapId: string
  messageId: string
}

type ResultadoEnvio =
  | { ok: true; data: RespostaEnvioZApi }
  | { ok: false; erro: string }

async function chamarZApi(
  credenciais: CredenciaisInstancia,
  caminho: string,
  corpo: Record<string, unknown>
): Promise<ResultadoEnvio> {
  const url = `${BASE_URL}/instances/${credenciais.instance_id}/token/${credenciais.token}${caminho}`

  let resposta: Response
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': credenciais.client_token,
      },
      body: JSON.stringify(corpo),
    })
  } catch {
    return { ok: false, erro: 'Não foi possível conectar com a Z-API' }
  }

  if (!resposta.ok) {
    return { ok: false, erro: `Z-API respondeu ${resposta.status}` }
  }

  const data = (await resposta.json()) as RespostaEnvioZApi
  return { ok: true, data }
}

export function enviarTexto(credenciais: CredenciaisInstancia, telefone: string, mensagem: string) {
  return chamarZApi(credenciais, '/send-text', { phone: telefone, message: mensagem })
}

export function enviarImagem(credenciais: CredenciaisInstancia, telefone: string, imagemUrl: string, legenda?: string) {
  return chamarZApi(credenciais, '/send-image', { phone: telefone, image: imagemUrl, caption: legenda ?? '' })
}

export function enviarAudio(credenciais: CredenciaisInstancia, telefone: string, audioUrl: string) {
  return chamarZApi(credenciais, '/send-audio', { phone: telefone, audio: audioUrl })
}
```

- [ ] **Step 2: Implementar o download de mídia recebida**

```ts
// src/lib/zapi/midia.ts
import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function baixarEArmazenarMidia(
  admin: SupabaseClient,
  urlOrigem: string,
  tipo: 'imagem' | 'audio'
): Promise<string | null> {
  let resposta: Response
  try {
    resposta = await fetch(urlOrigem)
  } catch {
    return null
  }
  if (!resposta.ok) return null

  const bytes = await resposta.arrayBuffer()
  const extensao = tipo === 'imagem' ? 'jpg' : 'ogg'
  const contentType = tipo === 'imagem' ? 'image/jpeg' : 'audio/ogg'
  const caminho = `${tipo}/${randomUUID()}.${extensao}`

  const { error } = await admin.storage.from('whatsapp-midia').upload(caminho, bytes, { contentType })
  if (error) return null

  return caminho
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/zapi/cliente.ts src/lib/zapi/midia.ts
git commit -m "feat: adicionar cliente de envio e download de mídia da Z-API"
```

---

### Task 5: Server Actions de gestão de instância (Configurações)

**Files:**
- Modify: `src/app/dashboard/config/actions.ts` (adicionar ao final)

**Interfaces:**
- Consumes: `createServerClient` de `@/lib/supabase/server`, `createAdminClient` de `@/lib/supabase/admin` (Task 2).
- Produces: `criarInstanciaWhatsapp(formData: FormData): Promise<{ error: string | null; webhookUrl: string | null }>`, `removerInstanciaWhatsapp(id: string): Promise<{ error: string | null }>`.

Sem teste automatizado dedicado — mesmo padrão das outras Server Actions deste arquivo (`convidarUsuario`, `removerUsuario`), que também não têm teste unitário próprio no repositório; a cobertura vem do teste do formulário que as chama (Task 6) com a action mockada, e da verificação manual (Task 15).

- [ ] **Step 1: Adicionar as actions**

No final de `src/app/dashboard/config/actions.ts`, adicione:

```ts
import { randomUUID } from 'crypto'

export async function criarInstanciaWhatsapp(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user: usuarioLogado } } = await supabase.auth.getUser()
  if (usuarioLogado?.app_metadata?.role !== 'admin') {
    return { error: 'Não autorizado', webhookUrl: null }
  }

  const apelido = formData.get('apelido') as string
  const telefone = formData.get('telefone') as string
  const instanceId = formData.get('instanceId') as string
  const token = formData.get('token') as string
  const clientToken = formData.get('clientToken') as string
  const webhookSecret = randomUUID()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('whatsapp_instancias')
    .insert({
      apelido,
      telefone,
      instance_id: instanceId,
      token,
      client_token: clientToken,
      webhook_secret: webhookSecret,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, webhookUrl: null }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/zapi/${data.id}?secret=${webhookSecret}`
  return { error: null, webhookUrl }
}

export async function removerInstanciaWhatsapp(id: string) {
  const supabase = await createServerClient()
  const { data: { user: usuarioLogado } } = await supabase.auth.getUser()
  if (usuarioLogado?.app_metadata?.role !== 'admin') {
    return { error: 'Não autorizado' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('whatsapp_instancias').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
```

Mova o `import { randomUUID } from 'crypto'` para o topo do arquivo, junto dos outros imports.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/config/actions.ts
git commit -m "feat: adicionar Server Actions para gerenciar instâncias de WhatsApp"
```

---

### Task 6: UI de gestão de instância em Configurações (TDD)

**Files:**
- Create: `src/hooks/use-whatsapp-instancias.ts`
- Create: `src/components/whatsapp/formulario-instancia.tsx`
- Test: `src/__tests__/formulario-instancia.test.tsx`
- Modify: `src/app/dashboard/config/config-client.tsx`

**Interfaces:**
- Consumes: `WhatsappInstancia` (Task 2), `criarInstanciaWhatsapp`/`removerInstanciaWhatsapp` (Task 5).
- Produces: `useWhatsappInstancias(): { instancias: WhatsappInstancia[]; loading: boolean; refetch: () => Promise<void> }`; `<FormularioInstancia instancias={WhatsappInstancia[]} onChange={() => void} />`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/__tests__/formulario-instancia.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormularioInstancia } from '@/components/whatsapp/formulario-instancia'

const mockCriar = jest.fn()
const mockRemover = jest.fn()
jest.mock('@/app/dashboard/config/actions', () => ({
  criarInstanciaWhatsapp: (formData: FormData) => mockCriar(formData),
  removerInstanciaWhatsapp: (id: string) => mockRemover(id),
}))

describe('FormularioInstancia', () => {
  beforeEach(() => {
    mockCriar.mockReset()
    mockRemover.mockReset()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renderiza os campos obrigatórios', () => {
    render(<FormularioInstancia instancias={[]} onChange={jest.fn()} />)
    expect(screen.getByPlaceholderText(/apelido/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/telefone/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/instance id/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/token da instância/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/client-token/i)).toBeInTheDocument()
  })

  it('lista as instâncias existentes com apelido e status', () => {
    render(
      <FormularioInstancia
        instancias={[{ id: '1', apelido: 'WhatsApp Nathan', telefone: '5511999999999', ativo: true }]}
        onChange={jest.fn()}
      />
    )
    expect(screen.getByText('WhatsApp Nathan')).toBeInTheDocument()
    expect(screen.getByText(/5511999999999.*ativo/)).toBeInTheDocument()
  })

  it('ao criar com sucesso, mostra a URL do webhook e chama onChange', async () => {
    mockCriar.mockResolvedValue({ error: null, webhookUrl: 'https://exemplo.com/api/webhooks/zapi/123?secret=abc' })
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<FormularioInstancia instancias={[]} onChange={onChange} />)

    await user.type(screen.getByPlaceholderText(/apelido/i), 'WhatsApp Nathan')
    await user.type(screen.getByPlaceholderText(/telefone/i), '5511999999999')
    await user.type(screen.getByPlaceholderText(/instance id/i), 'inst123')
    await user.type(screen.getByPlaceholderText(/token da instância/i), 'tok123')
    await user.type(screen.getByPlaceholderText(/client-token/i), 'ct123')
    await user.click(screen.getByRole('button', { name: /adicionar número/i }))

    expect(mockCriar).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('https://exemplo.com/api/webhooks/zapi/123?secret=abc')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ao remover, pede confirmação e chama removerInstanciaWhatsapp', async () => {
    mockRemover.mockResolvedValue({ error: null })
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(
      <FormularioInstancia
        instancias={[{ id: '1', apelido: 'WhatsApp Nathan', telefone: '5511999999999', ativo: true }]}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /remover/i }))

    expect(mockRemover).toHaveBeenCalledWith('1')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx jest src/__tests__/formulario-instancia.test.tsx`
Expected: FAIL — módulo `@/components/whatsapp/formulario-instancia` não existe.

- [ ] **Step 3: Implementar o hook**

```ts
// src/hooks/use-whatsapp-instancias.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WhatsappInstancia } from '@/lib/types'

export function useWhatsappInstancias() {
  const [instancias, setInstancias] = useState<WhatsappInstancia[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchInstancias = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('whatsapp_instancias')
      .select('id, apelido, telefone, ativo')
      .order('apelido')
    setInstancias(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchInstancias() }, [fetchInstancias])

  return { instancias, loading, refetch: fetchInstancias }
}
```

- [ ] **Step 4: Implementar o componente**

```tsx
// src/components/whatsapp/formulario-instancia.tsx
'use client'

import { useState } from 'react'
import { criarInstanciaWhatsapp, removerInstanciaWhatsapp } from '@/app/dashboard/config/actions'
import type { WhatsappInstancia } from '@/lib/types'

interface FormularioInstanciaProps {
  instancias: WhatsappInstancia[]
  onChange: () => void
}

export function FormularioInstancia({ instancias, onChange }: FormularioInstanciaProps) {
  const [mensagem, setMensagem] = useState('')
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)

  const handleCriar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const resultado = await criarInstanciaWhatsapp(formData)
    if (resultado.error) {
      setMensagem(`Erro: ${resultado.error}`)
      setWebhookUrl(null)
    } else {
      setMensagem('Número adicionado! Cole a URL abaixo no painel da Z-API, em "Webhook ao receber".')
      setWebhookUrl(resultado.webhookUrl)
      form.reset()
      onChange()
    }
  }

  const handleRemover = async (id: string) => {
    if (!confirm('Remover este número? As conversas continuam salvas, mas ele deixa de enviar/receber.')) return
    await removerInstanciaWhatsapp(id)
    onChange()
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">WhatsApp</h2>

      {mensagem && (
        <div className="p-3 rounded-md bg-primary/10 border border-primary/20 space-y-1">
          <p className="text-sm text-foreground">{mensagem}</p>
          {webhookUrl && (
            <code className="block text-xs break-all bg-background rounded p-2 border border-border">{webhookUrl}</code>
          )}
        </div>
      )}

      <form onSubmit={handleCriar} className="space-y-2">
        <input name="apelido" required placeholder="Apelido (ex: WhatsApp Nathan)" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="telefone" required placeholder="Telefone (ex: 5511999999999)" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="instanceId" required placeholder="Instance ID da Z-API" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="token" required placeholder="Token da instância" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="clientToken" required placeholder="Client-Token da conta Z-API" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Adicionar número
        </button>
      </form>

      <div className="rounded-lg border border-border divide-y divide-border">
        {instancias.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{i.apelido}</p>
              <p className="text-xs text-muted-foreground">{i.telefone} — {i.ativo ? 'ativo' : 'inativo'}</p>
            </div>
            <button
              onClick={() => handleRemover(i.id)}
              className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx jest src/__tests__/formulario-instancia.test.tsx`
Expected: PASS, 4 testes.

- [ ] **Step 6: Integrar em `config-client.tsx`**

Em `src/app/dashboard/config/config-client.tsx`, adicione o import:

```ts
import { useWhatsappInstancias } from '@/hooks/use-whatsapp-instancias'
import { FormularioInstancia } from '@/components/whatsapp/formulario-instancia'
```

Dentro do componente `ConfigClient`, logo depois de `const { cidades, createCidade, deleteCidade } = useCidades()`, adicione:

```ts
const { instancias, refetch: refetchInstancias } = useWhatsappInstancias()
```

E, entre a seção "Usuários" e a seção "Cidades" (mantendo a ordem visual do restante do arquivo), adicione:

```tsx
<FormularioInstancia instancias={instancias} onChange={refetchInstancias} />
```

- [ ] **Step 7: Rodar toda a suíte e o typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: todos os testes passam, sem erros de tipo.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/use-whatsapp-instancias.ts src/components/whatsapp/formulario-instancia.tsx src/__tests__/formulario-instancia.test.tsx src/app/dashboard/config/config-client.tsx
git commit -m "feat: adicionar gestão de números de WhatsApp em Configurações"
```

---

### Task 7: Rota de webhook de recebimento

**Files:**
- Create: `src/app/api/webhooks/zapi/[instanciaId]/route.ts`

**Interfaces:**
- Consumes: `createAdminClient` (Task 2), `validarAssinaturaWebhook`/`extrairMensagemRecebida` (Task 3), `baixarEArmazenarMidia` (Task 4).
- Produces: `POST /api/webhooks/zapi/[instanciaId]?secret=...`

Sem teste automatizado — depende de uma requisição HTTP real chegando de fora (a própria Z-API), o que só é possível depois do deploy (ver Task 15 e a Seção 8 do spec). A lógica que dá pra testar sem rede (validação de assinatura, parsing do payload) já está coberta pelos testes da Task 3.

- [ ] **Step 1: Implementar a rota**

```ts
// src/app/api/webhooks/zapi/[instanciaId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validarAssinaturaWebhook, extrairMensagemRecebida } from '@/lib/zapi/webhook'
import { baixarEArmazenarMidia } from '@/lib/zapi/midia'

export async function POST(request: NextRequest, { params }: { params: { instanciaId: string } }) {
  const secretRecebido = request.nextUrl.searchParams.get('secret')
  const admin = createAdminClient()

  const { data: instancia } = await admin
    .from('whatsapp_instancias')
    .select('id, ativo, webhook_secret')
    .eq('id', params.instanciaId)
    .maybeSingle()

  if (!instancia || !instancia.ativo || !validarAssinaturaWebhook(secretRecebido, instancia.webhook_secret)) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  const payload = await request.json()
  const mensagem = extrairMensagemRecebida(payload)
  if (!mensagem) {
    // Evento que não é mensagem recebida (status, confirmação, etc.) — ignorado.
    return NextResponse.json({ ok: true })
  }

  const { data: conversa } = await admin
    .from('whatsapp_conversas')
    .upsert(
      {
        instancia_id: instancia.id,
        telefone_contato: mensagem.telefone,
        nome_contato: mensagem.nomeContato,
        ultima_mensagem_em: mensagem.momento.toISOString(),
      },
      { onConflict: 'instancia_id,telefone_contato' }
    )
    .select('id')
    .single()

  if (!conversa) {
    return NextResponse.json({ error: 'falha ao registrar conversa' }, { status: 500 })
  }

  let midiaCaminho: string | null = null
  if (mensagem.midiaUrl) {
    midiaCaminho = await baixarEArmazenarMidia(admin, mensagem.midiaUrl, mensagem.tipo as 'imagem' | 'audio')
  }

  await admin.from('whatsapp_mensagens').insert({
    conversa_id: conversa.id,
    direcao: 'recebida',
    tipo: mensagem.tipo,
    conteudo_texto: mensagem.conteudoTexto,
    midia_url: midiaCaminho,
    status_envio: 'enviado',
    criado_em: mensagem.momento.toISOString(),
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Testar manualmente com um payload simulado (sem depender da Z-API de verdade)**

Com o servidor local rodando (`npm run dev`), crie uma instância de teste direto no banco (via MCP do Supabase, `execute_sql`) e chame a rota local com curl, simulando o formato real confirmado na Task 3:

```bash
curl -X POST "http://localhost:3000/api/webhooks/zapi/<id-da-instancia-de-teste>?secret=<webhook_secret-da-instancia>" \
  -H "Content-Type: application/json" \
  -d '{"type":"ReceivedCallback","fromMe":false,"phone":"5511999998888","momment":1712345678000,"senderName":"Teste","text":{"message":"mensagem de teste"}}'
```

Expected: resposta `{"ok":true}`, e uma linha nova em `whatsapp_conversas` e `whatsapp_mensagens` (confirme com `execute_sql`). Delete os dados de teste depois.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/webhooks/zapi/[instanciaId]/route.ts"
git commit -m "feat: adicionar rota de webhook para receber mensagens da Z-API"
```

---

### Task 8: Hooks de conversas e mensagens com Realtime

**Files:**
- Create: `src/hooks/use-whatsapp-conversas.ts`
- Create: `src/hooks/use-whatsapp-mensagens.ts`

**Interfaces:**
- Consumes: `WhatsappConversa`, `WhatsappMensagem` (Task 2).
- Produces: `useWhatsappConversas(): { conversas: WhatsappConversa[]; loading: boolean; refetch: () => Promise<void> }`; `useWhatsappMensagens(conversaId: string | null): { mensagens: WhatsappMensagem[]; loading: boolean; refetch: () => Promise<void> }`.

Sem teste automatizado — mesmo padrão de `use-leads.ts`/`use-cidades.ts`, que também não têm teste unitário próprio (dependem de um Supabase real). Cobertos indiretamente pelos testes dos componentes que os usam (Tasks 9-12) e pela verificação manual (Task 15).

- [ ] **Step 1: Implementar `use-whatsapp-conversas.ts`**

```ts
// src/hooks/use-whatsapp-conversas.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WhatsappConversa } from '@/lib/types'

export function useWhatsappConversas() {
  const [conversas, setConversas] = useState<WhatsappConversa[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchConversas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('whatsapp_conversas')
      .select('*, instancia:whatsapp_instancias(id, apelido, telefone, ativo), lead:leads(id, nome)')
      .order('ultima_mensagem_em', { ascending: false })
    setConversas(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchConversas() }, [fetchConversas])

  useEffect(() => {
    const canal = supabase
      .channel('whatsapp_conversas_lista')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversas' }, () => { fetchConversas() })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, fetchConversas])

  return { conversas, loading, refetch: fetchConversas }
}
```

- [ ] **Step 2: Implementar `use-whatsapp-mensagens.ts`**

```ts
// src/hooks/use-whatsapp-mensagens.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WhatsappMensagem } from '@/lib/types'

export function useWhatsappMensagens(conversaId: string | null) {
  const [mensagens, setMensagens] = useState<WhatsappMensagem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const resolverMidia = useCallback(async (lista: WhatsappMensagem[]) => {
    return Promise.all(
      lista.map(async (m) => {
        if (!m.midia_url) return m
        const { data } = await supabase.storage.from('whatsapp-midia').createSignedUrl(m.midia_url, 3600)
        return data ? { ...m, midia_url: data.signedUrl } : m
      })
    )
  }, [supabase])

  const fetchMensagens = useCallback(async () => {
    if (!conversaId) {
      setMensagens([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: true })
    setMensagens(await resolverMidia(data ?? []))
    setLoading(false)
  }, [supabase, conversaId, resolverMidia])

  useEffect(() => { fetchMensagens() }, [fetchMensagens])

  useEffect(() => {
    if (!conversaId) return
    const canal = supabase
      .channel(`whatsapp_mensagens:${conversaId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'whatsapp_mensagens', filter: `conversa_id=eq.${conversaId}`,
      }, () => { fetchMensagens() })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, conversaId, fetchMensagens])

  return { mensagens, loading, refetch: fetchMensagens }
}
```

Nota: `midia_url` é salvo no banco como o **caminho** dentro do bucket (ex: `imagem/uuid.jpg`), nunca uma URL pronta — este hook resolve uma URL assinada (válida por 1h) toda vez que busca as mensagens, tanto para mídia recebida quanto enviada.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-whatsapp-conversas.ts src/hooks/use-whatsapp-mensagens.ts
git commit -m "feat: adicionar hooks de conversas e mensagens de WhatsApp com Realtime"
```

---

### Task 9: Componente `BolhaMensagem` (TDD)

**Files:**
- Create: `src/components/whatsapp/bolha-mensagem.tsx`
- Test: `src/__tests__/bolha-mensagem.test.tsx`

**Interfaces:**
- Consumes: `WhatsappMensagem` (Task 2).
- Produces: `<BolhaMensagem mensagem={WhatsappMensagem} />`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/__tests__/bolha-mensagem.test.tsx
import { render, screen } from '@testing-library/react'
import { BolhaMensagem } from '@/components/whatsapp/bolha-mensagem'
import type { WhatsappMensagem } from '@/lib/types'

const base: WhatsappMensagem = {
  id: '1',
  conversa_id: 'c1',
  direcao: 'recebida',
  tipo: 'texto',
  conteudo_texto: null,
  midia_url: null,
  enviado_por: null,
  status_envio: 'enviado',
  criado_em: '2026-08-04T10:00:00Z',
}

describe('BolhaMensagem', () => {
  it('renderiza mensagem de texto', () => {
    render(<BolhaMensagem mensagem={{ ...base, tipo: 'texto', conteudo_texto: 'Olá, tudo bem?' }} />)
    expect(screen.getByText('Olá, tudo bem?')).toBeInTheDocument()
  })

  it('renderiza mensagem de imagem', () => {
    render(<BolhaMensagem mensagem={{ ...base, tipo: 'imagem', midia_url: 'https://exemplo.com/foto.jpg' }} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://exemplo.com/foto.jpg')
  })

  it('renderiza mensagem de áudio', () => {
    const { container } = render(<BolhaMensagem mensagem={{ ...base, tipo: 'audio', midia_url: 'https://exemplo.com/audio.ogg' }} />)
    const audio = container.querySelector('audio')
    expect(audio).toHaveAttribute('src', 'https://exemplo.com/audio.ogg')
  })

  it('mostra "Enviando..." só para mensagens enviadas por mim com status enviando', () => {
    render(<BolhaMensagem mensagem={{ ...base, direcao: 'enviada', tipo: 'texto', conteudo_texto: 'oi', status_envio: 'enviando' }} />)
    expect(screen.getByText('Enviando...')).toBeInTheDocument()
  })

  it('mostra aviso de falha para mensagens enviadas por mim com status falhou', () => {
    render(<BolhaMensagem mensagem={{ ...base, direcao: 'enviada', tipo: 'texto', conteudo_texto: 'oi', status_envio: 'falhou' }} />)
    expect(screen.getByText('Falha ao enviar')).toBeInTheDocument()
  })

  it('não mostra status de envio para mensagens recebidas', () => {
    render(<BolhaMensagem mensagem={{ ...base, direcao: 'recebida', tipo: 'texto', conteudo_texto: 'oi', status_envio: 'enviando' }} />)
    expect(screen.queryByText('Enviando...')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx jest src/__tests__/bolha-mensagem.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```tsx
// src/components/whatsapp/bolha-mensagem.tsx
import type { WhatsappMensagem } from '@/lib/types'

export function BolhaMensagem({ mensagem }: { mensagem: WhatsappMensagem }) {
  const minha = mensagem.direcao === 'enviada'

  return (
    <div className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs rounded-lg px-3 py-2 text-sm ${minha ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'}`}>
        {mensagem.tipo === 'texto' && <p>{mensagem.conteudo_texto}</p>}
        {mensagem.tipo === 'imagem' && mensagem.midia_url && (
          <img src={mensagem.midia_url} alt="Imagem recebida" className="rounded-md max-w-full" />
        )}
        {mensagem.tipo === 'audio' && mensagem.midia_url && (
          <audio controls src={mensagem.midia_url} className="max-w-full" />
        )}
        {minha && mensagem.status_envio === 'enviando' && <p className="text-xs opacity-70 mt-1">Enviando...</p>}
        {minha && mensagem.status_envio === 'falhou' && <p className="text-xs text-destructive mt-1">Falha ao enviar</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx jest src/__tests__/bolha-mensagem.test.tsx`
Expected: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/whatsapp/bolha-mensagem.tsx src/__tests__/bolha-mensagem.test.tsx
git commit -m "feat: adicionar componente de bolha de mensagem do WhatsApp"
```

---

### Task 10: Componente `ListaConversas` (TDD)

**Files:**
- Create: `src/components/whatsapp/lista-conversas.tsx`
- Test: `src/__tests__/lista-conversas.test.tsx`

**Interfaces:**
- Consumes: `WhatsappConversa`, `WhatsappInstancia` (Task 2).
- Produces: `<ListaConversas conversas={WhatsappConversa[]} instancias={WhatsappInstancia[]} conversaSelecionadaId={string | null} filtroInstanciaId={string | 'todos'} onSelecionar={(id: string) => void} onFiltroChange={(id: string | 'todos') => void} />`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/__tests__/lista-conversas.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListaConversas } from '@/components/whatsapp/lista-conversas'
import type { WhatsappConversa, WhatsappInstancia } from '@/lib/types'

const instancias: WhatsappInstancia[] = [
  { id: 'i1', apelido: 'WhatsApp Nathan', telefone: '5511111111111', ativo: true },
  { id: 'i2', apelido: 'WhatsApp Sócio', telefone: '5511222222222', ativo: true },
]

const conversas: WhatsappConversa[] = [
  {
    id: 'c1', instancia_id: 'i1', telefone_contato: '5511999998888', nome_contato: 'Maria',
    lead_id: null, ultima_mensagem_em: '2026-08-04T10:00:00Z', criado_em: '2026-08-04T09:00:00Z',
    instancia: instancias[0],
  },
  {
    id: 'c2', instancia_id: 'i2', telefone_contato: '5511999997777', nome_contato: null,
    lead_id: 'l1', ultima_mensagem_em: '2026-08-04T11:00:00Z', criado_em: '2026-08-04T09:30:00Z',
    instancia: instancias[1], lead: { id: 'l1', nome: 'João Silva' },
  },
]

describe('ListaConversas', () => {
  it('lista as conversas, priorizando nome do lead, depois nome do contato, depois telefone', () => {
    render(
      <ListaConversas conversas={conversas} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="todos" onSelecionar={jest.fn()} onFiltroChange={jest.fn()} />
    )
    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('mostra a etiqueta do número em cada conversa', () => {
    render(
      <ListaConversas conversas={conversas} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="todos" onSelecionar={jest.fn()} onFiltroChange={jest.fn()} />
    )
    expect(screen.getByText('WhatsApp Nathan')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp Sócio')).toBeInTheDocument()
  })

  it('filtra por instância quando filtroInstanciaId não é "todos"', () => {
    render(
      <ListaConversas conversas={conversas} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="i1" onSelecionar={jest.fn()} onFiltroChange={jest.fn()} />
    )
    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
  })

  it('chama onSelecionar com o id ao clicar numa conversa', async () => {
    const onSelecionar = jest.fn()
    const user = userEvent.setup()
    render(
      <ListaConversas conversas={conversas} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="todos" onSelecionar={onSelecionar} onFiltroChange={jest.fn()} />
    )
    await user.click(screen.getByText('Maria'))
    expect(onSelecionar).toHaveBeenCalledWith('c1')
  })

  it('mostra estado vazio quando não há conversas', () => {
    render(
      <ListaConversas conversas={[]} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="todos" onSelecionar={jest.fn()} onFiltroChange={jest.fn()} />
    )
    expect(screen.getByText('Nenhuma conversa ainda')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx jest src/__tests__/lista-conversas.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```tsx
// src/components/whatsapp/lista-conversas.tsx
'use client'

import type { WhatsappConversa, WhatsappInstancia } from '@/lib/types'

interface ListaConversasProps {
  conversas: WhatsappConversa[]
  instancias: WhatsappInstancia[]
  conversaSelecionadaId: string | null
  filtroInstanciaId: string | 'todos'
  onSelecionar: (id: string) => void
  onFiltroChange: (id: string | 'todos') => void
}

export function ListaConversas({
  conversas, instancias, conversaSelecionadaId, filtroInstanciaId, onSelecionar, onFiltroChange,
}: ListaConversasProps) {
  const conversasFiltradas = filtroInstanciaId === 'todos'
    ? conversas
    : conversas.filter((c) => c.instancia_id === filtroInstanciaId)

  return (
    <div className="w-72 border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <select
          value={filtroInstanciaId}
          onChange={(e) => onFiltroChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Todos os números</option>
          {instancias.map((i) => (
            <option key={i.id} value={i.id}>{i.apelido}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto divide-y divide-border">
        {conversasFiltradas.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa ainda</p>
        )}
        {conversasFiltradas.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelecionar(c.id)}
            className={`w-full text-left p-3 hover:bg-accent transition-colors ${c.id === conversaSelecionadaId ? 'bg-accent' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {c.lead?.nome ?? c.nome_contato ?? c.telefone_contato}
              </p>
              {c.instancia && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground shrink-0">
                  {c.instancia.apelido}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{c.telefone_contato}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx jest src/__tests__/lista-conversas.test.tsx`
Expected: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/whatsapp/lista-conversas.tsx src/__tests__/lista-conversas.test.tsx
git commit -m "feat: adicionar componente de lista de conversas do WhatsApp"
```

---

### Task 11: Server Actions de envio de mensagem

**Files:**
- Create: `src/app/dashboard/whatsapp/actions.ts`

**Interfaces:**
- Consumes: `createServerClient` (`@/lib/supabase/server`), `createAdminClient` (Task 2), `enviarTexto`/`enviarImagem`/`enviarAudio` (Task 4).
- Produces: `enviarMensagemTexto(formData: FormData): Promise<{ error: string | null }>` (campos do FormData: `conversaId`, `texto`), `enviarMensagemMidia(formData: FormData): Promise<{ error: string | null }>` (campos: `conversaId`, `tipo` (`'imagem' | 'audio'`), `arquivo` (File)), `cadastrarLeadDaConversa(conversaId: string, dados: { nome: string; email: string | null }): Promise<{ error: string | null }>`.

Sem teste automatizado dedicado — mesmo padrão das demais Server Actions do projeto (nenhuma tem teste unitário próprio); cobertas pelos testes dos componentes que as chamam (Task 12) com as actions mockadas, e pela verificação manual (Task 15).

- [ ] **Step 1: Implementar**

```ts
// src/app/dashboard/whatsapp/actions.ts
'use server'

import { randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarTexto, enviarImagem, enviarAudio, type CredenciaisInstancia } from '@/lib/zapi/cliente'

async function buscarInfoEnvio(conversaId: string): Promise<{ telefone: string; credenciais: CredenciaisInstancia } | null> {
  const admin = createAdminClient()
  const { data: conversa } = await admin
    .from('whatsapp_conversas')
    .select('telefone_contato, instancia_id')
    .eq('id', conversaId)
    .single()
  if (!conversa?.instancia_id) return null

  const { data: instancia } = await admin
    .from('whatsapp_instancias')
    .select('instance_id, token, client_token')
    .eq('id', conversa.instancia_id)
    .single()
  if (!instancia) return null

  return { telefone: conversa.telefone_contato, credenciais: instancia }
}

export async function enviarMensagemTexto(formData: FormData) {
  const conversaId = formData.get('conversaId') as string
  const texto = formData.get('texto') as string

  const info = await buscarInfoEnvio(conversaId)
  if (!info) return { error: 'Conversa sem número de WhatsApp ativo' }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: mensagem } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      conversa_id: conversaId,
      direcao: 'enviada',
      tipo: 'texto',
      conteudo_texto: texto,
      enviado_por: user?.id,
      status_envio: 'enviando',
    })
    .select('id')
    .single()

  const resultado = await enviarTexto(info.credenciais, info.telefone, texto)

  if (mensagem) {
    await supabase
      .from('whatsapp_mensagens')
      .update({ status_envio: resultado.ok ? 'enviado' : 'falhou' })
      .eq('id', mensagem.id)
  }

  await supabase.from('whatsapp_conversas').update({ ultima_mensagem_em: new Date().toISOString() }).eq('id', conversaId)

  return resultado.ok ? { error: null } : { error: resultado.erro }
}

export async function enviarMensagemMidia(formData: FormData) {
  const conversaId = formData.get('conversaId') as string
  const tipo = formData.get('tipo') as 'imagem' | 'audio'
  const arquivo = formData.get('arquivo') as File

  const info = await buscarInfoEnvio(conversaId)
  if (!info) return { error: 'Conversa sem número de WhatsApp ativo' }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const extensao = tipo === 'imagem' ? 'jpg' : 'ogg'
  const caminho = `${tipo}/${randomUUID()}.${extensao}`
  const { error: erroUpload } = await supabase.storage
    .from('whatsapp-midia')
    .upload(caminho, arquivo, { contentType: arquivo.type })
  if (erroUpload) return { error: erroUpload.message }

  const { data: urlAssinada } = await supabase.storage.from('whatsapp-midia').createSignedUrl(caminho, 3600)
  if (!urlAssinada) return { error: 'Não foi possível gerar URL da mídia' }

  const { data: mensagem } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      conversa_id: conversaId,
      direcao: 'enviada',
      tipo,
      midia_url: caminho,
      enviado_por: user?.id,
      status_envio: 'enviando',
    })
    .select('id')
    .single()

  const resultado = tipo === 'imagem'
    ? await enviarImagem(info.credenciais, info.telefone, urlAssinada.signedUrl)
    : await enviarAudio(info.credenciais, info.telefone, urlAssinada.signedUrl)

  if (mensagem) {
    await supabase
      .from('whatsapp_mensagens')
      .update({ status_envio: resultado.ok ? 'enviado' : 'falhou' })
      .eq('id', mensagem.id)
  }

  await supabase.from('whatsapp_conversas').update({ ultima_mensagem_em: new Date().toISOString() }).eq('id', conversaId)

  return resultado.ok ? { error: null } : { error: resultado.erro }
}

export async function cadastrarLeadDaConversa(conversaId: string, dados: { nome: string; email: string | null }) {
  const supabase = await createServerClient()
  const { data: conversa } = await supabase
    .from('whatsapp_conversas')
    .select('telefone_contato')
    .eq('id', conversaId)
    .single()
  if (!conversa) return { error: 'Conversa não encontrada' }

  const { data: lead, error: erroLead } = await supabase
    .from('leads')
    .insert({
      nome: dados.nome,
      telefone: conversa.telefone_contato,
      email: dados.email,
      data_contato: new Date().toISOString().slice(0, 10),
      status: 'respondeu',
    })
    .select('id')
    .single()
  if (erroLead) return { error: erroLead.message }

  const { error: erroConversa } = await supabase
    .from('whatsapp_conversas')
    .update({ lead_id: lead.id })
    .eq('id', conversaId)
  if (erroConversa) return { error: erroConversa.message }

  return { error: null }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/whatsapp/actions.ts
git commit -m "feat: adicionar Server Actions de envio de mensagem e cadastro de lead via WhatsApp"
```

---

### Task 12: Componente `ModalCadastrarLead` (TDD)

**Files:**
- Create: `src/components/whatsapp/modal-cadastrar-lead.tsx`
- Test: `src/__tests__/modal-cadastrar-lead.test.tsx`

**Interfaces:**
- Consumes: `cadastrarLeadDaConversa` (Task 11).
- Produces: `<ModalCadastrarLead conversaId={string} telefone={string} nomeSugerido={string | null} onSaved={() => void} onClose={() => void} />`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/__tests__/modal-cadastrar-lead.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModalCadastrarLead } from '@/components/whatsapp/modal-cadastrar-lead'

const mockCadastrar = jest.fn()
jest.mock('@/app/dashboard/whatsapp/actions', () => ({
  cadastrarLeadDaConversa: (conversaId: string, dados: unknown) => mockCadastrar(conversaId, dados),
}))

describe('ModalCadastrarLead', () => {
  beforeEach(() => mockCadastrar.mockReset())

  it('pré-preenche o telefone (desabilitado) e o nome sugerido', () => {
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido="Maria" onSaved={jest.fn()} onClose={jest.fn()} />)
    expect(screen.getByDisplayValue('5511999998888')).toBeDisabled()
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument()
  })

  it('ao salvar com sucesso, chama cadastrarLeadDaConversa e onSaved', async () => {
    mockCadastrar.mockResolvedValue({ error: null })
    const onSaved = jest.fn()
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} onSaved={onSaved} onClose={jest.fn()} />)

    await user.type(screen.getByLabelText(/nome/i), 'Maria Souza')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(mockCadastrar).toHaveBeenCalledWith('c1', { nome: 'Maria Souza', email: null })
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('mostra mensagem de erro fixa quando falha', async () => {
    mockCadastrar.mockResolvedValue({ error: 'RLS negou' })
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} onSaved={jest.fn()} onClose={jest.fn()} />)

    await user.type(screen.getByLabelText(/nome/i), 'Maria')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Não foi possível cadastrar o lead. Tente novamente.')).toBeInTheDocument()
  })

  it('chama onClose ao clicar em Cancelar', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} onSaved={jest.fn()} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx jest src/__tests__/modal-cadastrar-lead.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```tsx
// src/components/whatsapp/modal-cadastrar-lead.tsx
'use client'

import { useState } from 'react'
import { cadastrarLeadDaConversa } from '@/app/dashboard/whatsapp/actions'

interface ModalCadastrarLeadProps {
  conversaId: string
  telefone: string
  nomeSugerido: string | null
  onSaved: () => void
  onClose: () => void
}

export function ModalCadastrarLead({ conversaId, telefone, nomeSugerido, onSaved, onClose }: ModalCadastrarLeadProps) {
  const [nome, setNome] = useState(nomeSugerido ?? '')
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    const resultado = await cadastrarLeadDaConversa(conversaId, { nome, email: email || null })
    setSalvando(false)
    if (resultado.error) {
      setErro('Não foi possível cadastrar o lead. Tente novamente.')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-4">Cadastrar Lead</h2>

        {erro && (
          <div className="mb-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{erro}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="nome-lead-whatsapp" className="text-sm font-medium text-foreground">Nome *</label>
            <input
              id="nome-lead-whatsapp"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="telefone-lead-whatsapp" className="text-sm font-medium text-foreground">Telefone</label>
            <input
              id="telefone-lead-whatsapp"
              value={telefone}
              disabled
              className="w-full px-3 py-2 rounded-md border border-input bg-muted text-muted-foreground text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email-lead-whatsapp" className="text-sm font-medium text-foreground">Email</label>
            <input
              id="email-lead-whatsapp"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx jest src/__tests__/modal-cadastrar-lead.test.tsx`
Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/whatsapp/modal-cadastrar-lead.tsx src/__tests__/modal-cadastrar-lead.test.tsx
git commit -m "feat: adicionar modal de cadastro rápido de lead a partir da conversa"
```

---

### Task 13: Componente `JanelaConversa` (TDD)

**Files:**
- Create: `src/components/whatsapp/janela-conversa.tsx`
- Test: `src/__tests__/janela-conversa.test.tsx`

**Interfaces:**
- Consumes: `useWhatsappMensagens` (Task 8), `enviarMensagemTexto`/`enviarMensagemMidia` (Task 11), `BolhaMensagem` (Task 9), `WhatsappConversa` (Task 2).
- Produces: `<JanelaConversa conversa={WhatsappConversa} onCadastrarLead={() => void} />`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/__tests__/janela-conversa.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JanelaConversa } from '@/components/whatsapp/janela-conversa'
import type { WhatsappConversa } from '@/lib/types'

const mockUseWhatsappMensagens = jest.fn()
jest.mock('@/hooks/use-whatsapp-mensagens', () => ({
  useWhatsappMensagens: (conversaId: string | null) => mockUseWhatsappMensagens(conversaId),
}))

const mockEnviarTexto = jest.fn()
const mockEnviarMidia = jest.fn()
jest.mock('@/app/dashboard/whatsapp/actions', () => ({
  enviarMensagemTexto: (formData: FormData) => mockEnviarTexto(formData),
  enviarMensagemMidia: (formData: FormData) => mockEnviarMidia(formData),
}))

const conversaSemLead: WhatsappConversa = {
  id: 'c1', instancia_id: 'i1', telefone_contato: '5511999998888', nome_contato: 'Maria',
  lead_id: null, ultima_mensagem_em: '2026-08-04T10:00:00Z', criado_em: '2026-08-04T09:00:00Z',
}

const conversaComLead: WhatsappConversa = {
  ...conversaSemLead, id: 'c2', lead_id: 'l1', lead: { id: 'l1', nome: 'João Silva' },
}

describe('JanelaConversa', () => {
  beforeEach(() => {
    mockUseWhatsappMensagens.mockReturnValue({ mensagens: [], loading: false })
    mockEnviarTexto.mockReset()
    mockEnviarMidia.mockReset()
  })

  it('mostra botão "Cadastrar Lead" quando a conversa não tem lead vinculado', () => {
    render(<JanelaConversa conversa={conversaSemLead} onCadastrarLead={jest.fn()} />)
    expect(screen.getByRole('button', { name: /cadastrar lead/i })).toBeInTheDocument()
  })

  it('mostra link "Ver Lead" quando a conversa já tem lead vinculado', () => {
    render(<JanelaConversa conversa={conversaComLead} onCadastrarLead={jest.fn()} />)
    expect(screen.getByText(/ver lead: joão silva/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cadastrar lead/i })).not.toBeInTheDocument()
  })

  it('chama onCadastrarLead ao clicar no botão', async () => {
    const onCadastrarLead = jest.fn()
    const user = userEvent.setup()
    render(<JanelaConversa conversa={conversaSemLead} onCadastrarLead={onCadastrarLead} />)
    await user.click(screen.getByRole('button', { name: /cadastrar lead/i }))
    expect(onCadastrarLead).toHaveBeenCalledTimes(1)
  })

  it('envia mensagem de texto ao submeter o formulário', async () => {
    mockEnviarTexto.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<JanelaConversa conversa={conversaSemLead} onCadastrarLead={jest.fn()} />)

    await user.type(screen.getByPlaceholderText(/digite uma mensagem/i), 'Oi, tudo bem?')
    await user.click(screen.getByRole('button', { name: /enviar/i }))

    expect(mockEnviarTexto).toHaveBeenCalledTimes(1)
    const formDataEnviado = mockEnviarTexto.mock.calls[0][0] as FormData
    expect(formDataEnviado.get('conversaId')).toBe('c1')
    expect(formDataEnviado.get('texto')).toBe('Oi, tudo bem?')
  })

  it('não envia mensagem vazia', async () => {
    const user = userEvent.setup()
    render(<JanelaConversa conversa={conversaSemLead} onCadastrarLead={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: /enviar/i }))
    expect(mockEnviarTexto).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx jest src/__tests__/janela-conversa.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```tsx
// src/components/whatsapp/janela-conversa.tsx
'use client'

import { useState, useRef } from 'react'
import { useWhatsappMensagens } from '@/hooks/use-whatsapp-mensagens'
import { enviarMensagemTexto, enviarMensagemMidia } from '@/app/dashboard/whatsapp/actions'
import { BolhaMensagem } from './bolha-mensagem'
import type { WhatsappConversa } from '@/lib/types'

interface JanelaConversaProps {
  conversa: WhatsappConversa
  onCadastrarLead: () => void
}

export function JanelaConversa({ conversa, onCadastrarLead }: JanelaConversaProps) {
  const { mensagens, loading } = useWhatsappMensagens(conversa.id)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputArquivoRef = useRef<HTMLInputElement>(null)

  const handleEnviarTexto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    const formData = new FormData()
    formData.set('conversaId', conversa.id)
    formData.set('texto', texto)
    await enviarMensagemTexto(formData)
    setTexto('')
    setEnviando(false)
  }

  const handleAnexar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setEnviando(true)
    const tipo = arquivo.type.startsWith('image/') ? 'imagem' : 'audio'
    const formData = new FormData()
    formData.set('conversaId', conversa.id)
    formData.set('tipo', tipo)
    formData.set('arquivo', arquivo)
    await enviarMensagemMidia(formData)
    setEnviando(false)
    if (inputArquivoRef.current) inputArquivoRef.current.value = ''
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{conversa.lead?.nome ?? conversa.nome_contato ?? conversa.telefone_contato}</p>
          <p className="text-xs text-muted-foreground">{conversa.telefone_contato}</p>
        </div>
        {conversa.lead ? (
          <a href="/dashboard/follow-up" className="text-xs text-primary hover:underline">Ver Lead: {conversa.lead.nome}</a>
        ) : (
          <button onClick={onCadastrarLead} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            Cadastrar Lead
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          mensagens.map((m) => <BolhaMensagem key={m.id} mensagem={m} />)
        )}
      </div>

      <form onSubmit={handleEnviarTexto} className="p-3 border-t border-border flex gap-2 items-center">
        <input
          ref={inputArquivoRef}
          type="file"
          accept="image/*,audio/*"
          onChange={handleAnexar}
          className="hidden"
          id="anexo-whatsapp"
        />
        <label htmlFor="anexo-whatsapp" className="px-3 py-2 rounded-md border border-input text-sm cursor-pointer hover:bg-accent transition-colors">
          📎
        </label>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" disabled={enviando} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          Enviar
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx jest src/__tests__/janela-conversa.test.tsx`
Expected: PASS, 5 testes.

- [ ] **Step 5: Rodar toda a suíte e o typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add src/components/whatsapp/janela-conversa.tsx src/__tests__/janela-conversa.test.tsx
git commit -m "feat: adicionar janela de conversa com envio de texto e mídia"
```

---

### Task 14: Página `/dashboard/whatsapp` e item na sidebar

**Files:**
- Create: `src/app/dashboard/whatsapp/page.tsx`
- Modify: `src/components/sidebar.tsx:11-15`
- Modify: `src/__tests__/sidebar.test.tsx`

**Interfaces:**
- Consumes: `useWhatsappConversas` (Task 8), `useWhatsappInstancias` (Task 6), `ListaConversas` (Task 10), `JanelaConversa` (Task 13), `ModalCadastrarLead` (Task 12).

- [ ] **Step 1: Atualizar o teste da sidebar primeiro**

Em `src/__tests__/sidebar.test.tsx`, atualize o primeiro teste para incluir "WhatsApp":

```tsx
it('exibe itens de navegação para vendedor', () => {
  render(<Sidebar role="vendedor" />)
  expect(screen.getByText('Follow-up')).toBeInTheDocument()
  expect(screen.getByText('WhatsApp')).toBeInTheDocument()
  expect(screen.getByText('Cidades')).toBeInTheDocument()
  expect(screen.getByText('Alunos')).toBeInTheDocument()
  expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx jest src/__tests__/sidebar.test.tsx`
Expected: FAIL — "WhatsApp" ainda não existe na sidebar.

- [ ] **Step 3: Adicionar o item na sidebar**

Em `src/components/sidebar.tsx`, altere `navItems`:

```ts
const navItems = [
  { href: '/dashboard/follow-up', label: 'Follow-up' },
  { href: '/dashboard/whatsapp', label: 'WhatsApp' },
  { href: '/dashboard/cidades', label: 'Cidades' },
  { href: '/dashboard/alunos', label: 'Alunos' },
]
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx jest src/__tests__/sidebar.test.tsx`
Expected: PASS, 3 testes.

- [ ] **Step 5: Implementar a página**

```tsx
// src/app/dashboard/whatsapp/page.tsx
'use client'

import { useState } from 'react'
import { useWhatsappConversas } from '@/hooks/use-whatsapp-conversas'
import { useWhatsappInstancias } from '@/hooks/use-whatsapp-instancias'
import { ListaConversas } from '@/components/whatsapp/lista-conversas'
import { JanelaConversa } from '@/components/whatsapp/janela-conversa'
import { ModalCadastrarLead } from '@/components/whatsapp/modal-cadastrar-lead'

export default function WhatsappPage() {
  const { conversas, refetch: refetchConversas } = useWhatsappConversas()
  const { instancias } = useWhatsappInstancias()
  const [conversaSelecionadaId, setConversaSelecionadaId] = useState<string | null>(null)
  const [filtroInstanciaId, setFiltroInstanciaId] = useState<string | 'todos'>('todos')
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false)

  const conversaSelecionada = conversas.find((c) => c.id === conversaSelecionadaId) ?? null

  return (
    <div className="h-[calc(100vh-3rem)] -m-6 flex">
      <ListaConversas
        conversas={conversas}
        instancias={instancias}
        conversaSelecionadaId={conversaSelecionadaId}
        filtroInstanciaId={filtroInstanciaId}
        onSelecionar={setConversaSelecionadaId}
        onFiltroChange={setFiltroInstanciaId}
      />

      {conversaSelecionada ? (
        <JanelaConversa
          conversa={conversaSelecionada}
          onCadastrarLead={() => setModalCadastroAberto(true)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Selecione uma conversa
        </div>
      )}

      {modalCadastroAberto && conversaSelecionada && (
        <ModalCadastrarLead
          conversaId={conversaSelecionada.id}
          telefone={conversaSelecionada.telefone_contato}
          nomeSugerido={conversaSelecionada.nome_contato}
          onSaved={() => { setModalCadastroAberto(false); refetchConversas() }}
          onClose={() => setModalCadastroAberto(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Rodar toda a suíte e o typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/whatsapp/page.tsx src/components/sidebar.tsx src/__tests__/sidebar.test.tsx
git commit -m "feat: adicionar página da aba WhatsApp e item na barra lateral"
```

---

### Task 15: Verificação manual de ponta a ponta

Esta task não tem código — é a validação real com uma conta Z-API de verdade, necessária porque o webhook não funciona com `localhost` (Global Constraints). Faça isso depois do deploy no EasyPanel (ou usando um túnel como ngrok apontando pro ambiente local).

- [ ] **Step 1:** Criar conta na Z-API, contratar uma instância, escanear o QR code com um número de WhatsApp de teste (não use o número principal do negócio para o primeiro teste).
- [ ] **Step 2:** No CRM, como admin, ir em Configurações e adicionar a instância (apelido, telefone, instance ID, token, client-token). Copiar a URL de webhook mostrada.
- [ ] **Step 3:** No painel da Z-API, colar essa URL no campo de webhook "ao receber" (`ReceivedCallback`).
- [ ] **Step 4:** De outro celular, mandar uma mensagem de texto para o número conectado. Confirmar que ela aparece na aba WhatsApp do CRM em poucos segundos (Realtime).
- [ ] **Step 5:** Responder pelo CRM. Confirmar que a mensagem chega de verdade no WhatsApp do celular de teste.
- [ ] **Step 6:** Mandar uma foto do celular de teste para o número conectado. Confirmar que aparece como imagem (não link quebrado) na conversa.
- [ ] **Step 7:** Mandar um áudio do celular de teste. Confirmar que aparece um player funcional.
- [ ] **Step 8:** Pelo CRM, anexar e enviar uma imagem e um áudio para o número de teste. Confirmar que chegam de verdade no WhatsApp.
- [ ] **Step 9:** Clicar em "Cadastrar Lead" numa conversa nova, preencher e salvar. Confirmar que o lead aparece na aba Follow-up com o telefone correto, e que a conversa passa a mostrar "Ver Lead" no lugar do botão.
- [ ] **Step 10:** Repetir os passos 1-3 com uma segunda instância (segundo número), confirmar que o filtro por número na aba WhatsApp funciona e que as duas conversas aparecem juntas quando o filtro é "Todos os números".
- [ ] **Step 11:** Testar o botão "Remover" de uma instância em Configurações — confirmar que a conversa daquele número continua visível no histórico (só sem poder mais enviar/receber por ela).

---

## Self-Review

**Cobertura do spec:** Seção 3 (banco) → Task 1. Seção 3.5/7 (segurança de credenciais) → Task 1 (REVOKE/GRANT) + Task 5/7 (uso de `createAdminClient`). Seção 4 (rotas) → Tasks 7 e 14. Seção 5.1 (gestão de números) → Tasks 5-6. Seção 5.2 (aba WhatsApp) → Tasks 9-10, 13-14. Seção 5.3 (recebimento) → Tasks 3-4, 7. Seção 5.4 (envio) → Tasks 4, 11, 13. Seção 6 (layout) → Task 14. Seção 8 (limite de teste local) → Task 15. Todas cobertas.

**Placeholders:** nenhum "TBD"/"implementar depois" — toda task tem código completo ou (nas tasks 4, 5, 7, 8, 11, onde o repositório não tem convenção de teste unitário para Server Actions/hooks/rotas) uma justificativa explícita de por que não há teste automatizado ali, apontando para onde a cobertura realmente acontece.

**Consistência de tipos:** `WhatsappInstancia`/`WhatsappConversa`/`WhatsappMensagem` (Task 2) usados identicamente em todas as tasks seguintes. `enviarMensagemTexto`/`enviarMensagemMidia`/`cadastrarLeadDaConversa` (Task 11) chamados com a mesma assinatura em Task 13/12. `CredenciaisInstancia` (Task 4) consumido em Task 11 sem divergência de nomes de campo (`instance_id`, `token`, `client_token` em todo lugar).
