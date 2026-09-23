-- Collably v0.4 Supabase schema
-- Run this whole file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in('buyer','worker')),
  username text unique not null,
  full_name text not null,
  bio text default '',
  skills text[] default '{}',
  tools text[] default '{}',
  hourly_rate numeric(10,2),
  avatar_url text,
  rating numeric(2,1),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.portfolio_items(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  media_url text,
  media_type text default 'image',
  created_at timestamptz default now()
);

create table if not exists public.jobs(
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  budget_type text not null check(budget_type in('project','hour','month')),
  skill text not null,
  status text not null default 'open' check(status in('open','closed')),
  created_at timestamptz default now()
);

create table if not exists public.applications(
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  cover_message text default '',
  status text not null default 'pending' check(status in('pending','accepted','rejected')),
  created_at timestamptz default now(),
  unique(job_id,worker_id)
);

create table if not exists public.conversations(
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  last_message text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(buyer_id,worker_id)
);

create table if not exists public.messages(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(length(trim(body))>0),
  created_at timestamptz default now()
);

create table if not exists public.notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text default '',
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists jobs_created_idx on public.jobs(created_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Profiles: everyone signed in can discover profiles; owners can edit their own.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id=auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

-- Portfolio: public to signed-in users; owner manages own.
drop policy if exists "portfolio_select" on public.portfolio_items;
create policy "portfolio_select" on public.portfolio_items for select to authenticated using (true);
drop policy if exists "portfolio_insert_own" on public.portfolio_items;
create policy "portfolio_insert_own" on public.portfolio_items for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "portfolio_delete_own" on public.portfolio_items;
create policy "portfolio_delete_own" on public.portfolio_items for delete to authenticated using(user_id=auth.uid());

-- Jobs: signed-in users can browse; buyers manage their own.
drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs for select to authenticated using (true);
drop policy if exists "jobs_insert_buyer" on public.jobs;
create policy "jobs_insert_buyer" on public.jobs for insert to authenticated with check(buyer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='buyer'));
drop policy if exists "jobs_update_owner" on public.jobs;
create policy "jobs_update_owner" on public.jobs for update to authenticated using(buyer_id=auth.uid()) with check(buyer_id=auth.uid());
drop policy if exists "jobs_delete_owner" on public.jobs;
create policy "jobs_delete_owner" on public.jobs for delete to authenticated using(buyer_id=auth.uid());

-- Applications: workers create their own; workers see their applications; buyers see applications for their jobs.
drop policy if exists "apps_select" on public.applications;
create policy "apps_select" on public.applications for select to authenticated using(worker_id=auth.uid() or exists(select 1 from public.jobs j where j.id=job_id and j.buyer_id=auth.uid()));
drop policy if exists "apps_insert_worker" on public.applications;
create policy "apps_insert_worker" on public.applications for insert to authenticated with check(worker_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='worker'));
drop policy if exists "apps_update_buyer" on public.applications;
create policy "apps_update_buyer" on public.applications for update to authenticated using(exists(select 1 from public.jobs j where j.id=job_id and j.buyer_id=auth.uid())) with check(exists(select 1 from public.jobs j where j.id=job_id and j.buyer_id=auth.uid()));

-- Conversations: only the two participants can access.
drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant" on public.conversations for select to authenticated using(buyer_id=auth.uid() or worker_id=auth.uid());
drop policy if exists "conversations_insert_buyer" on public.conversations;
create policy "conversations_insert_buyer" on public.conversations for insert to authenticated with check(buyer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='buyer'));
drop policy if exists "conversations_update_participant" on public.conversations;
create policy "conversations_update_participant" on public.conversations for update to authenticated using(buyer_id=auth.uid() or worker_id=auth.uid()) with check(buyer_id=auth.uid() or worker_id=auth.uid());

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant" on public.messages for select to authenticated using(exists(select 1 from public.conversations c where c.id=conversation_id and (c.buyer_id=auth.uid() or c.worker_id=auth.uid())));
drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender" on public.messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.buyer_id=auth.uid() or c.worker_id=auth.uid())));

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Automatically create a profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id,role,username,full_name)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'role','worker'),
    coalesce(new.raw_user_meta_data->>'username','user_'||substr(new.id::text,1,8)),
    coalesce(new.raw_user_meta_data->>'full_name','New User')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Portfolio storage bucket. This is intentionally public because portfolio items are meant to be discoverable.
insert into storage.buckets(id,name,public)
values('portfolio','portfolio',true)
on conflict(id) do update set public=true;

drop policy if exists "portfolio_upload_own" on storage.objects;
create policy "portfolio_upload_own" on storage.objects for insert to authenticated
with check(bucket_id='portfolio' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "portfolio_update_own" on storage.objects;
create policy "portfolio_update_own" on storage.objects for update to authenticated
using(bucket_id='portfolio' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='portfolio' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "portfolio_delete_own" on storage.objects;
create policy "portfolio_delete_own" on storage.objects for delete to authenticated
using(bucket_id='portfolio' and (storage.foldername(name))[1]=auth.uid()::text);

-- Anyone can read portfolio objects from this public bucket.
drop policy if exists "portfolio_public_read" on storage.objects;
create policy "portfolio_public_read" on storage.objects for select to public using(bucket_id='portfolio');

-- Enable realtime for chat.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
