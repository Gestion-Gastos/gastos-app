-- =========================================================
-- Compartir gastos con otros usuarios (por mail), con permiso de lectura o escritura
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

create table if not exists public.compartidos (
  id            bigint generated always as identity primary key,
  duenio_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  duenio_email  text not null default (auth.jwt() ->> 'email'),
  email         text not null check (email = lower(email)),
  permiso       text not null default 'lectura' check (permiso in ('lectura', 'escritura')),
  created_at    timestamptz not null default now(),
  unique (duenio_id, email)
);

alter table public.compartidos enable row level security;

-- El dueño maneja a quién le comparte
drop policy if exists "compartidos del duenio" on public.compartidos;
create policy "compartidos del duenio" on public.compartidos
  for all to authenticated
  using (duenio_id = auth.uid())
  with check (duenio_id = auth.uid());

-- El invitado ve las invitaciones hechas a su mail
drop policy if exists "compartidos conmigo" on public.compartidos;
create policy "compartidos conmigo" on public.compartidos
  for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

-- Gastos: los míos, más los de quien me compartió (escritura solo con permiso 'escritura')
drop policy if exists "gastos propios" on public.gastos;
drop policy if exists "ver gastos" on public.gastos;
drop policy if exists "crear gastos" on public.gastos;
drop policy if exists "editar gastos" on public.gastos;
drop policy if exists "borrar gastos" on public.gastos;

create policy "ver gastos" on public.gastos
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = gastos.user_id and c.email = lower(auth.jwt() ->> 'email')
    )
  );

create policy "crear gastos" on public.gastos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = gastos.user_id and c.email = lower(auth.jwt() ->> 'email')
        and c.permiso = 'escritura'
    )
  );

create policy "editar gastos" on public.gastos
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = gastos.user_id and c.email = lower(auth.jwt() ->> 'email')
        and c.permiso = 'escritura'
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = gastos.user_id and c.email = lower(auth.jwt() ->> 'email')
        and c.permiso = 'escritura'
    )
  );

create policy "borrar gastos" on public.gastos
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = gastos.user_id and c.email = lower(auth.jwt() ->> 'email')
        and c.permiso = 'escritura'
    )
  );

-- Para comprobar
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and tablename in ('gastos', 'compartidos')
order by tablename, policyname;
