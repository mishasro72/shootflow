-- Uploads: object keys made by the database, the storage quota, and the usage counter.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

-- Fixtures: a studio on a tiny plan (1000 bytes), so the quota is easy to reach.
insert into public.plans (id, code, name, max_active_projects, max_storage_bytes, max_photos_per_project)
values ('d0000000-0000-0000-0000-0000000000aa', 'tiny-test', 'Tiny', 5, 1000, 10);

insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000d1', 'd@example.test', '{"provision":false}');
insert into public.profiles (id, name) values ('00000000-0000-0000-0000-0000000000d1', 'Photographer D');
insert into public.workspaces (id, name, plan_id)
values ('0000000d-0000-0000-0000-000000000000', 'Studio D', 'd0000000-0000-0000-0000-0000000000aa');
insert into public.workspace_members (workspace_id, user_id)
values ('0000000d-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000d1');
insert into public.projects (id, workspace_id, title)
values ('d1000000-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000000', 'Quota shoot');

-- As the photographer ---------------------------------------------------------------

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ insert into public.media_files (id, project_id, workspace_id, file_name, content_type, size_bytes)
     values ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000000', 'a.jpg', 'image/jpeg', 600) $$,
  'a photographer can reserve an upload in their project'
);
select is(
  (select object_key from public.media_files where id = 'd2000000-0000-0000-0000-000000000001'),
  'ws/0000000d-0000-0000-0000-000000000000/projects/d1000000-0000-0000-0000-000000000001/files/d2000000-0000-0000-0000-000000000001',
  'the object key is made from the studio, project and file ids'
);
select is(
  (select status from public.media_files where id = 'd2000000-0000-0000-0000-000000000001'),
  'PENDING'::public.media_status,
  'a new upload starts as PENDING'
);
select throws_ok(
  $$ insert into public.media_files (project_id, workspace_id, file_name, content_type, size_bytes)
     values ('d1000000-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000000', 'b.jpg', 'image/jpeg', 500) $$,
  'P0001', 'storage_quota_exceeded', 'pending uploads count against the quota'
);
select throws_ok(
  $$ insert into public.media_files (project_id, workspace_id, file_name, content_type, size_bytes, object_key)
     values ('d1000000-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000000', 'c.jpg', 'image/jpeg', 10, 'ws/other/secret') $$,
  '42501', null, 'the caller cannot choose an object key'
);
select throws_ok(
  $$ update public.media_files set status = 'READY' where id = 'd2000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'only the server can mark an upload READY'
);
select throws_ok(
  $$ insert into public.media_files (project_id, workspace_id, file_name, content_type, size_bytes)
     values ('d1000000-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000000', 'x.exe', 'application/x-msdownload', 10) $$,
  '23514', null, 'only images and PDF files are accepted'
);

-- As the server (the owner role here stands in for the secret key) ------------------------

reset role;
set local request.jwt.claims to '';

update public.media_files set status = 'READY', uploaded_at = now() where id = 'd2000000-0000-0000-0000-000000000001';
select is(
  (select storage_used_bytes from public.workspaces where id = '0000000d-0000-0000-0000-000000000000'),
  600::bigint,
  'a READY file counts in storage_used_bytes'
);
select lives_ok(
  $$ insert into public.media_files (id, project_id, workspace_id, file_name, content_type, size_bytes)
     values ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000000', 'b.jpg', 'image/jpeg', 400) $$,
  'an upload that fits the rest of the quota exactly is accepted'
);
select is(
  (select storage_used_bytes from public.workspaces where id = '0000000d-0000-0000-0000-000000000000'),
  600::bigint,
  'a PENDING file does not count as used yet'
);

-- Deleting gives the space back.
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
set local role authenticated;
delete from public.media_files where id = 'd2000000-0000-0000-0000-000000000001';
reset role;
set local request.jwt.claims to '';

select is(
  (select storage_used_bytes from public.workspaces where id = '0000000d-0000-0000-0000-000000000000'),
  0::bigint,
  'deleting a READY file gives its space back'
);

-- A reservation nobody finished is cleared after a day.
update public.media_files set created_at = now() - interval '2 days' where id = 'd2000000-0000-0000-0000-000000000002';
select is(private.purge_stale_pending_media(), 1, 'a day-old PENDING upload is purged');
select is(
  (select count(*)::integer from public.media_files where workspace_id = '0000000d-0000-0000-0000-000000000000'),
  0,
  'nothing is left of the unfinished upload'
);
select is(
  (select schedule from cron.job where jobname = 'purge-stale-pending-media'),
  '41 3 * * *',
  'the nightly purge is scheduled'
);

select * from finish();
rollback;
