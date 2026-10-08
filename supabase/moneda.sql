-- =========================================================
-- Moneda de cada gasto: $ (pesos) o U$D (dólares)
-- Los gastos que ya existen quedan en $.
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

alter table public.gastos add column if not exists moneda text not null default '$'
  check (moneda in ('$', 'U$D'));

-- Para comprobar
select moneda, count(*) as gastos from public.gastos group by moneda;
