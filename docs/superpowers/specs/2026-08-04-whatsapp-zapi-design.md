# WhatsApp dentro do CRM (via Z-API) — Documento de Especificação

**Data:** 2026-08-04
**Projeto:** Integração de WhatsApp real (múltiplos números) dentro do CRM de Tráfego Pago
**Stack adicional:** Z-API (gateway não-oficial de WhatsApp) + Supabase Storage + Supabase Realtime
**Idioma da plataforma:** Português (Brasil)

---

## 1. Visão Geral

O CRM ganha uma aba **WhatsApp** onde o time (hoje: 2 sócios) conversa de verdade com os leads sem sair do sistema, e cadastra o lead no CRM a partir da própria conversa. Mais de um número de WhatsApp pode ficar conectado ao mesmo tempo (ex: o número de cada sócio), numa caixa de entrada **compartilhada** — qualquer usuário logado no CRM vê e responde qualquer conversa, de qualquer número conectado.

Isso é possível através da **Z-API**, um serviço de terceiros pago que automatiza uma sessão real de WhatsApp Web e expõe isso como uma API. **Esta não é a API oficial da Meta/WhatsApp Business** — é uma automação não autorizada pela Meta, amplamente usada por pequenas empresas no Brasil. O risco de banimento do número é considerado baixo na prática (a Z-API reporta <0,3% de taxa de banimento em 2026), mas é um risco real e contínuo que o usuário aceita conscientemente ao escolher este caminho em vez da API oficial da Meta (mais lenta e cara de configurar, mas sem esse risco). Esta decisão está documentada e foi tomada deliberadamente durante o brainstorming desta feature — não deve ser revertida silenciosamente numa implementação futura.

Cada número conectado é uma **instância** separada na Z-API, com custo mensal próprio — dois números conectados custam aproximadamente o dobro de um.

---

## 2. Arquitetura

```
Lead (WhatsApp)
    ↕
Z-API (sessão WhatsApp Web automatizada, 1 instância por número)
    ↕ webhook (mensagem recebida)     ↕ API REST (enviar mensagem)
Next.js App (rota /api/webhooks/zapi/[instanciaId] + Server Actions)
    ↕
Supabase (Postgres + Realtime + Storage)
    ↕
CRM (aba WhatsApp, atualização em tempo real)
```

- **Recebimento:** a Z-API chama um webhook do CRM a cada mensagem nova. O CRM valida, salva no banco e (se for mídia) baixa o arquivo para o Supabase Storage.
- **Envio:** o CRM chama a API REST da Z-API para disparar mensagens (texto ou mídia) através do número correto.
- **Tempo real:** a tela da conversa se atualiza sozinha via Supabase Realtime (`postgres_changes` na tabela de mensagens), sem precisar recarregar a página.

---

## 3. Banco de Dados

### 3.1 Tabela `whatsapp_instancias`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador único |
| apelido | text | Nome de exibição (ex: "WhatsApp Nathan") |
| telefone | text | Número conectado, com DDI/DDD |
| instance_id | text | ID da instância na Z-API |
| token | text | Token da instância na Z-API (sensível — nunca exposto ao navegador) |
| client_token | text | Client-Token da conta Z-API (sensível) |
| webhook_secret | text | Segredo gerado pelo CRM para validar que o webhook recebido é legítimo |
| ativo | boolean | Se a instância está em uso |
| criado_em | timestamptz | Data de criação |

### 3.2 Tabela `whatsapp_conversas`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador único |
| instancia_id | uuid (FK) | Qual número recebeu essa conversa |
| telefone_contato | text | Telefone do lead/contato (formato WhatsApp) |
| nome_contato | text | Nome do perfil do WhatsApp, se disponível (não é o nome cadastrado no CRM) |
| lead_id | uuid (FK, opcional) | Preenchido quando o contato vira um lead cadastrado |
| ultima_mensagem_em | timestamptz | Para ordenar a lista de conversas |
| criado_em | timestamptz | Data de criação |

Restrição: `UNIQUE(instancia_id, telefone_contato)` — uma conversa por par número/contato.

### 3.3 Tabela `whatsapp_mensagens`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador único |
| conversa_id | uuid (FK) | Conversa relacionada |
| direcao | text | `recebida` ou `enviada` |
| tipo | text | `texto`, `imagem` ou `audio` |
| conteudo_texto | text | Texto da mensagem (quando `tipo = texto`) |
| midia_url | text | URL no Supabase Storage (quando `tipo` é imagem/áudio) |
| enviado_por | uuid (FK, opcional) | Usuário do CRM que enviou (null quando `direcao = recebida`) |
| status_envio | text | `enviando`, `enviado` ou `falhou` — feedback visual imediato |
| criado_em | timestamptz | Data/hora da mensagem |

### 3.4 Supabase Storage
Novo bucket privado `whatsapp-midia`. Acesso apenas via usuário autenticado (mesma política de "time compartilhado" do resto do CRM).

### 3.5 RLS
Mesma política de time compartilhado já usada em `leads`/`alunos`/`cidades`: qualquer autenticado lê e escreve `whatsapp_conversas` e `whatsapp_mensagens`. A tabela `whatsapp_instancias` também é legível por qualquer autenticado (para popular o filtro por número na UI), mas as colunas `token`, `client_token` e `webhook_secret` só são lidas por Server Actions (papel `service_role`), nunca pelo cliente no navegador — protegido via `REVOKE`/`GRANT` de coluna, mesmo mecanismo já usado para proteger `criado_por` em `leads`.

