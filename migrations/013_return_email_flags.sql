alter table if exists public.fs_returns
	add column if not exists email_sent_requested_at timestamptz null,
	add column if not exists email_sent_reviewed_at timestamptz null,
	add column if not exists email_sent_refunded_at timestamptz null;
