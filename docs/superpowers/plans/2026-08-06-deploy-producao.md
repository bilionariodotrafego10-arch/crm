# Deploy em Produção + Verificação Manual do WhatsApp — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar o CRM (Next.js + Supabase + WhatsApp via Z-API) no ar em um domínio real na Hostinger/EasyPanel, com a integração de WhatsApp testada de ponta a ponta com uma conta Z-API real e paga.

**Architecture:** Deploy via Docker (Dockerfile já existente no repo) rodando dentro do EasyPanel (Hostinger). Build args para as duas env vars públicas do Supabase, env vars de runtime para a service role key e a URL pública do app. Credenciais da instância Z-API (Instance ID, Token, Client-Token) são cadastradas via UI do próprio CRM (Configurações → WhatsApp), não como env vars — o app gera um `webhook_secret` por instância e monta a URL do webhook, que o usuário cola manualmente no painel da Z-API.

**Tech Stack:** Next.js 14 (standalone output), Docker, EasyPanel, Supabase (hospedado, projeto `lwitpxfbuhqdgfdaclwn`), Z-API.

## Global Constraints

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` devem ser passadas como **build args** do Docker (o Next.js as embute no bundle do cliente em build-time) — ver `Dockerfile:14-17`.
- `SUPABASE_SERVICE_ROLE_KEY` e `NEXT_PUBLIC_APP_URL` devem ser env vars de **runtime**, nunca build args.
- Nenhuma credencial (Z-API, Supabase service role) deve ser commitada no repo ou colocada em texto plano fora do painel do EasyPanel.
- Toda alteração feita em painel de terceiro (Hostinger DNS, EasyPanel, Supabase Auth, Z-API) deve ser validada por uma segunda via antes de seguir para a próxima tarefa — o histórico deste projeto já teve mais de um caso de toggle/campo que não "pegou" ao salvar silenciosamente.

---

## Task 1: Commitar as mudanças pendentes no working tree

**Contexto:** há 3 arquivos modificados e não commitados: exportação CSV reaproveitada na aba Follow-up, e WhatsApp virou a rota padrão do dashboard. Já verificado nesta sessão que a suíte de testes passa com essas mudanças (15 suítes / 80 testes). Isso precisa ir para o histórico antes do deploy, senão a imagem de produção carrega código que não está registrado em nenhum commit.

**Files:**
- Modify (já modificados, só commitar): `src/app/dashboard/follow-up/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/sidebar.tsx`

**Interfaces:** N/A — nenhuma interface nova, apenas consolidação de mudanças já existentes.

- [ ] **Step 1: Conferir o diff final**

Run: `git diff --stat`
Expected: os 3 arquivos listados acima, nenhum outro.

- [ ] **Step 2: Rodar a suíte de testes**

Run: `npm test`
Expected: `Test Suites: 15 passed, 15 total` / `Tests: 80 passed, 80 total`

- [ ] **Step 3: Rodar o build de produção**

Run: `npm run build`
Expected: build conclui sem erro (`✓ Compiled successfully`).

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/follow-up/page.tsx src/app/dashboard/page.tsx src/components/sidebar.tsx
git commit -m "feat: exportar CSV na aba Follow-up e tornar WhatsApp a página inicial do dashboard"
```

---

## Task 2: Definir e configurar como o EasyPanel vai buildar a imagem

**Contexto:** o repositório não tem remote Git configurado (só existe local, `git remote -v` vazio). O EasyPanel builda a partir de um Dockerfile, e a forma mais simples e mais bem suportada pelo EasyPanel é apontar para um repositório Git (GitHub/GitLab/Gitea, inclusive privado via deploy token). Criar um remote novo é uma ação que sai do ambiente local — **precisa de confirmação explícita do usuário antes de criar/pushar para qualquer remote novo**, dado que não havia nenhum configurado até agora.

**Files:** nenhum arquivo de código — decisão de infraestrutura.

**Interfaces:** N/A.

- [ ] **Step 1: Confirmar com o usuário onde o código vai morar**

Perguntar diretamente: criar um repositório novo (GitHub, por exemplo) e dar push da `master` para lá, ou o EasyPanel tem alguma outra forma de build (upload de código, Git local via SSH) que o usuário prefira usar dentro do próprio painel do EasyPanel? Não prosseguir sem resposta explícita — isso é a primeira vez que este repo ganharia um remote.