---

## 4. Páginas e Rotas

| Rota | Descrição | Acesso |
|---|---|---|
| `/dashboard/whatsapp` | Aba de conversas de WhatsApp | Autenticado |
| `/api/webhooks/zapi/[instanciaId]` | Recebe eventos da Z-API (mensagem nova) | Público, validado por `webhook_secret` |

Gestão das instâncias (adicionar/remover número) fica dentro de **Configurações** (`/dashboard/config`, admin), como uma nova seção — mesmo padrão já usado para Cidades e Usuários.

---

## 5. Funcionalidades

### 5.1 Gestão de números (Configurações, admin)
- Formulário: apelido, telefone, instance ID da Z-API, token da Z-API, client-token da conta.
- Ao salvar, o CRM gera um `webhook_secret` e mostra a URL de webhook (`/api/webhooks/zapi/[id]`) para o admin colar na configuração da instância no painel da Z-API.
- Conectar o número (escanear QR code) acontece **no painel da própria Z-API**, fora do CRM — o CRM só consome a API depois de conectado.
- Remover instância.

### 5.2 Aba WhatsApp (todos os usuários)
- **Lista de conversas** (coluna esquerda): mais recente primeiro, mostra nome/telefone, prévia da última mensagem, horário, etiqueta do número (quando mais de uma instância ativa).
- **Filtro por número**: "Todos" ou uma instância específica.
- **Conversa aberta** (coluna direita): histórico de mensagens (texto, imagem inline, player de áudio), campo de envio de texto, botão de anexar mídia (imagem ou áudio) para enviar.
- **Botão "Cadastrar Lead"**: aparece no topo da conversa quando `lead_id` está vazio. Abre o `FormularioLead` já existente no CRM, com telefone pré-preenchido a partir da conversa. Ao salvar, associa `lead_id` à conversa. Se o contato já é um lead, o botão vira "Ver Lead: [nome]", linkando para a aba Follow-up.

### 5.3 Recebimento de mensagem
1. Z-API envia webhook para `/api/webhooks/zapi/[instanciaId]`.
2. CRM valida `webhook_secret` e confirma que a instância está com `ativo = true` (instância removida/desativada não processa mensagens novas, mesmo que a Z-API ainda envie webhooks por engano).
3. Se a conversa (telefone + instância) não existe, cria uma.
4. Se for mídia, baixa da Z-API e sobe para o Supabase Storage.
5. Salva a mensagem. Supabase Realtime propaga para quem estiver com a aba WhatsApp aberta.

### 5.4 Envio de mensagem
1. Usuário digita texto ou anexa mídia na conversa aberta.
2. Server Action sobe mídia (se houver) para o Storage, salva a mensagem com `status_envio = enviando`, chama a API REST da Z-API da instância correspondente.
3. Atualiza `status_envio` para `enviado` ou `falhou` conforme a resposta.

---

## 6. Interface

```
┌──────────────────┬───────────────────┬─────────────────────────────┐
│  Sidebar         │  Conversas         │  Conversa aberta            │
│                  │  [Filtro: número]  │  [Cadastrar Lead / Ver Lead]│
│  • Follow-up     │  ┌──────────────┐  │  ┌─────────────────────┐   │
│  • WhatsApp      │  │ João - Nathan│  │  │ histórico de         │   │
│  • Cidades       │  │ Maria - Sócio│  │  │ mensagens             │   │
│  • Alunos        │  │ ...          │  │  └─────────────────────┘   │
│  • Configurações │  └──────────────┘  │  [📎] [digitar mensagem] [➤]│
│  [Sair]          │                    │                              │
└──────────────────┴───────────────────┴─────────────────────────────┘
```

---

## 7. Segurança

- Webhook validado por `webhook_secret` próprio de cada instância — requisições sem o segredo correto são rejeitadas antes de tocar no banco.
- Token/client-token da Z-API nunca chegam ao navegador — protegidos por `REVOKE`/`GRANT` de coluna, só acessíveis via Server Action/service role.
- Mídia fica em bucket privado do Supabase Storage, não em URLs públicas adivinháveis.
- Risco aceito conscientemente pelo usuário: a Z-API é uma integração não-oficial (viola os termos de uso do WhatsApp). Ver Seção 1.

---

## 8. Limitação de teste local

A Z-API precisa alcançar o webhook do CRM pela internet — **não funciona com `localhost` durante desenvolvimento**. O fluxo de recebimento só é testável de ponta a ponta depois do deploy no EasyPanel (ou usando um túnel temporário como ngrok, se quiser testar antes do deploy). O envio de mensagens (CRM → Z-API) não tem essa limitação e pode ser testado localmente.

---

## 9. Custos

- Z-API cobra por instância/número conectado (plano mensal, valor a confirmar diretamente com a Z-API no momento da contratação). Dois números = aproximadamente o dobro do custo de um.
- Custo é do usuário diretamente com a Z-API — o CRM não processa nem gerencia esse pagamento.

---

## 10. Fora do Escopo (desta versão)

- API oficial da Meta/WhatsApp Business (considerada e descartada em favor da Z-API nesta etapa — ver Seção 1)
- Envio/recebimento de documentos (PDF etc.), figurinhas e localização
- Confirmação de leitura (✓✓ azul), indicador de "digitando..."
- Conversas em grupo
- Mensagens automáticas / templates / chatbot
- Múltiplos vendedores com caixas de entrada privadas (hoje é 100% compartilhado)
- Reatribuição de conversa para um vendedor específico
