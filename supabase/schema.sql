-- =========================================================
-- Esquema de la app de gastos
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

-- Categorías: las que tienen user_id NULL son las predeterminadas (visibles para todos)
create table if not exists public.categorias (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  user_id     uuid references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Gastos: cada fila pertenece a un usuario
create table if not exists public.gastos (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha         date not null default current_date,
  monto         numeric(12,2) not null check (monto > 0),
  categoria_id  bigint references public.categorias(id) on delete set null,
  descripcion   text,
  medio_pago    text,
  created_at    timestamptz not null default now()
);

create index if not exists gastos_user_fecha_idx on public.gastos (user_id, fecha desc);

-- ---------------------------------------------------------
-- Seguridad: Row Level Security (cada usuario ve solo lo suyo)
-- ---------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.gastos     enable row level security;

drop policy if exists "ver categorias" on public.categorias;
create policy "ver categorias" on public.categorias
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

drop policy if exists "crear categorias propias" on public.categorias;
create policy "crear categorias propias" on public.categorias
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "borrar categorias propias" on public.categorias;
create policy "borrar categorias propias" on public.categorias
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "gastos propios" on public.gastos;
create policy "gastos propios" on public.gastos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------
-- Categorías iniciales
-- ---------------------------------------------------------
insert into public.categorias (nombre, user_id)
select v.nombre, null
from (values
  ('Comida'), ('Supermercado'), ('Transporte'), ('Servicios'),
  ('Alquiler'), ('Salud'), ('Ocio'), ('Ropa'), ('Educación'), ('Otros')
) as v(nombre)
where not exists (
  select 1 from public.categorias c where c.nombre = v.nombre and c.user_id is null
);
