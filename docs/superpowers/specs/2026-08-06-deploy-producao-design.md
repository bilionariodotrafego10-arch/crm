# Deploy em produção + verificação manual do WhatsApp

**Data:** 2026-08-06
**Status:** Aprovado para virar plano de implementação

## Contexto

O CRM (base + signup/convite + WhatsApp via Z-API) está com todo o código implementado, revisado e mesclado em `master` (ver `.superpowers/sdd/2026-08-01-crm-trafego/progress.md` e a spec `2026-08-04-whatsapp-zapi-design.md`). O único item pendente para o projeto ir ao ar é o deploy e a verificação manual ponta a ponta do WhatsApp com uma conta Z-API real (Task 15 do plano de WhatsApp, nunca executada porque o webhook não alcança localhost).

**Ambiente do usuário (levantado nesta sessão):**
- EasyPanel já instalado num servidor na Hostinger.
- Domínio já comprado na Hostinger, mas **não apontado** ainda — será usado para este teste.
- Conta Z-API **ainda não criada**.

## Objetivo

Colocar o CRM no ar em um domínio real, funcionando de ponta a ponta, incluindo a integração de WhatsApp testada com uma conta Z-API real.

## Fora de escopo

- Resolver a lista de "pendências conhecidas" do CRM base e do WhatsApp (erros de mutação silenciosos, paginação de 1000 registros, N+1 de queries, README, rota de reativação de instância, etc.) — documentadas no ledger e na memória do projeto, tratadas como próximo passo *depois* do ar.
- Arquitetura multi-tenant (necessária só quando o CRM for vendido para outras empresas).
- Qualquer feature nova.

## Divisão de responsabilidade

Como o deploy depende de painéis de terceiros (Hostinger DNS, EasyPanel, Z-API) sem acesso via ferramenta/API neste ambiente, cada fase é marcada como:
- **[Claude]** — executo diretamente (código, git, Supabase via MCP).
- **[Usuário guiado]** — ação em painel de terceiro; eu forneço o passo a passo exato e valido o resultado (ex: `dig`/`curl` para checar propagação de DNS, checar se o app responde) antes de seguir.

## Fases

### Fase 0 — Arrumar a casa [Claude]
Revisar e commitar as 3 mudanças pendentes no working tree:
- `BotaoExportarCSV` reaproveitado na aba Follow-up.
- WhatsApp virou a rota padrão do dashboard (`/dashboard` → `/dashboard/whatsapp`), item do menu reordenado.

Critério de aceite: `git status` limpo, build (`next build`) e suíte de testes passando antes de seguir.

### Fase 1 — Apontar o domínio [Usuário guiado]
Configurar o DNS do domínio na Hostinger (registro A apontando para o IP do servidor EasyPanel, ou CNAME conforme o padrão do EasyPanel). Validar propagação antes de seguir para a Fase 2.

Critério de aceite: domínio resolve para o IP do servidor.

### Fase 2 — Criar o app no EasyPanel [Usuário guiado]
Criar o serviço a partir do `Dockerfile` do repositório (build via Git, já que não há remote configurado — decidir entre conectar um repo Git novo ou build manual/upload). Configurar:
- **Build args:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (precisam estar disponíveis em build-time, conforme já resolvido no Dockerfile).
- **Env vars de runtime:** `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (URL de produção — crítica, sem ela a tela de Configurações do WhatsApp trava ao criar instância).
- Vincular o domínio da Fase 1 + emitir SSL.

Critério de aceite: app builda e sobe sem erro, domínio responde em HTTPS.

**Observação:** o repositório não tem remote Git configurado (só local). Isso precisa ser resolvido primeiro — decisão de qual método de build o EasyPanel vai usar (Git push, upload direto, ou criar um remote Git agora) fica para o momento da implementação, com confirmação do usuário antes de criar qualquer remote/push.

### Fase 3 — Atualizar config do Supabase [Claude, via MCP]
Trocar Site URL e Redirect URLs do projeto Supabase (`lwitpxfbuhqdgfdaclwn`) do `localhost` para o domínio de produção. Sem isso, login/convite/troca de senha quebram em produção (mesma classe de bug já documentada na memória do projeto).

Critério de aceite: confirmar a mudança persistiu (o histórico do projeto mostra que esse painel já falhou em salvar silenciosamente antes — validar por uma segunda via, não só "salvou na tela").

### Fase 4 — Validar o deploy básico [Usuário guiado + Claude valida via curl/HTTP]
Login com o usuário admin existente, navegação pelo dashboard, um CRUD simples (ex: criar e apagar uma cidade de teste).

Critério de aceite: fluxo básico funciona em produção sem erros de console/rede.

### Fase 5 — Criar conta e instância Z-API [Usuário]
Criar conta em z-api.io e contratar uma instância (ação paga, fora do que dá para automatizar). Obter Instance ID e Client-Token.

Critério de aceite: credenciais em mãos.

### Fase 6 — Conectar o número de WhatsApp [Usuário guiado]
Cadastrar a instância dentro do CRM (Configurações → WhatsApp) com as credenciais da Fase 5, escanear o QR code exibido para conectar um número real.

Critério de aceite: instância aparece como conectada/ativa no CRM.

### Fase 7 — Configurar o webhook da Z-API [Usuário guiado]
Apontar o webhook da instância Z-API para `https://<dominio>/api/webhook/zapi?secret=<segredo>`. O segredo já existe no código (comparação `timingSafeEqual`); usar o mesmo valor configurado como env var no EasyPanel.

Critério de aceite: Z-API confirma o webhook configurado (painel deles costuma validar com uma chamada de teste).

### Fase 8 — Teste ponta a ponta manual (Task 15 original) [Usuário guiado]
- Receber uma mensagem de texto de um número real → aparece no CRM em tempo real.
- Responder pelo CRM → chega no WhatsApp real.
- Enviar/receber mídia (foto e áudio) nos dois sentidos.
- Cadastrar um lead a partir de uma conversa (modal de cadastro rápido).

Critério de aceite: os 4 itens acima funcionando sem erro.

## Riscos / pontos de atenção conhecidos (herdados da memória do projeto)

- Configs do painel Supabase já falharam em "pegar" silenciosamente mais de uma vez nesta sessão de trabalho (toggle de confirmação de email, redirect URLs) — sempre validar por uma segunda via depois de salvar.
- `NEXT_PUBLIC_APP_URL` deve ser env var de runtime, **não** build arg — diferente das duas do Supabase.
- Sem remote Git configurado no repo — a Fase 2 precisa resolver isso primeiro, com confirmação do usuário antes de criar/pushar para qualquer remote novo.

## Testes

Não há testes automatizados novos nesta fase — é um runbook de deploy. Os "testes" são os critérios de aceite manuais de cada fase, com a Fase 8 cobrindo o teste ponta a ponta que faltava desde a implementação do WhatsApp.
