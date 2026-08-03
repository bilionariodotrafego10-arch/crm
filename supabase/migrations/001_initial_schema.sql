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
