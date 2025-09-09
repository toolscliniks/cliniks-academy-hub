-- Correção do trigger de registro de usuários
-- Execute este SQL no Supabase Dashboard -> SQL Editor

-- Atualiza a função handle_new_user para chamar o webhook de registro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Insere o perfil do usuário
  insert into public.profiles (id, email, full_name, "role", cpf_cnpj, whatsapp)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'user',  -- Define o role padrão como 'user'
    new.raw_user_meta_data->>'cpf_cnpj',
    new.raw_user_meta_data->>'whatsapp'
  );
  
  -- Chama a função Edge Function para enviar dados para o webhook
  -- Usa perform para executar a função sem esperar retorno
  perform
    net.http_post(
      url := 'https://ywjqvjqvjqvjqvjqvjqv.supabase.co/functions/v1/register-user-webhook',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'userData', jsonb_build_object(
          'id', new.id,
          'email', new.email,
          'full_name', new.raw_user_meta_data->>'full_name',
          'whatsapp', new.raw_user_meta_data->>'whatsapp',
          'cpf_cnpj', new.raw_user_meta_data->>'cpf_cnpj'
        )
      )
    );
  
  return new;
end;
$$;

-- Recria o trigger para garantir que ele use a função atualizada
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Habilita a extensão http se não estiver habilitada
create extension if not exists http;

-- Configura a chave do service role como uma configuração do banco
-- Substitua 'SUA_SERVICE_ROLE_KEY' pela chave real do seu projeto
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'SUA_SERVICE_ROLE_KEY';