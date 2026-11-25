-- Board photos left without a card are removed after a day; everything in use stays.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000c7', 'c7@example.test', '{"provision":false}');
insert into public.profiles (id, name) values ('00000000-0000-0000-0000-0000000000c7', 'Photographer C7');
insert into public.workspaces (id, name, plan_id)
select '0000000c-0000-0000-0000-000000000007', 'Studio C7', id from public.plans where code = 'free';
insert into public.projects (id, workspace_id, title) values
  ('c7000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000007', 'Cleanup shoot');

-- 1: an old board copy nobody uses (the browser stopped before the card was made).
-- 2: an old board copy on a card.   3: a fresh board copy, its card may still be coming.
-- 4: an old private file (Files).   5: an old board copy that a shot still shows.
insert into public.media_files (id, project_id, workspace_id, file_name, content_type, size_bytes, purpose, created_at) values
  ('c7100000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000007', 'lost.jpg',  'image/jpeg', 100, 'BOARD', now() - interval '2 days'),
  ('c7100000-0000-0000-0000-000000000002', 'c7000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000007', 'card.jpg',  'image/jpeg', 20,  'BOARD', now() - interval '2 days'),
  ('c7100000-0000-0000-0000-000000000003', 'c7000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000007', 'fresh.jpg', 'image/jpeg', 30,  'BOARD', now()),
  ('c7100000-0000-0000-0000-000000000004', 'c7000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000007', 'brief.jpg', 'image/jpeg', 40,  'FILE',  now() - interval '2 days'),
  ('c7100000-0000-0000-0000-000000000005', 'c7000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000007', 'shot.jpg',  'image/jpeg', 50,  'BOARD', now() - interval '2 days');
update public.media_files set status = 'READY', uploaded_at = now()
where workspace_id = '0000000c-0000-0000-0000-000000000007';

insert into public.board_items (project_id, workspace_id, kind, title, image_key)
select 'c7000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000007', 'IMAGE', 'On the board', object_key
from public.media_files where id = 'c7100000-0000-0000-0000-000000000002';
insert into public.shot_list_items (project_id, workspace_id, title, reference_image_key)
select 'c7000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000007', 'Kept shot', object_key
from public.media_files where id = 'c7100000-0000-0000-0000-000000000005';

create temporary table lost as
select object_key from public.media_files where id = 'c7100000-0000-0000-0000-000000000001';

select is(
  (select storage_used_bytes from public.workspaces where id = '0000000c-0000-0000-0000-000000000007'),
  240::bigint,
  'before the clean-up all five files count'
);
select is(private.purge_orphan_board_media(), 1, 'only the old unused board copy is removed');
select is(
  (select array_agg(file_name order by file_name) from public.media_files where workspace_id = '0000000c-0000-0000-0000-000000000007'),
  array['brief.jpg', 'card.jpg', 'fresh.jpg', 'shot.jpg'],
  'files on a card, in a shot, in Files or uploaded today stay'
);
select is(
  (select storage_used_bytes from public.workspaces where id = '0000000c-0000-0000-0000-000000000007'),
  140::bigint,
  'its space is given back'
);
select ok(
  exists (select 1 from public.storage_deletions where object_key = (select object_key from lost)),
  'its R2 object is queued for deletion'
);
select is(
  (select schedule from cron.job where jobname = 'purge-orphan-board-media'),
  '53 3 * * *',
  'the nightly clean-up is scheduled'
);

select * from finish();
rollback;