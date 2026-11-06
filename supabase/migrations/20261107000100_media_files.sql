-- Files a photographer uploads to Cloudflare R2. The bytes live in R2; this table keeps
-- the object key, what the file is and whose it is. It also runs the studio's storage
-- quota: an upload reserves its size when it is signed and counts as used once the
-- server has seen the object in R2.
--
-- Life of a row:
--   PENDING  the server signed an upload URL; the size is reserved against the quota.
--   READY    the server checked the object in R2; its size is added to storage_used_bytes.
--   (row deleted) the object is gone; a READY size is given back.

create type public.media_status as enum ('PENDING', 'READY');

create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  -- Set by the database from the ids below, never by the caller (see the trigger). The
  -- empty default only makes the column optional for inserts; the trigger always replaces it.
  object_key text not null unique default '',
  file_name text not null check (char_length(file_name) between 1 and 255),
  content_type text not null check (content_type ~ '^(image/[a-z0-9.+-]+|application/pdf)$'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 100 * 1024 * 1024),
  status public.media_status not null default 'PENDING',
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.media_files is 'Uploaded files (bytes in R2). PENDING reserves quota; READY counts in storage_used_bytes.';

create index media_files_project_idx on public.media_files (project_id, created_at);
create index media_files_pending_idx on public.media_files (workspace_id) where status = 'PENDING';

-- RLS in the same migration as the table.
alter table public.media_files enable row level security;

create policy media_files_member_read on public.media_files
  for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy media_files_member_insert on public.media_files
  for insert to authenticated
  with check (private.is_workspace_member(workspace_id));
create policy media_files_member_delete on public.media_files
  for delete to authenticated
  using (private.is_workspace_member(workspace_id));

-- Photographers may create a PENDING row (the sign step) and delete their files. Only the
-- server, after checking the object in R2, may mark a row READY: there is no update grant.
revoke all on public.media_files from authenticated, anon;
grant select, delete on public.media_files to authenticated;
grant insert (project_id, workspace_id, file_name, content_type, size_bytes) on public.media_files to authenticated;

-- Triggers fire in name order: first the workspace from the project, then the key and quota.
create trigger media_files_a_workspace before insert or update of project_id, workspace_id on public.media_files
  for each row execute function private.set_workspace_from_project();

create function private.media_files_reserve()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used bigint;
  v_pending bigint;
  v_limit bigint;
begin
  -- The key is always made here, so nobody can point a row at another studio's object.
  new.object_key := format('ws/%s/projects/%s/files/%s', new.workspace_id, new.project_id, new.id);
  new.status := 'PENDING';
  new.uploaded_at := null;

  -- Lock the studio row: parallel uploads queue here, so together they cannot pass the limit.
  select w.storage_used_bytes, p.max_storage_bytes
  into v_used, v_limit
  from public.workspaces w
  join public.plans p on p.id = w.plan_id
  where w.id = new.workspace_id
  for update of w;

  select coalesce(sum(m.size_bytes), 0) into v_pending
  from public.media_files m
  where m.workspace_id = new.workspace_id and m.status = 'PENDING';

  if v_used + v_pending + new.size_bytes > v_limit then
    raise exception 'storage_quota_exceeded'
      using errcode = 'P0001', detail = format('used %s, pending %s, limit %s', v_used, v_pending, v_limit);
  end if;

  return new;
end;
$$;

create trigger media_files_b_reserve before insert on public.media_files
  for each row execute function private.media_files_reserve();

-- Keeps workspaces.storage_used_bytes equal to the sum of READY files.
create function private.media_files_count_storage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'PENDING' and new.status = 'READY' then
    update public.workspaces
    set storage_used_bytes = storage_used_bytes + new.size_bytes
    where id = new.workspace_id;
  elsif tg_op = 'DELETE' and old.status = 'READY' then
    update public.workspaces
    set storage_used_bytes = greatest(storage_used_bytes - old.size_bytes, 0)
    where id = old.workspace_id;
  end if;
  return null;
end;
$$;

create trigger media_files_count_storage after update of status or delete on public.media_files
  for each row execute function private.media_files_count_storage();

-- A signed upload that never finished keeps its reservation for a day, then the row goes.
-- (A browser that died halfway may leave bytes in R2; the bucket's lifecycle rule for
-- unfinished uploads covers multipart parts, and plain PUTs are rare enough to ignore.)
create function private.purge_stale_pending_media()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.media_files
    where status = 'PENDING' and created_at < now() - interval '1 day'
    returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function private.purge_stale_pending_media() from public;

select cron.schedule('purge-stale-pending-media', '41 3 * * *', 'select private.purge_stale_pending_media()');
