-- =========================================================
-- Actualiza los items ya cargados a la versión nueva de la hoja "Items"
-- de Docs/Configuracion.xlsx (y corrige nombres mal escritos).
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

-- Renombres: conservan el id, así los gastos que ya los usan quedan bien
update public.items i
set nombre = v.nuevo
from (values
  ('Ingles meli', 'Ingles'),
  ('Clases Baile', 'Baile'),
  ('Voley Meli Laprida', 'Voley'),
  ('Tarjeta Ciudad', 'Tarjeta'),
  ('Nexflix', 'Netflix'),
  ('PIlates', 'Pilates'),
  ('materiales', 'Materiales'),
  ('excursiones', 'Excursiones')
) as v(viejo, nuevo)
where i.nombre = v.viejo and i.user_id is null;

-- Unificados: los gastos de estos items pasan al item que queda
update public.gastos
set item_id = (select id from public.items where nombre = 'Ingles' and user_id is null)
where item_id in (select id from public.items where nombre = 'ingles delfi' and user_id is null);

update public.gastos
set item_id = (select id from public.items where nombre = 'Tarjeta' and user_id is null)
where item_id in (
  select id from public.items
  where nombre in ('Otros items visa', 'Tarjeta Master Frances') and user_id is null
);

-- Eliminados (los gastos que usaban "Efectivo" quedan sin item)
delete from public.items
where user_id is null
  and nombre in ('ingles delfi', 'Otros items visa', 'Tarjeta Master Frances', 'Efectivo');

-- Para comprobar
select id, nombre from public.items where user_id is null order by nombre;
