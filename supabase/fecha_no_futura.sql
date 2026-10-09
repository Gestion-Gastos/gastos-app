-- =========================================================
-- Los gastos no pueden tener fecha posterior a hoy
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

-- La app ya lo impide; esto es una red de seguridad. El "+ 1" cubre la diferencia horaria
-- (a la noche en Argentina el servidor, en UTC, ya está en el día siguiente).
-- "not valid": no revisa los gastos que ya existen, solo los nuevos y los que se modifiquen.
alter table public.gastos drop constraint if exists gastos_fecha_no_futura;
alter table public.gastos add constraint gastos_fecha_no_futura check (fecha <= current_date + 1) not valid;

-- Para comprobar
select conname, pg_get_constraintdef(oid) as definicion
from pg_constraint where conname = 'gastos_fecha_no_futura';
