-- =========================================================
-- Fijo / Variable y Familiar / Individual
-- Cada item trae el valor por defecto; cada gasto guarda el suyo (se puede cambiar a mano).
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

alter table public.items  add column if not exists fijo       boolean not null default false;
alter table public.items  add column if not exists individual boolean not null default false;
alter table public.gastos add column if not exists fijo       boolean not null default false;
alter table public.gastos add column if not exists individual boolean not null default false;

-- Valores por defecto de los items predeterminados (el resto queda Variable / Familiar)
update public.items
set fijo = nombre in (
  'Cuota colegio', 'ABL / ARBA', 'Edenor', 'Aysa', 'Naturgy', 'Claro', 'Tuenti', 'Muchacha',
  'Aporte Muchacha', 'Antigüedad', 'Patente', 'Seguro Auto', 'OSDE', 'Disney +', 'Netflix',
  'Inglés', 'Baile', 'Voley', 'Fútbol', 'Pilates', 'Psicóloga'
),
individual = nombre in (
  'Inglés', 'Baile', 'Voley', 'Fútbol', 'Pilates', 'Osteópata', 'Psicóloga', 'Depi + uñas', 'Ropa'
)
where user_id is null;

-- Para comprobar
select c.nombre as categoria, i.nombre as item, i.fijo, i.individual
from public.items i
left join public.categorias c on c.id = i.categoria_id
where i.user_id is null
order by c.nombre, i.nombre;
