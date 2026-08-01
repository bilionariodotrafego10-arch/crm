# CRM de Tráfego Pago — Documento de Especificação

**Data:** 2026-08-01  
**Projeto:** Sistema de Login + Dashboard CRM para gestão de leads e alunos de cursos de tráfego pago  
**Stack:** Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui + Supabase + EasyPanel (Docker)  
**Idioma da plataforma:** Português (Brasil)

---

## 1. Visão Geral

Sistema web privado com autenticação por email e senha, acessível na nuvem por qualquer dispositivo. Após o login, o usuário acessa um dashboard com quatro abas para gerenciar leads captados via tráfego pago e orgânico, fazer follow-up via WhatsApp, segmentar leads por cidade, e gerenciar alunos já matriculados.

O sistema será usado inicialmente por 2 usuários (sócios) com possibilidade de crescimento para vendedores adicionais. O admin convida novos usuários pelo painel de configurações.

---

## 2. Arquitetura

```
Usuário (navegador)
    ↓
Next.js App (Docker → EasyPanel)
    ↓
Supabase Cloud
    ├── Autenticação (Supabase Auth)
    └── Banco de Dados (PostgreSQL + RLS)
```

- **Frontend + API Routes:** Next.js 14 com App Router
- **Estilização:** Tailwind CSS + shadcn/ui (componentes em português)
- **Banco de dados + Auth:** Supabase cloud (plano gratuito para desenvolvimento; plano Pro recomendado para produção — evita pausa automática por inatividade e suporta volumes maiores de dados)
- **Deploy:** Container Docker no EasyPanel
- **Exportação:** CSV gerado no navegador (sem custo de servidor)

---

## 3. Banco de Dados

### 3.1 Tabela `leads`
| Campo         | Tipo        | Descrição                              |
|---------------|-------------|----------------------------------------|
| id            | uuid (PK)   | Identificador único                    |
| nome          | text        | Nome completo do lead                  |
| telefone      | text        | Telefone com DDD                       |
| email         | text        | Email do lead (opcional)               |
| data_contato  | date        | Data em que o lead entrou em contato   |
| status        | text        | `respondeu` ou `nao_respondeu`         |
| cidade_id     | uuid (FK)   | Cidade de origem — opcional, preenchido na Aba Cidades |
| criado_por    | uuid (FK)   | Usuário que cadastrou — para auditoria (quem registrou o lead) |
| criado_em     | timestamptz | Data de criação do registro            |

### 3.2 Tabela `cidades`
| Campo   | Tipo      | Descrição             |
|---------|-----------|-----------------------|
| id      | uuid (PK) | Identificador único   |
| nome    | text      | Nome da cidade        |
| estado  | text      | UF do estado (ex: SP) |

### 3.3 Tabela `alunos`
| Campo          | Tipo        | Descrição                        |
|----------------|-------------|----------------------------------|
| id             | uuid (PK)   | Identificador único              |
| nome           | text        | Nome completo do aluno           |
| telefone       | text        | Telefone com DDD                 |
| email          | text        | Email do aluno                   |
| data_matricula | date        | Data em que virou aluno          |
| curso          | text        | Nome do curso adquirido          |
| criado_por     | uuid (FK)   | Usuário que cadastrou            |
| criado_em      | timestamptz | Data de criação do registro      |

### 3.4 Tabela `follow_ups`
| Campo      | Tipo        | Descrição                        |
|------------|-------------|----------------------------------|
| id         | uuid (PK)   | Identificador único              |
| lead_id    | uuid (FK)   | Lead relacionado                 |
| data       | date        | Data da interação                |
| observacao | text        | Anotação sobre a conversa        |
| usuario_id | uuid (FK)   | Usuário que registrou            |

### 3.5 Autenticação
Gerenciada inteiramente pelo Supabase Auth. Campos relevantes: `id`, `email`, `role` (armazenado em `user_metadata`). Roles: `admin` e `vendedor`.

