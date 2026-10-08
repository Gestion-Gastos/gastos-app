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

-- Items (subcategorías): mismo criterio que categorías. Ver supabase/items.sql para los valores.
create table if not exists public.items (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  categoria_id  bigint references public.categorias(id) on delete set null,
  user_id       uuid references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.gastos add column if not exists item_id bigint references public.items(id) on delete set null;

-- Fijo / Variable y Familiar / Individual: el item trae el valor por defecto, el gasto guarda el suyo.
-- Ver supabase/fijo_individual.sql para los valores.
alter table public.items  add column if not exists fijo       boolean not null default false;
alter table public.items  add column if not exists individual boolean not null default false;
alter table public.gastos add column if not exists fijo       boolean not null default false;
alter table public.gastos add column if not exists individual boolean not null default false;

create index if not exists gastos_user_fecha_idx on public.gastos (user_id, fecha desc);

-- ---------------------------------------------------------
-- Seguridad: Row Level Security (cada usuario ve solo lo suyo)
-- ---------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.gastos     enable row level security;
alter table public.items      enable row level security;

drop policy if exists "ver items" on public.items;
create policy "ver items" on public.items
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

drop policy if exists "crear items propios" on public.items;
create policy "crear items propios" on public.items
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "borrar items propios" on public.items;
create policy "borrar items propios" on public.items
  for delete to authenticated
  using (user_id = auth.uid());

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
  ('Alimentos'), ('Vivienda'), ('Servicios'), ('Salud'), ('Deporte'),
  ('Entretenimiento'), ('Transporte'), ('Otros'), ('Clase'), ('Colegio')
) as v(nombre)
where not exists (
  select 1 from public.categorias c where c.nombre = v.nombre and c.user_id is null
);
