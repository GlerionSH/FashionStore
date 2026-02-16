-- FashionStore: categories i18n (ES/EN)

-- Add i18n fields to categories
alter table if exists public.fs_categories
	add column if not exists name_es text,
	add column if not exists name_en text;

-- Backfill ES name from existing name
update public.fs_categories
set name_es = name	
where name_es is null
	and name is not null;

-- Backfill EN name from ES name
update public.fs_categories
set name_en = name_es
where name_en is null
	and name_es is not null;