- [ ] **Step 2: Se GitHub for escolhido, criar o repositório e configurar o remote**

```bash
git remote add origin <url-do-repo-fornecida-pelo-usuario-ou-criada-com-gh>
git push -u origin master
```

Expected: `git remote -v` mostra `origin`, `git log origin/master` reflete o commit da Task 1.

- [ ] **Step 3: Conectar o EasyPanel ao repositório**

No painel do EasyPanel: criar um novo serviço do tipo "App" → fonte "Git" → apontar para o repositório e branch `master`, build method "Dockerfile" (usa o `Dockerfile` da raiz do repo automaticamente).

Expected: EasyPanel mostra o repositório conectado, ainda sem deploy disparado (isso acontece na Task 4, depois das env vars estarem configuradas).

---

## Task 3: Apontar o domínio da Hostinger para o servidor do EasyPanel

**Contexto:** o usuário já tem um domínio comprado na Hostinger, ainda não apontado. Precisa resolver para o IP do servidor onde o EasyPanel está instalado antes do EasyPanel conseguir emitir SSL para ele.

**Files:** nenhum — configuração externa (painel DNS da Hostinger).

**Interfaces:** N/A.

- [ ] **Step 1: Obter o IP do servidor EasyPanel**

Perguntar ao usuário o IP do servidor (aparece no painel do EasyPanel ou no painel da VPS da Hostinger).

- [ ] **Step 2: Criar o registro DNS**

No painel da Hostinger (hPanel → Domínios → DNS/Nameservers do domínio escolhido): criar um registro `A` apontando o domínio (ou subdomínio, ex: `crm.seudominio.com`) para o IP do servidor. Se o EasyPanel documentar um padrão diferente (ex: CNAME wildcard), seguir o padrão do painel do EasyPanel em vez deste.

- [ ] **Step 3: Validar propagação antes de seguir**

Run: `nslookup <dominio-escolhido>` (ou `ping <dominio-escolhido>` no Windows)
Expected: resolve para o IP do servidor configurado no Step 2. Propagação de DNS pode levar de minutos a algumas horas — não seguir para a Task 4 até isso resolver, ou o EasyPanel vai falhar ao emitir SSL.

---

## Task 4: Criar o serviço no EasyPanel com env vars e domínio

**Contexto:** com o domínio resolvendo e o repositório conectado (Task 2), falta configurar as variáveis de ambiente do build e do runtime, vincular o domínio e disparar o primeiro deploy.

**Files:** nenhum arquivo de código — configuração no painel do EasyPanel.

**Interfaces:**
- Consome: `Dockerfile:14-15` (`ARG NEXT_PUBLIC_SUPABASE_URL`, `ARG NEXT_PUBLIC_SUPABASE_ANON_KEY`), `Dockerfile:34-36` (`ENV PORT=3000`, expõe porta 3000).
- Produz: URL pública em produção, usada nas Tasks 5, 6, 7 e 8.

- [ ] **Step 1: Configurar build args**

No painel do serviço, seção de Build Args (não confundir com Environment Variables normais):
- `NEXT_PUBLIC_SUPABASE_URL` = URL do projeto Supabase (`https://lwitpxfbuhqdgfdaclwn.supabase.co`, confirmar em `.env.local` se existir localmente).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key do mesmo projeto.

- [ ] **Step 2: Configurar env vars de runtime**

Na seção normal de Environment Variables:
- `SUPABASE_SERVICE_ROLE_KEY` = service role key do projeto (nunca expor no cliente — confirmar que está indo como runtime env, não build arg).
- `NEXT_PUBLIC_APP_URL` = `https://<dominio-da-task-3>` (sem barra no final — o código concatena diretamente, ver `src/app/dashboard/config/actions.ts:122`).

- [ ] **Step 3: Vincular domínio e SSL**

