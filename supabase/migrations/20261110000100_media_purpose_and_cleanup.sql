-- Two things the board needs from uploads:
--
-- 1. A purpose for every uploaded file. FILE is the photographer's private "Files" folder
--    (step 6); BOARD is an image or a thumbnail that belongs to a board card. The Files
--    section lists only FILE; a board card may point only at BOARD files.
--
-- 2. A queue of R2 objects to delete. The database removes rows in many ways (a card
--    purged from the trash, an unfinished upload, a deleted project), but it cannot talk
--    to R2. Every deleted media_files row leaves its object key here, and a daily job on
--    the server (/api/cron/storage-cleanup) deletes those objects and empties the queue.

create type public.media_purpose as enum ('FILE', 'BOARD');

alter table public.media_files
  add column purpose public.media_purpose not null default 'FILE';

grant insert (purpose) on public.media_files to authenticated;

-- The Files section reads READY files of one purpose, newest first.
drop index public.media_files_project_idx;
create index media_files_project_idx on public.media_files (project_id, purpose, created_at);

-- ---------------------------------------------------------------------------
-- R2 deletion queue
-- ---------------------------------------------------------------------------

create table public.storage_deletions (
  object_key text primary key,
  queued_at timestamptz not null default now(),
  attempts integer not null default 0
);

comment on table public.storage_deletions is
  'R2 objects whose rows are gone. Emptied by the storage-cleanup cron route (service role only).';

-- RLS on, no policies: only the service role, which bypasses RLS, can use it.
alter table public.storage_deletions enable row level security;
revoke all on public.storage_deletions from anon, authenticated;

create function private.queue_storage_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.storage_deletions (object_key)
  values (old.object_key)
  on conflict (object_key) do nothing;
  return null;
end;
$$;

create trigger media_files_queue_deletion after delete on public.media_files
  for each row execute function private.queue_storage_deletion();
