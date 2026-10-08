-- =========================================================
-- Reemplaza las categorías predeterminadas por las de la hoja
-- "Categorias" de Docs/Configuracion.xlsx
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

-- Borra las predeterminadas que ya no van (los gastos que las usaban quedan "Sin categoría").
-- Las que se repiten (Servicios, Salud, Transporte, Otros) se conservan con su mismo id.
delete from public.categorias
where user_id is null
  and nombre not in (
    'Alimentos', 'Vivienda', 'Servicios', 'Salud', 'Deporte',
    'Entretenimiento', 'Transporte', 'Otros', 'Clase', 'Colegio'
  );

-- Agrega las que falten
insert into public.categorias (nombre, user_id)
select v.nombre, null
from (values
  ('Alimentos'), ('Vivienda'), ('Servicios'), ('Salud'), ('Deporte'),
  ('Entretenimiento'), ('Transporte'), ('Otros'), ('Clase'), ('Colegio')
) as v(nombre)
where not exists (
  select 1 from public.categorias c where c.nombre = v.nombre and c.user_id is null
);

-- Para comprobar
select id, nombre from public.categorias where user_id is null order by nombre;
