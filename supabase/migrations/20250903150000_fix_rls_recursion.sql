-- Correção para recursão infinita nas políticas RLS
-- O problema ocorre quando políticas RLS fazem consultas à própria tabela profiles

-- Primeiro, vamos remover as políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "Admin can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Admin can manage modules" ON public.modules;
DROP POLICY IF EXISTS "Admin can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admin can manage plans" ON public.plans;
DROP POLICY IF EXISTS "Admin can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin can manage enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admin can manage lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Admin can manage certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admin can manage notifications" ON public.notifications;

-- Criar uma função que verifica se o usuário é admin sem causar recursão
-- Esta função usa SECURITY DEFINER para contornar as políticas RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar as políticas usando a função is_admin() para evitar recursão
CREATE POLICY "Admin can manage courses" ON public.courses
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage modules" ON public.modules
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage lessons" ON public.lessons
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage plans" ON public.plans
FOR ALL USING (public.is_admin());

-- Adicionar políticas para outras tabelas se necessário
CREATE POLICY "Admin can manage subscriptions" ON public.subscriptions
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage enrollments" ON public.course_enrollments
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage lesson progress" ON public.lesson_progress
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage certificates" ON public.certificates
FOR ALL USING (public.is_admin());

-- Comentário explicativo
COMMENT ON FUNCTION public.is_admin IS 'Função para verificar se o usuário é admin sem causar recursão nas políticas RLS';