-- Collably v0.3 backend. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in('buyer','worker')),username text unique not null,full_name text not null,bio text default '',skills text[] default '{}',tools text[] default '{}',hourly_rate numeric(10,2),avatar_url text,rating numeric(2,1),created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists public.portfolio_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,title text not null,description text default '',media_url text,media_type text default 'image',created_at timestamptz default now());
create table if not exists public.jobs(id uuid primary key default gen_random_uuid(),buyer_id uuid not null references public.profiles(id) on delete cascade,title text not null,description text not null,budget_min numeric(10,2),budget_max numeric(10,2),budget_type text not null check(budget_type in('project','hour','month')),skill text not null,status text not null default 'open' check(status in('open','closed')),created_at timestamptz default now());
create table if not exists public.applications(id uuid primary key default gen_random_uuid(),job_id uuid not null references public.jobs(id) on delete cascade,worker_id uuid not null references public.profiles(id) on delete cascade,message text not null,status text not null default 'pending' check(status in('pending','accepted','rejected')),created_at timestamptz default now(),unique(job_id,worker_id));
create table if not exists public.conversations(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists public.conversation_members(conversation_id uuid references public.conversations(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,primary key(conversation_id,user_id));
create table if not exists public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid references public.conversations(id) on delete cascade,sender_id uuid references public.profiles(id) on delete cascade,body text not null check(length(trim(body)) between 1 and 5000),created_at timestamptz default now());
create table if not exists public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id) on delete cascade,type text default 'system',title text not null,body text default '',read boolean default false,created_at timestamptz default now());
create index if not exists jobs_status on public.jobs(status);create index if not exists messages_conv on public.messages(conversation_id,created_at);create index if not exists notes_user on public.notifications(user_id,created_at desc);

do $$ declare t text; begin foreach t in array array['profiles','portfolio_items','jobs','applications','conversations','conversation_members','messages','notifications'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

-- Profiles
create policy profiles_select on public.profiles for select to authenticated using(true);
create policy profiles_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
-- Portfolio
create policy portfolio_select on public.portfolio_items for select to authenticated using(true);
create policy portfolio_insert on public.portfolio_items for insert to authenticated with check(user_id=auth.uid());
create policy portfolio_update on public.portfolio_items for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy portfolio_delete on public.portfolio_items for delete to authenticated using(user_id=auth.uid());
-- Jobs
create policy jobs_select on public.jobs for select to authenticated using(true);
create policy jobs_insert on public.jobs for insert to authenticated with check(buyer_id=auth.uid());
create policy jobs_update on public.jobs for update to authenticated using(buyer_id=auth.uid()) with check(buyer_id=auth.uid());
create policy jobs_delete on public.jobs for delete to authenticated using(buyer_id=auth.uid());
-- Applications
create policy apps_select on public.applications for select to authenticated using(worker_id=auth.uid() or exists(select 1 from public.jobs j where j.id=job_id and j.buyer_id=auth.uid()));
create policy apps_insert on public.applications for insert to authenticated with check(worker_id=auth.uid());
create policy apps_update on public.applications for update to authenticated using(worker_id=auth.uid() or exists(select 1 from public.jobs j where j.id=job_id and j.buyer_id=auth.uid()));
-- Conversations
create policy conv_select on public.conversations for select to authenticated using(exists(select 1 from public.conversation_members cm where cm.conversation_id=id and cm.user_id=auth.uid()));
create policy conv_insert on public.conversations for insert to authenticated with check(true);
create policy cm_select on public.conversation_members for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.conversation_members x where x.conversation_id=conversation_id and x.user_id=auth.uid()));
create policy cm_insert on public.conversation_members for insert to authenticated with check(user_id=auth.uid() or exists(select 1 from public.conversation_members x where x.conversation_id=conversation_id and x.user_id=auth.uid()));
-- Messages
create policy msg_select on public.messages for select to authenticated using(exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_id and cm.user_id=auth.uid()));
create policy msg_insert on public.messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_id and cm.user_id=auth.uid()));
-- Notifications
create policy note_select on public.notifications for select to authenticated using(user_id=auth.uid());
create policy note_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Storage: create a public bucket for portfolio media. Upload/delete still require RLS.
insert into storage.buckets(id,name,public) values('portfolio','portfolio',true) on conflict(id) do update set public=true;
create policy portfolio_storage_insert on storage.objects for insert to authenticated with check(bucket_id='portfolio' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy portfolio_storage_update on storage.objects for update to authenticated using(bucket_id='portfolio' and (storage.foldername(name))[1]=(select auth.uid()::text)) with check(bucket_id='portfolio' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy portfolio_storage_delete on storage.objects for delete to authenticated using(bucket_id='portfolio' and (storage.foldername(name))[1]=(select auth.uid()::text));

-- Realtime: add public.messages and public.notifications to the realtime publication in Dashboard if needed.
