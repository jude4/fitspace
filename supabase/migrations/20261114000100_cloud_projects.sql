-- Owner-scoped scenes. Direct writes are disabled; RPCs commit canonical data,
-- projections, versions and revision acknowledgements in one transaction.
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 display_name text not null default '' check (length(display_name)<=80)
);
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id) values(new.id); return new; end $$;
create trigger new_auth_profile after insert on auth.users for each row execute function public.new_profile();
create table public.projects (
 id uuid primary key, owner_id uuid not null references public.profiles on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 120),
 current_revision integer not null default 1 check(current_revision>0),
 current_scene jsonb not null check(public.valid_scene(current_scene)),
 creation_request_id uuid not null,
 thumbnail_asset_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id, creation_request_id)
);
create index projects_owner on public.projects(owner_id,updated_at desc);
create table public.rooms (
 project_id uuid primary key references public.projects on delete cascade,
 local_id text not null, document jsonb not null,
 unique(project_id,local_id)
);
create table public.placements (
 project_id uuid not null, local_id text not null, room_local_id text not null, document jsonb not null,
 primary key(project_id,local_id),
 foreign key(project_id,room_local_id) references public.rooms(project_id,local_id) on delete cascade
);
create table public.scene_versions (
 project_id uuid not null references public.projects on delete cascade,
 revision integer not null, request_id uuid not null, document jsonb not null check(public.valid_scene(document)),
 creator_id uuid not null references public.profiles,
 created_at timestamptz not null default now(),
 primary key(project_id,revision),unique(project_id,request_id)
);
create table public.assets (
 id uuid primary key default gen_random_uuid(), project_id uuid not null,
 revision integer not null, owner_id uuid not null references public.profiles,
 storage_path text unique not null, byte_count integer not null check(byte_count between 1 and 524288),
 mime_type text not null default 'image/png' check(mime_type='image/png'),
 foreign key(project_id,revision) references public.scene_versions on delete cascade
);
alter table public.projects add constraint thumbnail_asset foreign key(thumbnail_asset_id) references public.assets on delete set null;
create table public.sharing_permissions (
 id uuid primary key default gen_random_uuid(),project_id uuid not null,
 revision integer not null,token_hash text unique not null check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now(),
 foreign key(project_id,revision) references public.scene_versions on delete cascade
);
create index shares_project on public.sharing_permissions(project_id);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.rooms enable row level security;
alter table public.placements enable row level security;
alter table public.scene_versions enable row level security;
alter table public.assets enable row level security;
alter table public.sharing_permissions enable row level security;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy edit_own_profile on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy own_projects on public.projects for select to authenticated using(owner_id=(select auth.uid()));
create policy own_rooms on public.rooms for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy own_placements on public.placements for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy own_versions on public.scene_versions for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy own_assets on public.assets for select to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy own_shares on public.sharing_permissions for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
revoke all on public.profiles,public.projects,public.rooms,public.placements,public.scene_versions,public.assets,public.sharing_permissions from anon,authenticated;
grant select on public.profiles,public.projects,public.rooms,public.placements,public.scene_versions,public.assets,public.sharing_permissions to authenticated;
grant update(display_name) on public.profiles to authenticated;

