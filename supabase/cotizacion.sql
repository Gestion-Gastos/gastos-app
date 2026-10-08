-- =========================================================
-- Cotización del dólar de cada gasto en U$D (venta del oficial al momento de cargarlo)
-- Los gastos en $ la dejan vacía. Sirve para sumar todo en pesos.
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

alter table public.gastos add column if not exists cotizacion numeric(12,2);

-- Los gastos en U$D que ya existen toman la cotización de venta del 08/10/2026
update public.gastos set cotizacion = 1540 where moneda = 'U$D' and cotizacion is null;

-- Para comprobar
select moneda, count(*) as gastos, count(cotizacion) as con_cotizacion from public.gastos group by moneda;
