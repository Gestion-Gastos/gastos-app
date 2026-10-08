-- =========================================================
-- Asigna a cada item predeterminado su categoría
-- Pegalo en Supabase > SQL Editor > New query > Run
-- =========================================================

update public.items i
set categoria_id = c.id
from (values
  ('Supermercado', 'Alimentos'), ('Verdulería', 'Alimentos'), ('Carnicería', 'Alimentos'),
  ('Panadería', 'Alimentos'), ('Resto', 'Alimentos'), ('Otras Comidas Restaurant', 'Alimentos'),
  ('ABL / ARBA', 'Vivienda'), ('Arreglos Casa', 'Vivienda'), ('Muchacha', 'Vivienda'),
  ('Aporte Muchacha', 'Vivienda'), ('Antigüedad', 'Vivienda'),
  ('Edenor', 'Servicios'), ('Aysa', 'Servicios'), ('Naturgy', 'Servicios'),
  ('Claro', 'Servicios'), ('Tuenti', 'Servicios'), ('Tarjeta', 'Servicios'),
  ('OSDE', 'Salud'), ('Farmacia', 'Salud'), ('Osteópata', 'Salud'), ('Psicóloga', 'Salud'),
  ('Fútbol', 'Deporte'), ('Voley', 'Deporte'), ('Pilates', 'Deporte'),
  ('Disney +', 'Entretenimiento'), ('Netflix', 'Entretenimiento'),
  ('Vacaciones', 'Entretenimiento'), ('Gastos de cumple', 'Entretenimiento'),
  ('Nafta', 'Transporte'), ('Patente', 'Transporte'), ('Seguro Auto', 'Transporte'),
  ('Service Auto', 'Transporte'),
  ('Inglés', 'Clase'), ('Baile', 'Clase'),
  ('Cuota colegio', 'Colegio'), ('Materiales', 'Colegio'), ('Excursiones', 'Colegio'),
  ('Útiles', 'Colegio'), ('Regalos Jardín y Colegio', 'Colegio'),
  ('Ropa', 'Otros'), ('Regalos', 'Otros'), ('Depi + uñas', 'Otros')
) as v(item, categoria)
join public.categorias c on c.nombre = v.categoria and c.user_id is null
where i.nombre = v.item and i.user_id is null;

-- Para comprobar (no debería quedar ningún item sin categoría)
select c.nombre as categoria, i.nombre as item
from public.items i
left join public.categorias c on c.id = i.categoria_id
where i.user_id is null
order by c.nombre nulls first, i.nombre;
