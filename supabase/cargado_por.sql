-- =========================================================
-- Quién cargó cada gasto, y que solo esa persona lo pueda borrar
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

alter table public.gastos add column if not exists creado_por uuid references auth.users(id) on delete set null;
alter table public.gastos add column if not exists creado_por_email text;

-- Los gastos que ya existen los cargó su dueño
update public.gastos g
set creado_por = g.user_id, creado_por_email = u.email
from auth.users u
where u.id = g.user_id and g.creado_por is null;

-- Lo completa la base (no se puede falsear desde la app) y no cambia al editar
create or replace function public.fijar_creado_por()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := coalesce(auth.uid(), new.creado_por);
    new.creado_por_email := coalesce(auth.jwt() ->> 'email', new.creado_por_email);
  else
    new.creado_por := old.creado_por;
    new.creado_por_email := old.creado_por_email;
  end if;
  return new;
end;
$$;

drop trigger if exists fijar_creado_por on public.gastos;
create trigger fijar_creado_por
  before insert or update on public.gastos
  for each row execute function public.fijar_creado_por();

-- Borrar: solo quien lo cargó, y mientras siga teniendo acceso de escritura
drop policy if exists "borrar gastos" on public.gastos;
create policy "borrar gastos" on public.gastos
  for delete to authenticated
  using (
    creado_por = auth.uid()
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.compartidos c
        where c.duenio_id = gastos.user_id and c.email = lower(auth.jwt() ->> 'email')
          and c.permiso = 'escritura'
      )
    )
  );

-- Para comprobar
select count(*) as gastos, count(creado_por) as con_creador from public.gastos;