create function public.project_snapshot(p_id uuid,p_revision integer,p_doc jsonb,p_request uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.placements where project_id=p_id;
 delete from public.rooms where project_id=p_id;
 insert into public.rooms values(p_id,p_doc->'room'->>'id',p_doc->'room');
 insert into public.placements select p_id,p->>'id',p->>'roomId',p from jsonb_array_elements(p_doc->'placements') p;
 insert into public.scene_versions(project_id,revision,request_id,document,creator_id) values(p_id,p_revision,p_request,p_doc,auth.uid());
end $$;
revoke all on function public.project_snapshot(uuid,integer,jsonb,uuid) from public,anon,authenticated;

create function public.create_project(p_id uuid,p_title text,p_document jsonb,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.projects;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not public.valid_scene(p_document) or p_document is null or length(btrim(p_title)) not between 1 and 120 then raise exception 'Invalid project' using errcode='22023'; end if;
 -- Serialize retries for the same owner/import request without conflating projects.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 select * into existing from public.projects where owner_id=auth.uid() and creation_request_id=p_request_id;
 if found then return jsonb_build_object('id',existing.id,'revision',existing.current_revision); end if;
 insert into public.projects(id,owner_id,title,current_scene,creation_request_id) values(p_id,auth.uid(),btrim(p_title),p_document,p_request_id);
 perform public.project_snapshot(p_id,1,p_document,p_request_id);
 return jsonb_build_object('id',p_id,'revision',1);
end $$;

create function public.save_project(p_id uuid,p_expected_revision integer,p_document jsonb,p_title text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare current public.projects; doc jsonb; rev integer;
begin
 select * into current from public.projects where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Project unavailable' using errcode='42501'; end if;
 select revision into rev from public.scene_versions where project_id=p_id and request_id=p_request_id;
 if found then return jsonb_build_object('id',p_id,'revision',rev); end if;
 if current.current_revision<>p_expected_revision then raise exception 'Revision conflict' using errcode='40001'; end if;
 doc=coalesce(p_document,current.current_scene);
 if not public.valid_scene(doc) or (p_title is not null and length(btrim(p_title)) not between 1 and 120) then raise exception 'Invalid scene or title' using errcode='22023'; end if;
 rev=current.current_revision+1;
 update public.projects set current_scene=doc,current_revision=rev,title=coalesce(btrim(p_title),title),updated_at=now() where id=p_id;
 perform public.project_snapshot(p_id,rev,doc,p_request_id);
 return jsonb_build_object('id',p_id,'revision',rev);
end $$;

create function public.delete_project(p_id uuid,p_expected_revision integer) returns void language plpgsql security definer set search_path='' as $$
declare rev integer;
begin
 select current_revision into rev from public.projects where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Project unavailable' using errcode='42501'; end if;
 if rev<>p_expected_revision then raise exception 'Revision conflict' using errcode='40001'; end if;
 delete from public.projects where id=p_id;
end $$;

create function public.attach_thumbnail(p_id uuid,p_revision integer,p_path text,p_bytes integer) returns void language plpgsql security definer set search_path='' as $$
declare asset uuid;
begin
 if not exists(select 1 from public.projects where id=p_id and owner_id=auth.uid()) or
 p_path<>auth.uid()::text||'/'||p_id::text||'/'||p_revision::text||'.png' then raise exception 'Unavailable asset' using errcode='42501'; end if;
 insert into public.assets(project_id,revision,owner_id,storage_path,byte_count) values(p_id,p_revision,auth.uid(),p_path,p_bytes)
 on conflict(storage_path) do update set byte_count=excluded.byte_count returning id into asset;
 update public.projects set thumbnail_asset_id=asset where id=p_id and current_revision=p_revision;
end $$;

create function public.create_share(p_id uuid,p_revision integer,p_hash text,p_expires timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare share_id uuid;
begin
 if not exists(select 1 from public.projects where id=p_id and owner_id=auth.uid()) then raise exception 'Project unavailable' using errcode='42501'; end if;
 if p_expires<=now() or p_expires>now()+interval '30 days' then raise exception 'Expiry must be within 30 days' using errcode='22023'; end if;
 insert into public.sharing_permissions(project_id,revision,token_hash,expires_at) values(p_id,p_revision,p_hash,p_expires) returning id into share_id;
 return share_id;
end $$;
create function public.revoke_share(p_share uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.sharing_permissions s set revoked_at=now() where s.id=p_share and exists(select 1 from public.projects p where p.id=s.project_id and p.owner_id=auth.uid());
 if not found then raise exception 'Share unavailable' using errcode='42501'; end if;
end $$;
create function public.resolve_share(p_hash text) returns jsonb language sql stable security definer set search_path='' as $$
 select v.document from public.sharing_permissions s join public.scene_versions v on v.project_id=s.project_id and v.revision=s.revision
 where s.token_hash=p_hash and s.revoked_at is null and s.expires_at>now()
$$;

revoke all on function public.new_profile(),public.create_project(uuid,text,jsonb,uuid),public.save_project(uuid,integer,jsonb,text,uuid),public.delete_project(uuid,integer),public.attach_thumbnail(uuid,integer,text,integer),public.create_share(uuid,integer,text,timestamptz),public.revoke_share(uuid),public.resolve_share(text) from public,anon,authenticated;
grant execute on function public.create_project(uuid,text,jsonb,uuid),public.save_project(uuid,integer,jsonb,text,uuid),public.delete_project(uuid,integer),public.attach_thumbnail(uuid,integer,text,integer),public.create_share(uuid,integer,text,timestamptz),public.revoke_share(uuid) to authenticated;
grant execute on function public.resolve_share(text) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('project-thumbnails','project-thumbnails',false,524288,array['image/png']);
create policy thumbnail_read on storage.objects for select to authenticated using(bucket_id='project-thumbnails' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy thumbnail_insert on storage.objects for insert to authenticated with check(bucket_id='project-thumbnails' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[2] and p.owner_id=(select auth.uid())));
-- Owners may clean up their own orphaned files after a project is deleted.
create policy thumbnail_delete on storage.objects for delete to authenticated using(bucket_id='project-thumbnails' and (storage.foldername(name))[1]=(select auth.uid())::text);
