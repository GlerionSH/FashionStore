create extension if not exists pgcrypto;

create table if not exists public.fs_subscribers (
	id uuid primary key default gen_random_uuid(),
	user_id uuid null,
	email text not null unique,
	status text not null default 'subscribed'
		check (status in ('subscribed','unsubscribed')),
	unsubscribe_token text not null unique default encode(gen_random_bytes(16), 'hex'),
	created_at timestamptz not null default now(),
	unsubscribed_at timestamptz null,
	source text null
);

create index if not exists fs_subscribers_status_idx
	on public.fs_subscribers (status, created_at desc);

create table if not exists public.fs_email_campaigns (
	id uuid primary key default gen_random_uuid(),
	type text not null,
	ref_id text not null,
	subject text not null,
	status text not null default 'queued'
		check (status in ('queued','sending','sent','failed')),
	totals jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	sent_at timestamptz null,
	constraint fs_email_campaigns_unique_type_ref unique (type, ref_id)
);

create index if not exists fs_email_campaigns_status_idx
	on public.fs_email_campaigns (status, created_at desc);

create table if not exists public.fs_email_deliveries (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.fs_email_campaigns(id) on delete cascade,
	email text not null,
	status text not null default 'queued'
		check (status in ('queued','sent','failed','skipped')),
	error text null,
	sent_at timestamptz null,
	created_at timestamptz not null default now(),
	constraint fs_email_deliveries_unique_campaign_email unique (campaign_id, email)
);

create index if not exists fs_email_deliveries_campaign_status_idx
	on public.fs_email_deliveries (campaign_id, status, created_at);

alter table public.fs_subscribers enable row level security;
alter table public.fs_email_campaigns enable row level security;
alter table public.fs_email_deliveries enable row level security;

drop policy if exists "Admins can manage subscribers" on public.fs_subscribers;
create policy "Admins can manage subscribers"
	on public.fs_subscribers
	for all
	using (public.fs_is_admin())
	with check (public.fs_is_admin());

drop policy if exists "Admins can manage campaigns" on public.fs_email_campaigns;
create policy "Admins can manage campaigns"
	on public.fs_email_campaigns
	for all
	using (public.fs_is_admin())
	with check (public.fs_is_admin());

drop policy if exists "Admins can manage deliveries" on public.fs_email_deliveries;
create policy "Admins can manage deliveries"
	on public.fs_email_deliveries
	for all
	using (public.fs_is_admin())
	with check (public.fs_is_admin());
