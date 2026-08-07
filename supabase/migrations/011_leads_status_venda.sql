-- Status de negociação/pagamento do lead, independente do status de
-- follow-up (respondeu/não respondeu) que já existia.
ALTER TABLE leads ADD COLUMN status_venda TEXT NOT NULL DEFAULT 'negociando'
  CHECK (status_venda IN ('negociando', 'pago'));
