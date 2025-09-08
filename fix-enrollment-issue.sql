-- Script para corrigir problemas de liberação de curso após pagamento
-- Execute este script no painel do Supabase após identificar o problema

-- CENÁRIO: Pagamento confirmado mas curso não liberado
-- Substitua os valores abaixo pelos dados reais do Gustavo Lessing

-- Exemplo de como inserir manualmente a inscrição no curso
-- (use apenas se confirmado que o pagamento foi processado mas a inscrição falhou)

/*
INSERT INTO course_enrollments (
  user_id,
  course_id,
  enrolled_at
)
SELECT 
  'USER_ID_DO_GUSTAVO',  -- Substitua pelo ID real
  c.id,
  NOW()
FROM courses c
WHERE c.title ILIKE '%Comunicação Persuasiva para Estética%'
  AND NOT EXISTS (
    SELECT 1 
    FROM course_enrollments ce 
    WHERE ce.user_id = 'USER_ID_DO_GUSTAVO' 
      AND ce.course_id = c.id
  );
*/

-- Verificar se a inscrição foi criada com sucesso
/*
SELECT 
  ce.id,
  ce.user_id,
  ce.course_id,
  ce.enrolled_at,
  c.title as course_title,
  p.full_name as student_name
FROM course_enrollments ce
JOIN courses c ON c.id = ce.course_id
JOIN profiles p ON p.id = ce.user_id
WHERE ce.user_id = 'USER_ID_DO_GUSTAVO';
*/

-- PASSOS PARA RESOLVER:
-- 1. Execute o script debug-gustavo-payment.sql primeiro
-- 2. Identifique o user_id do Gustavo e o course_id do curso
-- 3. Verifique se existe fatura paga mas sem inscrição
-- 4. Se necessário, descomente e execute a inserção manual acima
-- 5. Verifique se a inscrição foi criada corretamente

-- IMPORTANTE: Sempre verifique os dados antes de executar inserções manuais!