### 3.6 Row Level Security (RLS)
Todas as tabelas terão RLS ativo no Supabase. A política é de **time compartilhado**: qualquer usuário autenticado pode ler e escrever todos os registros do sistema. Não há isolamento por usuário — vendedores e admins enxergam os mesmos leads, alunos e cidades.

---

## 4. Páginas e Rotas

| Rota                   | Descrição                                      | Acesso        |
|------------------------|------------------------------------------------|---------------|
| `/`                    | Redireciona para `/login` ou `/dashboard`      | Público       |
| `/login`               | Tela de login (email + senha)                  | Público       |
| `/dashboard`           | Redireciona automaticamente para `/dashboard/follow-up` | Autenticado   |
| `/dashboard/follow-up` | Aba de Follow-up / WhatsApp                    | Autenticado   |
| `/dashboard/cidades`   | Aba de Tráfego por Cidade                      | Autenticado   |
| `/dashboard/alunos`    | Aba de Alunos                                  | Autenticado   |
| `/dashboard/config`    | Aba de Configurações                           | Somente Admin |

Todas as rotas `/dashboard/*` são protegidas por middleware Next.js. Usuários não autenticados são redirecionados para `/login`. Vendedores que tentarem acessar `/dashboard/config` diretamente pela URL são redirecionados para `/dashboard/follow-up`.

---

## 5. Funcionalidades por Aba

### 5.1 Aba: Follow-up (WhatsApp)

**Objetivo:** Registrar e acompanhar leads que entraram em contato, com foco em follow-up via WhatsApp.

**Formulário unificado de cadastro de lead:**
Todas as abas compartilham a mesma tabela `leads`. O formulário de cadastro (modal "+ Novo Lead") contém todos os campos de uma vez:
- Nome (obrigatório)
- Telefone (obrigatório)
- Email (opcional)
- Data de Contato (obrigatório)
- Status: Respondeu / Não Respondeu (obrigatório)
- Cidade (opcional — dropdown das cidades cadastradas)

As abas apenas filtram e exibem os dados de forma diferente; não há formulários separados por aba.

**Filtros disponíveis:**
- Últimos 7 dias
- Últimos 14 dias
- Último mês
- Data personalizada (intervalo de datas)
- Por status: Todos / Respondeu / Não Respondeu

**Tabela de leads:**
- Colunas: Nome, Telefone, Data de Contato, Status, Cidade, Ações
- Ações por linha: Editar, Deletar, Registrar Follow-up
- Paginação de 20 itens por página

**Modal "Registrar Follow-up":**
- Campos: Data da interação (padrão: hoje), Observação (texto livre)
- Ao salvar, cria um registro na tabela `follow_ups` vinculado ao lead
- Histórico de follow-ups aparece como lista expansível abaixo da linha do lead na tabela

### 5.2 Aba: Tráfego por Cidade

**Objetivo:** Segmentar leads por cidade de origem do tráfego pago para reaproveitamento em futuros cursos.

**Exibição:**
- Mostra apenas leads que têm `cidade_id` preenchido
- Para cadastrar um novo lead com cidade, usa o mesmo modal "+ Novo Lead" (formulário unificado — ver 5.1) com o campo Cidade preenchido

**Visão por cidade:**
- Cards mostrando cada cidade com total de leads
- Filtro por cidade no dropdown

**Exportação CSV:**
- Botão "Exportar CSV" disponível por cidade
- Colunas exportadas: Nome, Telefone, Email
- Nome do arquivo: `leads-[cidade]-[data].csv`

### 5.3 Aba: Alunos

**Objetivo:** Gerenciar base de alunos para disparos de reengajamento e venda de novos produtos.

**Cadastro de aluno:**
- Campos: Nome, Telefone, Email, Data de Matrícula, Curso
- Modal de cadastro ativado pelo botão "+ Novo Aluno"

**Tabela de alunos:**
- Colunas: Nome, Telefone, Email, Curso, Data de Matrícula, Ações
- Ações por linha: Editar, Deletar

