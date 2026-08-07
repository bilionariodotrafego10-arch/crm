-- Cidade do aluno, pra filtrar/exportar a lista de alunos por cidade.
ALTER TABLE alunos ADD COLUMN cidade_id UUID REFERENCES cidades(id) ON DELETE SET NULL;
