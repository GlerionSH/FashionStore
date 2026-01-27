-- FashionStore: invoices (token + sequential number)

alter table if exists public.fs_orders
	add column if not exists invoice_token text null,
	add column if not exists invoice_number text null,
	add column if not exists invoice_issued_at timestamptz null;

create unique index if not exists fs_orders_invoice_token_uniq
	on public.fs_orders(invoice_token)
	where invoice_token is not null;

create unique index if not exists fs_orders_invoice_number_uniq
	on public.fs_orders(invoice_number)
	where invoice_number is not null;

create table if not exists public.fs_invoice_seq (
	singleton boolean primary key default true,
	last_number integer not null default 0,
	updated_at timestamptz not null default now(),
	constraint fs_invoice_seq_singleton_check check (singleton = true)
);

insert into public.fs_invoice_seq(singleton, last_number)
values (true, 0)
on conflict (singleton) do nothing;

create or replace function public.fs_next_invoice_number()
returns text
language plpgsql
as $$
declare
	n integer;
	yyyy text;
begin
	select last_number into n
	from public.fs_invoice_seq
	where singleton = true
	for update;

	n := n + 1;
	update public.fs_invoice_seq
	set last_number = n, updated_at = now()
	where singleton = true;

	yyyy := to_char(now(), 'YYYY');
	return 'FS-' || yyyy || '-' || lpad(n::text, 6, '0');
end;
$$;
