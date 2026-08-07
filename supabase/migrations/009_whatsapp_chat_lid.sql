-- Adiciona chat_lid como identificador estável de conversa. O campo "phone"
-- retornado pela Z-API não é confiável sozinho: pro mesmo contato, o
-- WhatsApp pode devolver o número real numa mensagem e um identificador de
-- privacidade "@lid" noutra, o que fazia a mesma conversa se fragmentar em
-- várias linhas (sintoma relatado: mensagem enviada pelo celular aparecendo
-- numa conversa nova, com o nome do próprio dono da conta).
ALTER TABLE whatsapp_conversas ADD COLUMN chat_lid TEXT;

-- Índice único parcial (só quando chat_lid é conhecido) pra evitar duas
-- conversas com o mesmo chat_lid dentro da mesma instância.
CREATE UNIQUE INDEX whatsapp_conversas_instancia_chat_lid_key
  ON whatsapp_conversas (instancia_id, chat_lid)
  WHERE chat_lid IS NOT NULL;
