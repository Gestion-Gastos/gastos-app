-- =========================================================
-- Items (subcategorías) de la hoja "Items" de Docs/Configuracion.xlsx
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

-- Items: los que tienen user_id NULL son los predeterminados (visibles para todos).
-- categoria_id queda vacío por ahora; sirve para relacionar items con categorías más adelante.
create table if not exists public.items (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  categoria_id  bigint references public.categorias(id) on delete set null,
  user_id       uuid references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.gastos add column if not exists item_id bigint references public.items(id) on delete set null;

alter table public.items enable row level security;

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

-- Agrega los que falten
insert into public.items (nombre, user_id)
select v.nombre, null
from (values
  ('Cuota colegio'), ('Materiales'), ('Excursiones'), ('Edenor'), ('ABL / ARBA'), ('Aysa'),
  ('Naturgy'), ('Inglés'), ('Baile'), ('Voley'), ('Muchacha'), ('Aporte Muchacha'),
  ('Antigüedad'), ('Patente'), ('Seguro Auto'), ('Disney +'), ('Netflix'), ('Tuenti'),
  ('Fútbol'), ('OSDE'), ('Pilates'), ('Osteópata'), ('Psicóloga'), ('Claro'),
  ('Supermercado'), ('Verdulería'), ('Carnicería'), ('Panadería'), ('Farmacia'),
  ('Regalos Jardín y Colegio'), ('Arreglos Casa'), ('Resto'), ('Tarjeta'), ('Nafta'),
  ('Service Auto'), ('Almuerzo'), ('Cena'), ('Desayuno'), ('Merienda'), ('Ropa'), ('Útiles'), ('Regalos'),
  ('Depi + uñas'), ('Vacaciones'), ('Gastos de cumple')
) as v(nombre)
where not exists (
  select 1 from public.items i where i.nombre = v.nombre and i.user_id is null
);

-- Para comprobar
select id, nombre from public.items where user_id is null order by nombre;
