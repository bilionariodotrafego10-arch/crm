-- Limita tamanho e tipo de arquivo aceitos no bucket de mídia do WhatsApp
UPDATE storage.buckets
SET file_size_limit = 16777216, allowed_mime_types = ARRAY['image/*', 'audio/*']
WHERE id = 'whatsapp-midia';
