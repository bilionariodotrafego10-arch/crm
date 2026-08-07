-- Adiciona suporte a mensagens de vídeo e documento no WhatsApp (além de
-- texto/imagem/áudio já existentes).

ALTER TABLE whatsapp_mensagens DROP CONSTRAINT whatsapp_mensagens_tipo_check;
ALTER TABLE whatsapp_mensagens ADD CONSTRAINT whatsapp_mensagens_tipo_check
  CHECK (tipo IN ('texto', 'imagem', 'audio', 'video', 'documento'));

-- Amplia os tipos aceitos no bucket de mídia do WhatsApp para cobrir vídeo e
-- os formatos de documento mais comuns em negociação comercial (PDF, Office,
-- texto/CSV). Mantém o mesmo limite de tamanho (16MB) da migração 004.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/*',
  'audio/*',
  'video/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
]
WHERE id = 'whatsapp-midia';
