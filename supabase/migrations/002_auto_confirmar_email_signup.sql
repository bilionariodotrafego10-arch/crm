-- Autocadastro público (aba /signup): confirma o email automaticamente no
-- momento da criação da conta, sem depender do toggle "Confirm email" do
-- painel (auth.email.enable_confirmations), cujo estado não é lido por SQL.
CREATE OR REPLACE FUNCTION public.auto_confirmar_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_confirmar_email() FROM PUBLIC;

CREATE TRIGGER trg_auto_confirmar_email
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirmar_email();
