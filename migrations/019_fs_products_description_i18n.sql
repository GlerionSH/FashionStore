alter table public.fs_products add column if not exists description_es text;
alter table public.fs_products add column if not exists description_en text;

update public.fs_products
set description_es = description
where description_es is null
  and description is not null;

update public.fs_products
set description_en = description_es
where description_en is null
  and description_es is not null;
