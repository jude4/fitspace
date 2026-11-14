-- Allow existing Auth accounts to adopt FitSpace, without copying profile metadata.
insert into public.profiles(id) select id from auth.users on conflict do nothing;
-- Durable deletion work survives temporary Storage failures and project deletion.
-- No Auth FK: a future account-deletion worker must retain cleanup tasks until done.
create table public.asset_cleanup_jobs (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null,
 project_id uuid not null,paths text[] not null check(cardinality(paths)>0),
 created_at timestamptz not null default now()
);
alter table public.asset_cleanup_jobs enable row level security;
create policy own_cleanup_jobs on public.asset_cleanup_jobs for select to authenticated using(owner_id=(select auth.uid()));
revoke all on public.asset_cleanup_jobs from public,anon,authenticated;
grant select on public.asset_cleanup_jobs to authenticated;
create function public.queue_project_asset_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
declare paths text[];
begin
 select array_agg(storage_path) into paths from public.assets where project_id=old.id;
 if paths is not null then insert into public.asset_cleanup_jobs(owner_id,project_id,paths) values(old.owner_id,old.id,paths); end if;
 return old;
end $$;
create trigger queue_project_files before delete on public.projects for each row execute function public.queue_project_asset_cleanup();
create function public.finish_asset_cleanup(p_job uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.asset_cleanup_jobs where id=p_job and owner_id=auth.uid();
 if not found then raise exception 'Cleanup task unavailable' using errcode='42501'; end if;
end $$;
revoke all on function public.queue_project_asset_cleanup(),public.finish_asset_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.finish_asset_cleanup(uuid) to authenticated;
