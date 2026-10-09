-- =========================================================
-- Comprobante adjunto a cada gasto (uno por gasto), guardado en Storage
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

-- Ruta del archivo en el bucket (null = sin comprobante)
alter table public.gastos add column if not exists comprobante text;

-- Bucket privado, hasta 10 MB por archivo
insert into storage.buckets (id, name, public, file_size_limit)
values ('comprobantes', 'comprobantes', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- Los archivos van en {duenio_id}/{gasto_id}/...: la primera carpeta es el dueño de los gastos.
-- Mismo criterio que los gastos: ve quien los ve, sube o borra quien puede escribir.
drop policy if exists "ver comprobantes" on storage.objects;
drop policy if exists "subir comprobantes" on storage.objects;
drop policy if exists "borrar comprobantes" on storage.objects;

create policy "ver comprobantes" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.compartidos c
        where c.duenio_id::text = (storage.foldername(name))[1]
          and c.email = lower(auth.jwt() ->> 'email')
      )
    )
  );

create policy "subir comprobantes" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.compartidos c
        where c.duenio_id::text = (storage.foldername(name))[1]
          and c.email = lower(auth.jwt() ->> 'email')
          and c.permiso = 'escritura'
      )
    )
  );

create policy "borrar comprobantes" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'comprobantes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.compartidos c
        where c.duenio_id::text = (storage.foldername(name))[1]
          and c.email = lower(auth.jwt() ->> 'email')
          and c.permiso = 'escritura'
      )
    )
  );

-- Para comprobar
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like '%comprobantes'
order by policyname;
