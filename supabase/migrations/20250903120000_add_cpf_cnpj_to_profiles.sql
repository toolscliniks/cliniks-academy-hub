-- Adicionar coluna cpf_cnpj na tabela de perfis
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- Comentário para documentar o novo campo
COMMENT ON COLUMN public.profiles.cpf_cnpj IS 'CPF ou CNPJ do usuário para integração com gateway de pagamento';