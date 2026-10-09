-- =========================================================
-- Nombre de cada ingreso: es una persona de la lista que usa "Quién pagó" en los gastos
-- Pegalo en Supabase > SQL Editor > New query > Run (después de supabase/personas.sql)
-- =========================================================

-- Los ingresos ya cargados quedan sin nombre; la app lo pide en los nuevos
alter table public.ingresos add column if not exists persona_id bigint references public.personas(id) on delete restrict;

-- Para comprobar
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'ingresos' and column_name = 'persona_id';
