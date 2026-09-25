-- Collably v0.6 migration
-- Run this AFTER the existing supabase.sql in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.projects(
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  budget numeric(10,2),
  due_date date,
  status text not null default 'active' check(status in('active','completed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reviews(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check(rating between 1 and 5),
  comment text default '',
  created_at timestamptz default now(),
  unique(project_id,reviewer_id)
);

create table if not exists public.saved_jobs(
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz default now(),
  primary key(user_id,job_id)
);

create index if not exists projects_buyer_idx on public.projects(buyer_id,created_at desc);
create index if not exists projects_worker_idx on public.projects(worker_id,created_at desc);
create index if not exists reviews_reviewee_idx on public.reviews(reviewee_id,created_at desc);
create index if not exists saved_jobs_user_idx on public.saved_jobs(user_id,created_at desc);

alter table public.projects enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_jobs enable row level security;

drop policy if exists "projects_select_participant" on public.projects;
create policy "projects_select_participant" on public.projects for select to authenticated
using(buyer_id=auth.uid() or worker_id=auth.uid());
drop policy if exists "projects_update_buyer" on public.projects;
create policy "projects_update_buyer" on public.projects for update to authenticated
using(buyer_id=auth.uid()) with check(buyer_id=auth.uid());

drop policy if exists "reviews_select_signed_in" on public.reviews;
create policy "reviews_select_signed_in" on public.reviews for select to authenticated using(true);
drop policy if exists "reviews_insert_participant" on public.reviews;
create policy "reviews_insert_participant" on public.reviews for insert to authenticated
with check(reviewer_id=auth.uid() and exists(select 1 from public.projects p where p.id=project_id and p.status='completed' and (p.buyer_id=auth.uid() or p.worker_id=auth.uid()) and p.buyer_id<>p.worker_id));

drop policy if exists "saved_jobs_select_own" on public.saved_jobs;
create policy "saved_jobs_select_own" on public.saved_jobs for select to authenticated using(user_id=auth.uid());
drop policy if exists "saved_jobs_insert_own" on public.saved_jobs;
create policy "saved_jobs_insert_own" on public.saved_jobs for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "saved_jobs_delete_own" on public.saved_jobs;
create policy "saved_jobs_delete_own" on public.saved_jobs for delete to authenticated using(user_id=auth.uid());

grant select,update on public.projects to authenticated;
grant select,insert on public.reviews to authenticated;
grant select,insert,delete on public.saved_jobs to authenticated;

-- When a buyer accepts an application, automatically create one active project.
create or replace function public.create_project_from_accepted_application()
returns trigger language plpgsql security definer set search_path=public as $$
declare j public.jobs%rowtype;
       project_exists boolean;
begin
  if new.status='accepted' and old.status is distinct from new.status then
    select * into j from public.jobs where id=new.job_id;
    select exists(select 1 from public.projects where job_id=new.job_id and worker_id=new.worker_id and status='active') into project_exists;
    if not project_exists then
      insert into public.projects(job_id,buyer_id,worker_id,title,description,budget)
      values(j.id,j.buyer_id,new.worker_id,j.title,j.description,coalesce(j.budget_max,j.budget_min));
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists application_accept_creates_project on public.applications;
create trigger application_accept_creates_project after update of status on public.applications
for each row execute procedure public.create_project_from_accepted_application();

-- Keep worker profile ratings in sync with published reviews.
create or replace function public.refresh_profile_rating()
returns trigger language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
  target:=coalesce(new.reviewee_id,old.reviewee_id);
  update public.profiles p
  set rating=(select round(avg(r.rating)::numeric,1) from public.reviews r where r.reviewee_id=target)
  where p.id=target;
  if TG_OP='DELETE' then return old; else return new; end if;
end; $$;
drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews
for each row execute procedure public.refresh_profile_rating();

-- Notify participants when a project changes status.
create or replace function public.notify_project_status()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications(user_id,title,body)
    values(new.buyer_id,'Project updated','“'||new.title||'” is now '||new.status||'.');
    insert into public.notifications(user_id,title,body)
    values(new.worker_id,'Project updated','“'||new.title||'” is now '||new.status||'.');
  end if;
  return new;
end; $$;
drop trigger if exists projects_notify_status on public.projects;
create trigger projects_notify_status after update of status on public.projects
for each row execute procedure public.notify_project_status();

do $$
begin
  begin alter publication supabase_realtime add table public.projects; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reviews; exception when duplicate_object then null; end;
end $$;

-- v0.6.1 upgrades: profile pictures + clickable notification destinations
alter table public.notifications add column if not exists target_type text;
alter table public.notifications add column if not exists target_id uuid;
create index if not exists notifications_target_idx on public.notifications(target_type,target_id);

-- Public avatar bucket. Users can only upload/change files inside their own folder.
insert into storage.buckets (id,name,public)
values ('avatars','avatars',true)
on conflict (id) do update set public=true;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
for select to public using(bucket_id='avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
for insert to authenticated
with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
for update to authenticated
using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
for delete to authenticated
using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

grant select,insert,update,delete on public.notifications to authenticated;

-- Update the project-status trigger so its notification opens the project.
create or replace function public.notify_project_status()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications(user_id,title,body,target_type,target_id)
    values(new.buyer_id,'Project updated','“'||new.title||'” is now '||new.status||'.','project',new.id);
    insert into public.notifications(user_id,title,body,target_type,target_id)
    values(new.worker_id,'Project updated','“'||new.title||'” is now '||new.status||'.','project',new.id);
  end if;
  return new;
end; $$;

drop trigger if exists projects_notify_status on public.projects;
create trigger projects_notify_status after update of status on public.projects
for each row execute procedure public.notify_project_status();
