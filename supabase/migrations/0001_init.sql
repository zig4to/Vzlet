-- Pisi: začetna shema (beležke -> sekcije -> strani, značke, koš)
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ali `supabase db push`,
-- če uporabljaš CLI).
--
-- Ta Supabase projekt je skupen z aplikacijo "Posel", zato so vse tabele
-- Pisi opremljene s predpono `pisi_`, pravice za vlogo `authenticated` pa
-- podeljene eksplicitno. Dostop do vrstic ureja RLS (user_id = auth.uid()).

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- posodobi `updated_at` ob vsakem UPDATE (funkcija je morda že ustvarjena za Posel)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ pisi_notebooks (Beležka) ============

create table public.pisi_notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  color text not null default '#3B82F6',
  is_pinned boolean not null default false,
  position double precision not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pisi_notebooks_user_id_idx on public.pisi_notebooks(user_id);
create index pisi_notebooks_active_idx
  on public.pisi_notebooks(user_id, position)
  where deleted_at is null;

create trigger pisi_notebooks_set_updated_at
  before update on public.pisi_notebooks
  for each row execute function public.set_updated_at();

alter table public.pisi_notebooks enable row level security;

create policy "pisi_notebooks_select_own" on public.pisi_notebooks
  for select using (user_id = auth.uid());
create policy "pisi_notebooks_insert_own" on public.pisi_notebooks
  for insert with check (user_id = auth.uid());
create policy "pisi_notebooks_update_own" on public.pisi_notebooks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_notebooks_delete_own" on public.pisi_notebooks
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_notebooks to authenticated;

-- ============ pisi_sections (Sekcija / zavihek) ============

create table public.pisi_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notebook_id uuid not null references public.pisi_notebooks(id) on delete cascade,
  title text not null,
  color text not null default '#64748B',
  is_pinned boolean not null default false,
  position double precision not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pisi_sections_user_id_idx on public.pisi_sections(user_id);
create index pisi_sections_notebook_id_idx on public.pisi_sections(notebook_id);
create index pisi_sections_active_idx
  on public.pisi_sections(notebook_id, position)
  where deleted_at is null;

create trigger pisi_sections_set_updated_at
  before update on public.pisi_sections
  for each row execute function public.set_updated_at();

alter table public.pisi_sections enable row level security;

create policy "pisi_sections_select_own" on public.pisi_sections
  for select using (user_id = auth.uid());
create policy "pisi_sections_insert_own" on public.pisi_sections
  for insert with check (user_id = auth.uid());
create policy "pisi_sections_update_own" on public.pisi_sections
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_sections_delete_own" on public.pisi_sections
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_sections to authenticated;

-- ============ pisi_pages (Stran) ============

create table public.pisi_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  section_id uuid not null references public.pisi_sections(id) on delete cascade,
  title text not null default 'Nova stran',
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  content_text text not null default '',
  is_pinned boolean not null default false,
  position double precision not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pisi_pages_user_id_idx on public.pisi_pages(user_id);
create index pisi_pages_section_id_idx on public.pisi_pages(section_id);
create index pisi_pages_active_idx
  on public.pisi_pages(section_id, position)
  where deleted_at is null;
create index pisi_pages_title_trgm_idx
  on public.pisi_pages using gin (title gin_trgm_ops);
create index pisi_pages_content_text_trgm_idx
  on public.pisi_pages using gin (content_text gin_trgm_ops);

create trigger pisi_pages_set_updated_at
  before update on public.pisi_pages
  for each row execute function public.set_updated_at();

alter table public.pisi_pages enable row level security;

create policy "pisi_pages_select_own" on public.pisi_pages
  for select using (user_id = auth.uid());
create policy "pisi_pages_insert_own" on public.pisi_pages
  for insert with check (user_id = auth.uid());
create policy "pisi_pages_update_own" on public.pisi_pages
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_pages_delete_own" on public.pisi_pages
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_pages to authenticated;

-- ============ pisi_tags (Značka) ============

create table public.pisi_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#64748B',
  created_at timestamptz not null default now(),
  constraint pisi_tags_name_unique unique (user_id, name)
);

create index pisi_tags_user_id_idx on public.pisi_tags(user_id);

alter table public.pisi_tags enable row level security;

create policy "pisi_tags_select_own" on public.pisi_tags
  for select using (user_id = auth.uid());
create policy "pisi_tags_insert_own" on public.pisi_tags
  for insert with check (user_id = auth.uid());
create policy "pisi_tags_update_own" on public.pisi_tags
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pisi_tags_delete_own" on public.pisi_tags
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pisi_tags to authenticated;

-- ============ pisi_page_tags (M:N stran <-> značka) ============

create table public.pisi_page_tags (
  page_id uuid not null references public.pisi_pages(id) on delete cascade,
  tag_id uuid not null references public.pisi_tags(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (page_id, tag_id)
);

create index pisi_page_tags_user_id_idx on public.pisi_page_tags(user_id);
create index pisi_page_tags_tag_id_idx on public.pisi_page_tags(tag_id);

alter table public.pisi_page_tags enable row level security;

create policy "pisi_page_tags_select_own" on public.pisi_page_tags
  for select using (user_id = auth.uid());
create policy "pisi_page_tags_insert_own" on public.pisi_page_tags
  for insert with check (user_id = auth.uid());
create policy "pisi_page_tags_delete_own" on public.pisi_page_tags
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.pisi_page_tags to authenticated;

-- ============ Storage: bucket za slike v straneh ============
-- Vsak uporabnik lahko piše samo v svojo mapo: pisi-images/<user_id>/...
-- Branje je javno (slike se prikazujejo prek public URL v urejevalniku).

insert into storage.buckets (id, name, public)
values ('pisi-images', 'pisi-images', true)
on conflict (id) do nothing;

create policy "pisi_images_public_read" on storage.objects
  for select using (bucket_id = 'pisi-images');

create policy "pisi_images_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'pisi-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pisi_images_update_own" on storage.objects
  for update to authenticated using (
    bucket_id = 'pisi-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pisi_images_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'pisi-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
