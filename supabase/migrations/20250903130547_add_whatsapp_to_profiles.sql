-- Adicionar coluna de WhatsApp na tabela de perfis
ALTER TABLE public.profiles 
ADD COLUMN whatsapp TEXT;

-- Atualizar a função de trigger para incluir o novo campo
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentário para documentar o novo campo
COMMENT ON COLUMN public.profiles.whatsapp IS 'Número de WhatsApp do usuário no formato (00) 00000-0000';