-- Badge editorial exibido no cardápio público. Aplicada no staging como 20261009103822.
alter table public.products
add column badge text null
check (badge in ('mais_pedido', 'novo', 'quentinho'));
