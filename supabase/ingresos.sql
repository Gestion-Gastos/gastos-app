-- =========================================================
-- Ingresos del mes (para ver cuánto queda disponible)
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

create table if not exists public.ingresos (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha        date not null default current_date,
  monto        numeric(12,2) not null check (monto > 0),
  moneda       text not null default '$' check (moneda in ('$', 'U$D')),
  cotizacion   numeric(12,2),
  descripcion  text,
  created_at   timestamptz not null default now()
);

create index if not exists ingresos_user_fecha_idx on public.ingresos (user_id, fecha desc);

alter table public.ingresos enable row level security;

-- Mismo criterio que los gastos: los míos, más los de quien me compartió (escritura solo con permiso 'escritura')
drop policy if exists "ver ingresos" on public.ingresos;
drop policy if exists "crear ingresos" on public.ingresos;
drop policy if exists "editar ingresos" on public.ingresos;
drop policy if exists "borrar ingresos" on public.ingresos;

create policy "ver ingresos" on public.ingresos
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = ingresos.user_id and c.email = lower(auth.jwt() ->> 'email')
    )
  );

create policy "crear ingresos" on public.ingresos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = ingresos.user_id and c.email = lower(auth.jwt() ->> 'email')
        and c.permiso = 'escritura'
    )
  );

create policy "editar ingresos" on public.ingresos
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = ingresos.user_id and c.email = lower(auth.jwt() ->> 'email')
        and c.permiso = 'escritura'
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = ingresos.user_id and c.email = lower(auth.jwt() ->> 'email')
        and c.permiso = 'escritura'
    )
  );

create policy "borrar ingresos" on public.ingresos
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.compartidos c
      where c.duenio_id = ingresos.user_id and c.email = lower(auth.jwt() ->> 'email')
        and c.permiso = 'escritura'
    )
  );

-- Para comprobar
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'ingresos'
order by policyname;
