-- =========================================================
-- Personas que pagan los gastos ("Quién pagó"); la lista la arma cada usuario
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

create table if not exists public.personas (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Solo letras (con acentos y ñ), con un espacio entre palabras: "Rodrigo", "Juan Pablo"
  nombre      text not null check (nombre ~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'),
  created_at  timestamptz not null default now()
);

-- Sin repetidos ignorando mayúsculas: "Rodrigo" y "rodrigo" son la misma persona
create unique index if not exists personas_user_nombre_idx on public.personas (user_id, lower(nombre));

alter table public.personas enable row level security;

-- Mismo criterio que los gastos: las del dueño, y las de quien me compartió (agregar solo con 'escritura')
drop policy if exists "ver personas" on public.personas;
drop policy if exists "crear personas" on public.personas;

create policy "ver personas" on public.personas
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = personas.user_id and c.email = lower(auth.jwt() ->> 'email')
    )
  );

create policy "crear personas" on public.personas
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = personas.user_id and c.email = lower(auth.jwt() ->> 'email')
        and c.permiso = 'escritura'
    )
  );

-- Quién pagó cada gasto (los gastos viejos quedan vacíos; la app lo pide al cargar o editar)
alter table public.gastos add column if not exists pagado_por bigint references public.personas(id) on delete restrict;

-- Para comprobar
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'personas'
order by policyname;
