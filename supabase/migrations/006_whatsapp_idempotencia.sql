-- Idempotência de webhook: guarda o messageId da Z-API e impede inserção
-- duplicada da mesma mensagem recebida (retries do provedor após timeout).
ALTER TABLE whatsapp_mensagens ADD COLUMN zapi_message_id TEXT;
CREATE UNIQUE INDEX whatsapp_mensagens_zapi_message_id_key ON whatsapp_mensagens (zapi_message_id) WHERE zapi_message_id IS NOT NULL;
