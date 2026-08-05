-- Tabelas e storage para integração WhatsApp (Z-API)

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
