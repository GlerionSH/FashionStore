-- ============================================================
-- Migration: support ticket system
-- Tables: fs_support_tickets, fs_support_replies
-- Run in Supabase SQL Editor (as postgres / service_role)
-- ============================================================

-- ----------------------------------------
-- 1. TABLES
-- ----------------------------------------

create table if not exists fs_support_tickets (
  id                       uuid        primary key default gen_random_uuid(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  status                   text        not null default 'open'
                             check (status in ('open', 'pending', 'answered', 'closed')),
  user_id                  uuid        null references auth.users(id) on delete set null,
  name                     text        not null check (char_length(name)    between 1 and 200),
  email                    text        not null check (char_length(email)   between 3 and 320),
  subject                  text        not null check (char_length(subject) between 1 and 300),
  message                  text        not null check (char_length(message) between 1 and 5000),
  admin_notes              text        null,
  email_user_ack_sent_at   timestamptz null,
  email_admin_notif_sent_at timestamptz null,
  last_error               text        null
);

create table if not exists fs_support_replies (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  ticket_id       uuid        not null references fs_support_tickets(id) on delete cascade,
  admin_user_id   uuid        null references auth.users(id) on delete set null,
  reply_text      text        not null check (char_length(reply_text) between 1 and 5000),
  sent_to_user_at timestamptz null,
  last_error      text        null
);

-- ----------------------------------------
-- 2. TRIGGER: keep updated_at current
-- ----------------------------------------

create or replace function fs_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fs_support_tickets_updated_at on fs_support_tickets;
create trigger fs_support_tickets_updated_at
  before update on fs_support_tickets
  for each row execute procedure fs_set_updated_at();

-- ----------------------------------------
-- 3. INDEXES
-- ----------------------------------------

create index if not exists idx_support_tickets_status_created
  on fs_support_tickets (status, created_at desc);

create index if not exists idx_support_tickets_email_created
  on fs_support_tickets (email, created_at desc);

create index if not exists idx_support_replies_ticket_id
  on fs_support_replies (ticket_id);

-- ----------------------------------------
-- 4. RLS
-- ----------------------------------------

alter table fs_support_tickets enable row level security;
alter table fs_support_replies  enable row level security;

-- Drop existing policies to make migration idempotent
drop policy if exists "support_tickets_anon_insert"   on fs_support_tickets;
drop policy if exists "support_tickets_user_select"   on fs_support_tickets;
drop policy if exists "support_tickets_admin_all"     on fs_support_tickets;
drop policy if exists "support_replies_admin_all"     on fs_support_replies;

-- Public: anyone can INSERT a ticket (server API validates inputs)
create policy "support_tickets_anon_insert"
  on fs_support_tickets for insert
  with check (true);

-- Authenticated users: can SELECT only their own tickets
create policy "support_tickets_user_select"
  on fs_support_tickets for select
  using (auth.uid() is not null and auth.uid() = user_id);

-- Admin: full access to tickets
create policy "support_tickets_admin_all"
  on fs_support_tickets for all
  using (
    exists (
      select 1 from fs_profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from fs_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin: full access to replies (users cannot read or write replies)
create policy "support_replies_admin_all"
  on fs_support_replies for all
  using (
    exists (
      select 1 from fs_profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from fs_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- END OF MIGRATION
-- ============================================================
