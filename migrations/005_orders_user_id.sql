alter table public.fs_orders
add column if not exists user_id uuid null references auth.users(id);

create index if not exists fs_orders_user_id_idx on public.fs_orders(user_id);
