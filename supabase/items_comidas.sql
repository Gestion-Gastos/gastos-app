-- =========================================================
-- Alimentos: "Otras Comidas Restaurant" se reemplaza por Almuerzo, Cena, Desayuno y Merienda.
-- Se puede correr más de una vez.
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

-- Items nuevos (predeterminados, Variable / Familiar como el resto de Alimentos)
insert into public.items (nombre, categoria_id, user_id)
select v.nombre, c.id, null
from (values ('Almuerzo'), ('Cena'), ('Desayuno'), ('Merienda')) as v(nombre)
cross join public.categorias c
where c.nombre = 'Alimentos' and c.user_id is null
  and not exists (
    select 1 from public.items i where i.nombre = v.nombre and i.user_id is null
  );

-- Si algún gasto usaba "Otras Comidas Restaurant", pasa a "Almuerzo" antes de borrarlo
update public.gastos
set item_id = (select id from public.items where nombre = 'Almuerzo' and user_id is null)
where item_id in (select id from public.items where nombre = 'Otras Comidas Restaurant' and user_id is null);

delete from public.items where nombre = 'Otras Comidas Restaurant' and user_id is null;

-- Para comprobar
select i.nombre
from public.items i
join public.categorias c on c.id = i.categoria_id
where c.nombre = 'Alimentos' and i.user_id is null
order by i.nombre;
