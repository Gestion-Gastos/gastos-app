-- =========================================================
-- Un único item "Otros" sin categoría: aparece en la lista de todas las categorías
-- y el gasto conserva la categoría elegida. Se puede correr más de una vez.
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

insert into public.items (nombre, categoria_id, user_id)
select 'Otros', null, null
where not exists (
  select 1 from public.items where nombre = 'Otros' and categoria_id is null and user_id is null
);

-- Si antes se creó un "Otros" por categoría: sus gastos pasan al único y se borran
update public.gastos
set item_id = (select id from public.items where nombre = 'Otros' and categoria_id is null and user_id is null)
where item_id in (
  select id from public.items where nombre = 'Otros' and categoria_id is not null and user_id is null
);

delete from public.items where nombre = 'Otros' and categoria_id is not null and user_id is null;

-- Para comprobar (una sola fila, sin categoría)
select id, nombre, categoria_id from public.items where nombre = 'Otros' and user_id is null;
