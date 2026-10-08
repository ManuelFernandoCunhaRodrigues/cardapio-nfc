-- Badge editorial exibido no cardápio público. Não aplicar automaticamente.
alter table public.products
add column badge text null
check (badge in ('mais_pedido', 'novo', 'quentinho'));
