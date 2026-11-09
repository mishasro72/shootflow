-- Photographer B must not read or change anything that belongs to photographer A,
-- through any table, and must still see their own data.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(64);

-- Fixtures (as the database owner) --------------------------------------------

-- provision=false: these fixtures create their own workspaces with fixed ids.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test', '{"provision":false}'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@example.test', '{"provision":false}');

insert into public.profiles (id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Photographer A', 'a@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'Photographer B', 'b@example.test');

insert into public.workspaces (id, name, plan_id)
select v.id, v.name, p.id
from (values
  ('0000000a-0000-0000-0000-000000000000'::uuid, 'Studio A'),
  ('0000000b-0000-0000-0000-000000000000'::uuid, 'Studio B')
) as v (id, name)
cross join (select id from public.plans where code = 'free') as p;

insert into public.workspace_members (workspace_id, user_id) values
  ('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1'),
  ('0000000b-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1');

insert into public.projects (id, workspace_id, title) values
  ('a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'A shoot'),
  ('b0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'B shoot');

-- One row of every project child table for A; workspace_id comes from the trigger.
insert into public.project_clients (id, project_id, workspace_id, name, email)
values ('a0000000-0000-0000-0000-0000000000c1', 'a0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'Model A', 'model@example.test');

insert into public.board_items (id, project_id, workspace_id, kind, group_role, title)
values ('a0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'GROUP', 'LOOK', 'Black dress');

insert into public.gear_items (id, workspace_id, kind, name)
values ('a0000000-0000-0000-0000-0000000000b8', '0000000a-0000-0000-0000-000000000000', 'LENS', '85mm f/1.4');

-- The lens chosen for the look also lands in the packing list (AUTO row).
insert into public.board_item_gear (board_item_id, gear_id, project_id, workspace_id)
values ('a0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000b8', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000');

insert into public.shot_list_items (id, project_id, workspace_id, title)
values ('a0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'Close-up');

insert into public.shot_list_item_gear (shot_list_item_id, gear_id, project_id, workspace_id)
values ('a0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000b8', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000');

insert into public.photos (id, project_id, workspace_id, original_filename, preview_key, thumb_key)
values ('a0000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMG_0001.jpg', 'k/p', 'k/t');

insert into public.comments (project_id, workspace_id, board_item_id, author_type, author_name, text)
values ('a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000d1', 'CLIENT', 'Model A', 'Can I bring a white shirt?');

insert into public.extra_retouch_orders (project_id, workspace_id, quantity, unit_price_cents)
values ('a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 2, 1500);

insert into public.media_files (id, project_id, workspace_id, file_name, content_type, size_bytes)
values ('a0000000-0000-0000-0000-0000000000a9', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'moodboard.jpg', 'image/jpeg', 1024);

insert into public.storage_deletions (object_key) values ('ws/a/projects/a/files/old');

insert into public.activity_events (project_id, workspace_id, type, actor_type)
values ('a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'concept.status_changed', 'CLIENT');

insert into public.notification_endpoints (workspace_id, recipient_type, user_id, channel, address)
values ('0000000a-0000-0000-0000-000000000000', 'PHOTOGRAPHER', '00000000-0000-0000-0000-0000000000a1', 'TELEGRAM', '123456');

select is(
  (select workspace_id from public.project_clients where id = 'a0000000-0000-0000-0000-0000000000c1'),
  '0000000a-0000-0000-0000-000000000000'::uuid,
  'child rows take workspace_id from their project, even when another is supplied'
);

select is(
  (select status from public.board_items where id = 'a0000000-0000-0000-0000-0000000000d1'),
  'PENDING'::public.review_status,
  'a new look waits for the client''s review'
);
select is(
  (select source from public.project_gear where gear_id = 'a0000000-0000-0000-0000-0000000000b8'),
  'AUTO'::public.gear_source,
  'gear chosen on a card is added to the packing list'
);

-- Act as photographer B --------------------------------------------------------

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::integer from public.workspaces), 1, 'B sees exactly one workspace');
select is((select name from public.workspaces), 'Studio B', 'B sees only Studio B');
select is((select count(*)::integer from public.workspace_members), 1, 'B sees only their own membership');
select is((select count(*)::integer from public.profiles), 1, 'B sees only their own profile');
select is((select count(*)::integer from public.projects), 1, 'B sees only their own project');
select is((select title from public.projects), 'B shoot', 'the visible project is B''s');

select is((select count(*)::integer from public.project_clients), 0, 'B cannot read A''s client');
select is((select count(*)::integer from public.board_items), 0, 'B cannot read A''s board');
select is((select count(*)::integer from public.gear_items), 0, 'B cannot read A''s kit');
select is((select count(*)::integer from public.board_item_gear), 0, 'B cannot read A''s card gear');
select is((select count(*)::integer from public.project_gear), 0, 'B cannot read A''s packing list');
select is((select count(*)::integer from public.shot_list_item_gear), 0, 'B cannot read A''s shot gear');
select is((select count(*)::integer from public.shot_list_items), 0, 'B cannot read A''s shot list');
select is((select count(*)::integer from public.photos), 0, 'B cannot read A''s photos');
select is((select count(*)::integer from public.comments), 0, 'B cannot read A''s comments');
select is((select count(*)::integer from public.extra_retouch_orders), 0, 'B cannot read A''s retouch orders');
select is((select count(*)::integer from public.activity_events), 0, 'B cannot read A''s activity');
select is((select count(*)::integer from public.notification_endpoints), 0, 'B cannot read A''s notification endpoints');
select is((select count(*)::integer from public.media_files), 0, 'B cannot read A''s files');
select is((select count(*)::integer from public.plans), 1, 'plans are readable reference data');

-- Writes against A's rows affect nothing.
update public.projects set title = 'hacked' where id = 'a0000000-0000-0000-0000-000000000001';
update public.workspaces set name = 'hacked' where id = '0000000a-0000-0000-0000-000000000000';
update public.profiles set name = 'hacked' where id = '00000000-0000-0000-0000-0000000000a1';
update public.project_clients set name = 'hacked' where id = 'a0000000-0000-0000-0000-0000000000c1';
update public.board_items set title = 'hacked' where id = 'a0000000-0000-0000-0000-0000000000d1';
update public.gear_items set name = 'hacked' where id = 'a0000000-0000-0000-0000-0000000000b8';
update public.project_gear set is_packed = true where project_id = 'a0000000-0000-0000-0000-000000000001';
update public.shot_list_items set title = 'hacked' where id = 'a0000000-0000-0000-0000-0000000000e1';
update public.photos set original_filename = 'hacked' where id = 'a0000000-0000-0000-0000-0000000000f1';
update public.notification_endpoints set address = 'hacked' where workspace_id = '0000000a-0000-0000-0000-000000000000';
delete from public.projects where id = 'a0000000-0000-0000-0000-000000000001';
delete from public.board_item_gear where board_item_id = 'a0000000-0000-0000-0000-0000000000d1';
delete from public.board_items where id = 'a0000000-0000-0000-0000-0000000000d1';
delete from public.gear_items where id = 'a0000000-0000-0000-0000-0000000000b8';
delete from public.project_gear where project_id = 'a0000000-0000-0000-0000-000000000001';
delete from public.shot_list_item_gear where shot_list_item_id = 'a0000000-0000-0000-0000-0000000000e1';
delete from public.photos where id = 'a0000000-0000-0000-0000-0000000000f1';
delete from public.comments where project_id = 'a0000000-0000-0000-0000-000000000001';
delete from public.media_files where id = 'a0000000-0000-0000-0000-0000000000a9';

-- Inserts into A's workspace or project are rejected.
select throws_ok(
  $$ insert into public.projects (workspace_id, title) values ('0000000a-0000-0000-0000-000000000000', 'intruder') $$,
  '42501', null, 'B cannot create a project in A''s workspace'
);
select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind) values ('a0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'NOTE') $$,
  '42501', null, 'B cannot add a card to A''s project, even claiming their own workspace'
);
select throws_ok(
  $$ insert into public.gear_items (workspace_id, kind, name) values ('0000000a-0000-0000-0000-000000000000', 'LENS', 'intruder') $$,
  '42501', null, 'B cannot add gear to A''s kit'
);
select throws_ok(
  $$ insert into public.board_item_gear (board_item_id, gear_id, project_id, workspace_id) values ('a0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000b8', 'b0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000') $$,
  '42501', null, 'B cannot attach gear to A''s card'
);
select throws_ok(
  $$ insert into public.project_gear (project_id, workspace_id, custom_name, custom_kind) values ('a0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'Tripod', 'OTHER') $$,
  '42501', null, 'B cannot add to A''s packing list'
);
select throws_ok(
  $$ select * from public.storage_deletions $$,
  '42501', null, 'B cannot read the storage deletion queue'
);
select throws_ok(
  $$ insert into public.shot_list_items (project_id, workspace_id) values ('a0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000') $$,
  '42501', null, 'B cannot add a shot to A''s project'
);
select throws_ok(
  $$ insert into public.photos (project_id, workspace_id, original_filename, preview_key, thumb_key) values ('a0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'x.jpg', 'x', 'x') $$,
  '42501', null, 'B cannot add a photo to A''s project'
);
select throws_ok(
  $$ insert into public.comments (project_id, workspace_id, board_item_id, author_type, author_name, text) values ('a0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000d1', 'PHOTOGRAPHER', 'B', 'hi') $$,
  '42501', null, 'B cannot comment on A''s card'
);
select throws_ok(
  $$ insert into public.media_files (project_id, workspace_id, file_name, content_type, size_bytes) values ('a0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'x.jpg', 'image/jpeg', 10) $$,
  '42501', null, 'B cannot upload into A''s project, even claiming their own workspace'
);
select throws_ok(
  $$ insert into public.notification_endpoints (workspace_id, recipient_type, user_id, channel, address) values ('0000000a-0000-0000-0000-000000000000', 'PHOTOGRAPHER', '00000000-0000-0000-0000-0000000000b1', 'EMAIL', 'b@example.test') $$,
  '42501', null, 'B cannot add a notification endpoint to A''s workspace'
);
select throws_ok(
  $$ insert into public.workspace_members (workspace_id, user_id) values ('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1') $$,
  '42501', null, 'B cannot add themselves to A''s workspace'
);
select throws_ok(
  $$ select public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'PLANNING') $$,
  'P0002', 'project not found', 'B cannot change the status of A''s project'
);
select throws_ok(
  $$ select * from public.link_codes $$,
  '42501', null, 'B cannot read link codes'
);
select throws_ok(
  $$ select * from public.notification_outbox $$,
  '42501', null, 'B cannot read the notification outbox'
);

-- B still controls their own data, but not the status column.
select lives_ok(
  $$ insert into public.board_items (id, project_id, workspace_id, kind, group_role, title) values ('b0000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'GROUP', 'LOOK', 'Red coat') $$,
  'B can add a card to their own project'
);
select throws_ok(
  $$ update public.board_items set status = 'APPROVED' where id = 'b0000000-0000-0000-0000-0000000000d1' $$,
  '42501', null, 'B cannot answer the review for the client, even on their own card'
);
select throws_ok(
  $$ insert into public.project_gear (project_id, workspace_id, gear_id, source) values ('b0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', null, 'AUTO') $$,
  '42501', null, 'B cannot write AUTO packing rows by hand'
);
select lives_ok(
  $$ update public.projects set title = 'B shoot, renamed' where id = 'b0000000-0000-0000-0000-000000000001' $$,
  'B can rename their own project'
);
select throws_ok(
  $$ update public.projects set status = 'COMPLETED' where id = 'b0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'B cannot set status directly, even on their own project'
);
select throws_ok(
  $$ update public.workspaces set storage_used_bytes = 0 where id = '0000000b-0000-0000-0000-000000000000' $$,
  '42501', null, 'B cannot reset the storage counter'
);
select throws_ok(
  $$ insert into public.projects (workspace_id, title, status) values ('0000000b-0000-0000-0000-000000000000', 'x', 'COMPLETED') $$,
  '42501', null, 'B cannot create a project with a chosen status'
);

-- Back to the owner to confirm nothing of A changed --------------------------------

reset role;
set local request.jwt.claims to '';

select is((select title from public.projects where id = 'a0000000-0000-0000-0000-000000000001'), 'A shoot', 'A''s project title is unchanged');
select is((select name from public.workspaces where id = '0000000a-0000-0000-0000-000000000000'), 'Studio A', 'A''s workspace is unchanged');
select is((select name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Photographer A', 'A''s profile is unchanged');
select is((select name from public.project_clients where id = 'a0000000-0000-0000-0000-0000000000c1'), 'Model A', 'A''s client is unchanged');
select is((select title from public.board_items where id = 'a0000000-0000-0000-0000-0000000000d1'), 'Black dress', 'A''s card is unchanged');
select is((select name from public.gear_items where id = 'a0000000-0000-0000-0000-0000000000b8'), '85mm f/1.4', 'A''s kit is unchanged');
select is((select count(*)::integer from public.board_item_gear), 1, 'A''s card gear still exists');
select is((select is_packed from public.project_gear where project_id = 'a0000000-0000-0000-0000-000000000001'), false, 'A''s packing list is unchanged');
select is((select count(*)::integer from public.shot_list_item_gear), 1, 'A''s shot gear still exists');
select is((select title from public.shot_list_items where id = 'a0000000-0000-0000-0000-0000000000e1'), 'Close-up', 'A''s shot is unchanged');
select is((select original_filename from public.photos where id = 'a0000000-0000-0000-0000-0000000000f1'), 'IMG_0001.jpg', 'A''s photo is unchanged');
select is((select count(*)::integer from public.comments where project_id = 'a0000000-0000-0000-0000-000000000001'), 1, 'A''s comment still exists');
select is((select count(*)::integer from public.media_files where project_id = 'a0000000-0000-0000-0000-000000000001'), 1, 'A''s file still exists');
select is((select address from public.notification_endpoints where workspace_id = '0000000a-0000-0000-0000-000000000000'), '123456', 'A''s endpoint is unchanged');
select is((select count(*)::integer from public.workspace_members where workspace_id = '0000000a-0000-0000-0000-000000000000'), 1, 'A''s workspace has one member');
select is((select status from public.projects where id = 'b0000000-0000-0000-0000-000000000001'), 'DRAFT'::public.project_status, 'B''s status did not change');

-- And A sees their own data through RLS.
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::integer from public.board_items), 1, 'A sees their own card');
select is((select count(*)::integer from public.project_gear), 1, 'A sees their packing list');
select is((select count(*)::integer from public.comments), 1, 'A sees the client''s comment');

select * from finish();
rollback;
