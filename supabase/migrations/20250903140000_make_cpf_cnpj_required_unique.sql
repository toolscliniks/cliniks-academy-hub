-- Migração para tornar cpf_cnpj obrigatório e único
-- Primeiro, vamos gerar CPFs únicos para registros que não têm cpf_cnpj
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 1;
BEGIN
    FOR rec IN SELECT id FROM profiles WHERE cpf_cnpj IS NULL OR cpf_cnpj = '' ORDER BY created_at
    LOOP
        UPDATE profiles 
        SET cpf_cnpj = LPAD(counter::text, 11, '0')
        WHERE id = rec.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Agora tornamos a coluna NOT NULL
ALTER TABLE profiles 
ALTER COLUMN cpf_cnpj SET NOT NULL;

-- Adicionamos constraint de unicidade
ALTER TABLE profiles 
ADD CONSTRAINT profiles_cpf_cnpj_unique UNIQUE (cpf_cnpj);

-- Adicionamos um índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_cpf_cnpj ON profiles(cpf_cnpj);

-- Comentário explicativo
COMMENT ON COLUMN profiles.cpf_cnpj IS 'CPF ou CNPJ do usuário - obrigatório e único para integração com gateway de pagamento';