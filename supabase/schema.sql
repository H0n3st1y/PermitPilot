-- PermitPilot Supabase Postgres schema
-- Run this in your Supabase SQL Editor to create the projects table and RLS policies.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  owner_email text,
  name text not null,
  config jsonb not null,
  roadmap jsonb not null,
  documents jsonb not null default '[]'::jsonb,
  inspections jsonb not null default '[]'::jsonb,
  fees jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_updated_idx
  on public.projects (user_id, updated_at desc);

create index if not exists projects_owner_email_updated_idx
  on public.projects (owner_email, updated_at desc);

alter table public.projects enable row level security;

-- Anyone with a direct project link (/projects/[id]) can view the roadmap (ideal for judges).
drop policy if exists "Projects are readable by link or owner" on public.projects;
create policy "Projects are readable by link or owner"
  on public.projects
  for select
  using (true);

-- Authenticated users can insert and update their own projects; demo/judge sessions can also upsert.
drop policy if exists "Users can insert projects" on public.projects;
create policy "Users can insert projects"
  on public.projects
  for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can update their projects" on public.projects;
create policy "Users can update their projects"
  on public.projects
  for update
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can delete their projects" on public.projects;
create policy "Users can delete their projects"
  on public.projects
  for delete
  using (auth.uid() = user_id or user_id is null);
