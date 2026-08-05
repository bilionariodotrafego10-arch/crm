-- Corrige a migração 006: o índice único PARCIAL (WHERE zapi_message_id IS
-- NOT NULL) não pode ser usado como alvo de conflito por um ON CONFLICT
-- (zapi_message_id) via bare column name — o PostgREST não tem como repassar
-- o predicado WHERE através do parâmetro onConflict. Isso fazia todo upsert
-- de mensagem recebida com messageId falhar com ERRO 42P10.
--
-- Um índice único NÃO parcial resolve: por padrão o Postgres trata cada NULL
-- como distinto dos demais em um índice único, então linhas com
-- zapi_message_id IS NULL continuam ilimitadas (caso comum), enquanto
-- valores não nulos duplicados continuam sendo bloqueados — e agora o
-- Postgres consegue inferir o conflict arbiter a partir do nome da coluna.
DROP INDEX IF EXISTS whatsapp_mensagens_zapi_message_id_key;
CREATE UNIQUE INDEX whatsapp_mensagens_zapi_message_id_key ON whatsapp_mensagens (zapi_message_id);
