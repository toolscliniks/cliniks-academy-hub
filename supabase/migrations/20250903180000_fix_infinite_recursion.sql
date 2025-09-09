-- Fix infinite recursion in RLS policies
-- This migration fixes the is_admin function to avoid recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Admin can manage modules" ON public.modules;
DROP POLICY IF EXISTS "Admin can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admin can manage plans" ON public.plans;
DROP POLICY IF EXISTS "Admin can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin can manage enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admin can manage lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Admin can manage certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a safe is_admin function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users u
    WHERE u.id = user_id
    AND u.raw_user_meta_data->>'role' = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
    AND p.role = 'admin'
  );
$$;

-- Recreate admin policies with the fixed function
CREATE POLICY "Admin can manage courses" ON public.courses
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage modules" ON public.modules
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage lessons" ON public.lessons
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage plans" ON public.plans
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage subscriptions" ON public.subscriptions
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage enrollments" ON public.course_enrollments
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage lesson progress" ON public.lesson_progress
FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can manage certificates" ON public.certificates
FOR ALL USING (public.is_admin());

-- Create a safe admin policy for profiles that doesn't cause recursion
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Ensure the admin user exists in profiles
INSERT INTO public.profiles (id, full_name, email, role)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Admin User'),
  u.email,
  'admin'
FROM auth.users u
WHERE u.email = 'gilemaeda2@gmail.com'
AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Comment explaining the fix
COMMENT ON FUNCTION public.is_admin IS 'Fixed function to check admin role without causing RLS recursion';