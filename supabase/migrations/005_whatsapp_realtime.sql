-- Habilita Realtime (postgres_changes) para conversas e mensagens do WhatsApp.
-- Sem isso as subscriptions em use-whatsapp-mensagens.ts / use-whatsapp-conversas.ts
-- conectam com sucesso mas nunca recebem eventos.
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversas, whatsapp_mensagens;
