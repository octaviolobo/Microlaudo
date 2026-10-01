-- Provedores OAuth (ex.: Facebook) às vezes populam "name" em vez de "full_name"
-- no user_metadata. Adiciona fallback pra não perder o nome no cadastro social.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.doctors (user_id, full_name, crm, rqe)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'crm', ''),
    NEW.raw_user_meta_data->>'rqe'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
