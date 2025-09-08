-- 1. Adiciona colunas que possam faltar
alter table public.profiles add column if not exists cpf_cnpj text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists certificate_name text;

-- 2. Remove TODAS as políticas RLS que dependem da função is_admin
-- Tabela profiles
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Users can view their own profile." on public.profiles;
drop policy if exists "Enable read access for authenticated users" on public.profiles;
drop policy if exists "Admins can view all profiles." on public.profiles;
drop policy if exists "Admin users can view all profiles" on public.profiles;

-- Outras tabelas
drop policy if exists "Enable read access for enrolled users" on public.course_enrollments;
drop policy if exists "Enable read access for enrolled users" on public.lesson_progress;
drop policy if exists "Enable read access for certificate owners" on public.certificates;
drop policy if exists "Admin can manage courses" on public.courses;
drop policy if exists "Admin can manage modules" on public.modules;
drop policy if exists "Admin can manage lessons" on public.lessons;
drop policy if exists "Admin can manage plans" on public.plans;
drop policy if exists "Admin can manage subscriptions" on public.subscriptions;
drop policy if exists "Admin can manage enrollments" on public.course_enrollments;
drop policy if exists "Admin can manage lesson progress" on public.lesson_progress;
drop policy if exists "Admin can manage certificates" on public.certificates;
-- Removido: tabela notifications não existe
drop policy if exists "Admin can manage invoices" on public.invoices;

-- 3. Remove a função `is_admin` com CASCADE para remover dependências
drop function if exists is_admin(user_id uuid) cascade;
drop function if exists is_admin() cascade;
drop function if exists public.is_admin(user_id uuid) cascade;
drop function if exists public.is_admin() cascade;

-- 4. Cria a função `is_admin` corrigida para evitar recursão
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean as $$
declare
  is_admin_role boolean;
begin
  -- Usa uma consulta direta sem RLS para evitar recursão
  select exists (
    select 1 from public.profiles where id = coalesce(user_id, auth.uid()) and role = 'admin'
  ) into is_admin_role;

  return coalesce(is_admin_role, false);
end;
$$ language plpgsql security definer;

-- 5. Recria as políticas RLS de forma correta
-- Tabela profiles - políticas básicas primeiro
-- Política "Users can view their own profile" já existe, não precisa recriar

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Política de admin separada
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin(auth.uid()));

-- Outras tabelas
create policy "Users can view their enrollments" on public.course_enrollments
  for select using (auth.uid() = user_id);

create policy "Users can view their lesson progress" on public.lesson_progress
  for select using (auth.uid() = user_id);

create policy "Users can view their certificates" on public.certificates
  for select using (auth.uid() = user_id);

-- Políticas de admin para outras tabelas
create policy "Admins can manage enrollments" on public.course_enrollments
  for all using (public.is_admin(auth.uid()));

create policy "Admins can manage lesson progress" on public.lesson_progress
  for all using (public.is_admin(auth.uid()));

create policy "Admins can manage certificates" on public.certificates
  for all using (public.is_admin(auth.uid()));

-- Políticas para outras tabelas do sistema
create policy "Everyone can view published courses" on public.courses
  for select using (is_published = true);

create policy "Admins can manage courses" on public.courses
  for all using (public.is_admin(auth.uid()));

create policy "Everyone can view modules of published courses" on public.modules
  for select using (
    exists (
      select 1 from public.courses 
      where courses.id = modules.course_id and courses.is_published = true
    )
  );

create policy "Admins can manage modules" on public.modules
  for all using (public.is_admin(auth.uid()));

create policy "Everyone can view lessons of published courses" on public.lessons
  for select using (
    exists (
      select 1 from public.modules 
      join public.courses on courses.id = modules.course_id 
      where modules.id = lessons.module_id and courses.is_published = true
    )
  );

create policy "Admins can manage lessons" on public.lessons
  for all using (public.is_admin(auth.uid()));

create policy "Everyone can view active plans" on public.plans
  for select using (is_active = true);

create policy "Admins can manage plans" on public.plans
  for all using (public.is_admin(auth.uid()));

create policy "Users can view their subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "Admins can manage subscriptions" on public.subscriptions
  for all using (public.is_admin(auth.uid()));

create policy "Users can view their invoices" on public.invoices
  for select using (auth.uid() = user_id);

create policy "Admins can manage invoices" on public.invoices
  for all using (public.is_admin(auth.uid()));

-- 6. Atualiza a função handle_new_user e o trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, "role", cpf_cnpj, whatsapp)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'user',  -- Define o role padrão como 'user'
    new.raw_user_meta_data->>'cpf_cnpj',
    new.raw_user_meta_data->>'whatsapp'
  );
  return new;
end;
$$;

-- Recria o trigger para garantir que ele use a função atualizada
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();