**Exportação CSV:**
- Botão "Exportar CSV" exporta todos os alunos
- Colunas: Nome, Telefone, Email
- Nome do arquivo: `alunos-[data].csv`

### 5.4 Aba: Configurações *(somente Admin)*

**Gerenciamento de usuários:**
- Convidar novo usuário por email e role (Admin ou Vendedor)
- O Supabase envia automaticamente um email com link de acesso para o convidado definir sua senha
- Remover usuário

**Gerenciamento de cidades:**
- Cadastrar nova cidade (nome + estado)
- Editar / remover cidades

**Conta:**
- Trocar senha

---

## 6. Interface

**Visual:** Dark mode moderno, sidebar lateral fixa, interface completamente em português.

**Layout (Follow-up — sem exportação):**
```
┌──────────────────┬─────────────────────────────────────────┐
│  Sidebar         │  [Filtros]            [+ Novo Lead]     │
│                  │                                         │
│  • Follow-up     │  ┌──────────────────────────────────┐   │
│  • Cidades       │  │ Tabela de dados com paginação    │   │
│  • Alunos        │  └──────────────────────────────────┘   │
│  • Configurações │                                         │
│  (só para admin) │                                         │
│  [Sair]          │                                         │
└──────────────────┴─────────────────────────────────────────┘
```

**Layout (Cidades e Alunos — com exportação):**
```
┌──────────────────┬─────────────────────────────────────────┐
│  Sidebar         │  [Filtros]          [+ Novo Lead/Aluno] │
│                  │                                         │
│  • Follow-up     │  ┌──────────────────────────────────┐   │
│  • Cidades       │  │ Tabela de dados com paginação    │   │
│  • Alunos        │  └──────────────────────────────────┘   │
│  • Configurações │                                         │
│  (só para admin) │  [Exportar CSV]                         │
│  [Sair]          │                                         │
└──────────────────┴─────────────────────────────────────────┘
```

**Visibilidade do item "Configurações" na sidebar:** oculto para usuários com role `vendedor`. Apenas admins enxergam e acessam este item.

**Componentes principais:**
- `TabelaLeads` — tabela reutilizável com filtros e paginação
- `FormularioLead` — modal para cadastrar/editar lead
- `BarraFiltros` — filtros por data e status
- `BotaoExportarCSV` — gera e dispara download do arquivo
- `SeletorCidade` — dropdown de cidades cadastradas
- `RotaProtegida` — middleware que bloqueia usuários não autenticados

---

## 7. Autenticação e Segurança

- Login via Supabase Auth (email + senha)
- Sessão mantida via cookie seguro (usuário permanece logado ao fechar o navegador)
- Middleware Next.js protege todas as rotas `/dashboard/*`
- RLS no Supabase garante que apenas usuários autenticados acessam os dados (política de time compartilhado — todos veem tudo, conforme Seção 3.6)
- Somente usuários com role `admin` acessam a aba de Configurações

---

## 8. Exportação CSV

- Gerada no navegador usando a API nativa (sem custo de servidor)
- Encoding UTF-8 com BOM para compatibilidade com Excel
- Separador: vírgula (`,`)
- Colunas por tipo de exportação:
  - **Leads por cidade:** Nome, Telefone, Email
  - **Alunos:** Nome, Telefone, Email
- Nome do arquivo inclui cidade/tipo e data para fácil identificação

---

## 9. Deploy

**Dockerfile:**
- Imagem base: `node:20-alpine`
- Build de produção do Next.js (`next build`)
- Porta exposta: `3000`

**Variáveis de ambiente (configuradas no EasyPanel):**
- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave pública do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — chave privada para operações admin (convidar usuários, gerenciar roles)

---

## 10. Fora do Escopo (desta versão)

- Integração direta com WhatsApp Business API
- Disparo automático de mensagens
- Relatórios gráficos / BI
- App mobile nativo
- Importação em massa de leads via planilha
- Filtro por período de data na Aba Cidades (apenas filtro por cidade disponível nesta versão)
