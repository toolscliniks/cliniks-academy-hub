-- Script de diagnóstico para verificar o pagamento e inscrição do Gustavo Lessing
-- Execute este script no painel do Supabase para investigar o problema

-- 1. Buscar o usuário Gustavo Lessing
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.created_at
FROM profiles p
WHERE p.full_name ILIKE '%Gustavo%' 
   OR p.full_name ILIKE '%Lessing%'
   OR p.email ILIKE '%gustavo%';

-- 2. Verificar faturas relacionadas ao usuário (substitua USER_ID pelo ID encontrado acima)
-- SELECT 
--   i.id,
--   i.user_id,
--   i.amount,
--   i.status,
--   i.asaas_payment_id,
--   i.external_reference,
--   i.created_at,
--   i.paid_at
-- FROM invoices i
-- WHERE i.user_id = 'USER_ID_AQUI'
-- ORDER BY i.created_at DESC;

-- 3. Verificar inscrições em cursos (substitua USER_ID pelo ID encontrado)
-- SELECT 
--   ce.id,
--   ce.user_id,
--   ce.course_id,
--   ce.enrolled_at,
--   c.title as course_title
-- FROM course_enrollments ce
-- JOIN courses c ON c.id = ce.course_id
-- WHERE ce.user_id = 'USER_ID_AQUI';

-- 4. Verificar se existe o curso "Comunicação Persuasiva para Estética"
SELECT 
  id,
  title,
  description,
  price,
  created_at
FROM courses
WHERE title ILIKE '%Comunicação Persuasiva%'
   OR title ILIKE '%Estética%';

-- 5. Verificar logs de pagamento recentes (últimos 7 dias)
-- Esta consulta pode não funcionar se não houver tabela de logs
-- SELECT *
-- FROM payment_logs
-- WHERE created_at >= NOW() - INTERVAL '7 days'
-- ORDER BY created_at DESC;

-- INSTRUÇÕES:
-- 1. Execute a primeira consulta para encontrar o ID do usuário Gustavo
-- 2. Substitua 'USER_ID_AQUI' nas consultas comentadas pelo ID real
-- 3. Descomente e execute as consultas uma por vez
-- 4. Verifique se há discrepâncias entre pagamento confirmado e inscrição no curso