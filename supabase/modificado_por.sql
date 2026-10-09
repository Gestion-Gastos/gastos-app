-- =========================================================
-- Quién modificó cada gasto por última vez (y cuándo)
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

alter table public.gastos add column if not exists modificado_por uuid references auth.users(id) on delete set null;
alter table public.gastos add column if not exists modificado_por_email text;
alter table public.gastos add column if not exists modificado_en timestamptz;

-- Reemplaza la de supabase/cargado_por.sql: lo completa la base (no se puede falsear desde la app).
-- Al crear: quién lo cargó. Al modificar: se conserva quién lo cargó y se registra quién lo modificó.
create or replace function public.fijar_creado_por()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := coalesce(auth.uid(), new.creado_por);
    new.creado_por_email := coalesce(auth.jwt() ->> 'email', new.creado_por_email);
    new.modificado_por := null;
    new.modificado_por_email := null;
    new.modificado_en := null;
  else
    new.creado_por := old.creado_por;
    new.creado_por_email := old.creado_por_email;
    new.modificado_por := auth.uid();
    new.modificado_por_email := auth.jwt() ->> 'email';
    new.modificado_en := now();
  end if;
  return new;
end;
$$;

-- Para comprobar
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'gastos' and column_name like 'modificado%'
order by column_name;