Na seção de Domains do serviço: adicionar o domínio da Task 3, porta interna `3000` (igual ao `EXPOSE 3000` do Dockerfile), habilitar "Generate SSL" (Let's Encrypt automático do EasyPanel).

- [ ] **Step 4: Disparar o deploy**

Clicar em Deploy/Build no painel. Acompanhar o log de build até o fim.

Expected: log termina em sucesso (`✓ Compiled successfully` do Next.js, container sobe e fica "Running"/"Healthy").

- [ ] **Step 5: Validar HTTPS respondendo**

Run: `curl -I https://<dominio>`
Expected: `HTTP/2 200` (ou redirect para `/login`, já que o app raiz redireciona usuário não-autenticado).

---

## Task 5: Atualizar Site URL / Redirect URLs do Supabase Auth para produção

**Contexto:** hoje o projeto Supabase (`lwitpxfbuhqdgfdaclwn`) está configurado com URLs de `localhost`. Sem atualizar, login, convite de usuário e troca de senha vão redirecionar para `localhost` em produção — mesma classe de bug já documentada nesta sessão anterior de trabalho (fragmento de sessão em `/aceitar-convite`, ver `src/app/aceitar-convite/page.tsx`).

**Files:** nenhum arquivo de código — configuração no painel/API do Supabase, feita via MCP do Supabase nesta sessão.

**Interfaces:**
- Consome: domínio de produção definido na Task 3/4.
- Produz: nenhuma interface de código — pré-condição para login funcionar em produção (Task 6).

- [ ] **Step 1: Atualizar Site URL**

Via MCP do Supabase (ou painel Authentication → URL Configuration do projeto `lwitpxfbuhqdgfdaclwn`): trocar Site URL de `http://localhost:3000` para `https://<dominio-de-producao>`.

- [ ] **Step 2: Adicionar o domínio de produção nas Redirect URLs**

Adicionar `https://<dominio-de-producao>/**` à lista de Redirect URLs, mantendo `http://localhost:3000/**` se ainda for útil para desenvolvimento local.

- [ ] **Step 3: Validar que a mudança persistiu**

Reconsultar a configuração (via MCP, não confiar só na tela de confirmação do painel — histórico do projeto já mostrou o painel do Supabase "aceitando" um save sem persistir de fato mais de uma vez). Confirmar que o valor lido de volta é o domínio de produção, não mais `localhost`.

---

## Task 6: Validar o deploy básico em produção

**Contexto:** primeiro smoke test manual do app rodando no domínio real, antes de mexer com WhatsApp.

**Files:** nenhum — teste manual guiado.

**Interfaces:** N/A.

- [ ] **Step 1: Login**

Acessar `https://<dominio-de-producao>/login` e logar com o usuário admin existente (`bilionariodotrafego10@gmail.com`).
Expected: redireciona para `/dashboard/whatsapp` (rota padrão desde a Task 1) sem erro.

- [ ] **Step 2: Navegação básica**

Visitar as abas Follow-up, Cidades, Alunos, Configurações.
Expected: cada página carrega sem erro no console do navegador (F12 → Console) nem erro de rede 4xx/5xx nas chamadas ao Supabase.

- [ ] **Step 3: CRUD smoke test**

Em Configurações → Cidades: criar uma cidade de teste (ex: "Teste Deploy"), confirmar que aparece na lista, depois apagar.
Expected: criação e remoção funcionam sem erro.

---

## Task 7: Cadastrar a instância WhatsApp real no CRM e configurar o webhook

**Contexto:** o usuário já criou a conta Z-API, pagou e conectou o WhatsApp na plataforma deles. Falta trazer essas credenciais para dentro do CRM (Configurações → WhatsApp) e configurar o webhook no painel da Z-API para apontar para a URL de produção.

**Files:** nenhum arquivo de código — uso da UI já implementada (`src/components/whatsapp/formulario-instancia.tsx`, `src/app/dashboard/config/actions.ts:88-124`).

**Interfaces:**
- Consome: `NEXT_PUBLIC_APP_URL` configurada na Task 4 (o formulário só funciona com essa env var presente — `src/app/dashboard/config/actions.ts:95-97`).
- Produz: `webhookUrl` (string) exibida na tela após o cadastro, usada no Step 3 abaixo.

- [ ] **Step 1: Coletar credenciais da Z-API**

Pedir ao usuário, do painel da Z-API (developer.z-api.io → instância dele):
- **Instance ID**
- **Token da instância** (token que aparece junto do Instance ID, usado na URL da API)
- **Client-Token** (token de segurança da conta, em Segurança/Security do painel Z-API — separado do token da instância)

- [ ] **Step 2: Cadastrar no CRM**

Em `https://<dominio-de-producao>/dashboard/config`, seção WhatsApp: preencher Apelido (ex: nome do usuário), Telefone (formato `55DDDNÚMERO`, ex: `5511999999999`), Instance ID, Token da instância, Client-Token. Enviar.

Expected: mensagem "Número adicionado! Cole a URL abaixo no painel da Z-API..." com uma `webhookUrl` exibida em `<code>`.

- [ ] **Step 3: Configurar o webhook no painel da Z-API**

Copiar a `webhookUrl` exibida no Step 2 e colar no painel da Z-API, na opção "Ao receber" (webhook de mensagens recebidas) da instância.

Expected: painel da Z-API confirma o webhook salvo (a maioria dos provedores faz uma chamada de teste ao salvar — se a Z-API fizer isso, deve retornar sucesso já que o endpoint em `src/app/api/webhooks/zapi/[instanciaId]/route.ts` valida o secret e responde 200 mesmo para payloads de teste).

---

## Task 8: Teste ponta a ponta manual do WhatsApp (Task 15 original do plano de WhatsApp)

**Contexto:** este é o teste que nunca foi possível rodar antes por depender de deploy real — fecha a pendência documentada desde a implementação da feature de WhatsApp.

**Files:** nenhum — teste manual guiado.

**Interfaces:** N/A.

- [ ] **Step 1: Receber mensagem de texto**

De um celular real (não o número conectado), enviar uma mensagem de texto para o número do WhatsApp conectado na Task 7.
Expected: a mensagem aparece na aba WhatsApp do CRM em tempo real (via Realtime do Supabase), sem precisar recarregar a página.

- [ ] **Step 2: Responder pelo CRM**

Pelo CRM, abrir a conversa e responder com uma mensagem de texto.
Expected: a mensagem chega no celular real que enviou no Step 1.

- [ ] **Step 3: Enviar mídia do celular para o CRM**

Do celular real, enviar uma foto e um áudio para o número conectado.
Expected: ambos aparecem na conversa no CRM (imagem visível inline, áudio reproduzível), sem erro de download de mídia.

- [ ] **Step 4: Enviar mídia do CRM para o celular**

Pelo CRM, enviar uma foto (ou áudio, se a UI suportar gravação/anexo de áudio) na mesma conversa.
Expected: chega no celular real.

- [ ] **Step 5: Cadastrar lead a partir da conversa**

Na conversa aberta, usar o botão/modal de cadastro rápido de lead (`src/components/whatsapp/modal-cadastrar-lead.tsx` conforme já implementado).
Expected: lead aparece na aba Follow-up com nome e telefone corretos, sem duplicar.

- [ ] **Step 6: Registrar o resultado**

Se todos os 5 steps acima passarem sem erro: projeto está no ar e verificado ponta a ponta. Se algum falhar, documentar o erro exato (mensagem, console do navegador, log do EasyPanel) antes de investigar — não adivinhar a causa.

---

## Self-Review

**Cobertura da spec:** todas as 8 fases da spec (`2026-08-06-deploy-producao-design.md`) viraram tasks (Fase 0→Task 1, Fase 1→Task 3, Fase 2→Tasks 2+4, Fase 3→Task 5, Fase 4→Task 6, Fases 5-6→Task 7 Step 1-2, Fase 7→Task 7 Step 3, Fase 8→Task 8). Fase 5 da spec (criar conta Z-API) não virou task porque o usuário já completou essa parte antes deste plano ser escrito.

**Placeholders:** nenhum "TBD"/"implementar depois" — os únicos pontos em aberto (URL do domínio exato, IP do servidor, credenciais Z-API) são valores que só o usuário tem e cada task já diz explicitamente para perguntar a ele, não são lacunas de plano.

**Consistência:** nomes de env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`) e nomes de campos do formulário Z-API (`instanceId`, `token`, `clientToken`) conferem com o código-fonte lido nesta sessão (`Dockerfile`, `src/app/dashboard/config/actions.ts`, `src/components/whatsapp/formulario-instancia.tsx`).
