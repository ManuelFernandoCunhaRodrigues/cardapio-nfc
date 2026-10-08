-- Dados exclusivamente para homologação/local. Não execute em produção.
insert into public.categories (name, slug, description, sort_order) values
  ('Coxinhas', 'coxinhas', 'Salgados clássicos, feitos para a hora.', 10),
  ('Pastéis', 'pasteis', 'Pastéis sequinhos e recheados.', 20),
  ('Porções', 'porcoes', 'Para dividir — ou não.', 30),
  ('Combos', 'combos', 'Combinações para matar a fome.', 40),
  ('Drinks', 'drinks', 'Bebidas para acompanhar.', 50),
  ('Doces', 'doces', 'Um final doce para o pedido.', 60)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.products (category_id, name, description, price_cents, sort_order)
select id, 'Coxinha de frango', 'Frango cremoso em massa crocante.', 700, 10
from public.categories where slug = 'coxinhas'
and not exists (select 1 from public.products where name = 'Coxinha de frango' and category_id = categories.id);

insert into public.products (category_id, name, description, price_cents, sort_order)
select id, 'Pastel de carne', 'Carne temperada e queijo.', 900, 10
from public.categories where slug = 'pasteis'
and not exists (select 1 from public.products where name = 'Pastel de carne' and category_id = categories.id);

insert into public.products (category_id, name, description, price_cents, sort_order)
select id, 'Batata frita', 'Porção de batata crocante.', 1800, 10
from public.categories where slug = 'porcoes'
and not exists (select 1 from public.products where name = 'Batata frita' and category_id = categories.id);

insert into public.products (category_id, name, description, price_cents, sort_order)
select id, 'Combo Salgaê', 'Coxinha, batata e refrigerante.', 2500, 10
from public.categories where slug = 'combos'
and not exists (select 1 from public.products where name = 'Combo Salgaê' and category_id = categories.id);

insert into public.products (category_id, name, description, price_cents, sort_order)
select id, 'Refrigerante lata', 'Coca-Cola, Guaraná ou zero.', 600, 10
from public.categories where slug = 'drinks'
and not exists (select 1 from public.products where name = 'Refrigerante lata' and category_id = categories.id);

insert into public.products (category_id, name, description, price_cents, sort_order)
select id, 'Brigadeiro', 'Brigadeiro artesanal.', 450, 10
from public.categories where slug = 'doces'
and not exists (select 1 from public.products where name = 'Brigadeiro' and category_id = categories.id);
