-- As migrações 010 e 011 adicionaram alunos.cidade_id e leads.status_venda,
-- mas o GRANT UPDATE column-level da migração 001 (que restringe UPDATE a
-- uma lista explícita de colunas, independente de RLS) não foi atualizado —
-- toda edição de aluno ou lead existente passou a falhar com "permission
-- denied for column" assim que o formulário passou a enviar essas colunas.
GRANT UPDATE (cidade_id) ON alunos TO authenticated;
GRANT UPDATE (status_venda) ON leads TO authenticated;
