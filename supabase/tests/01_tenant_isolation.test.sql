-- Photographer B must not read or change anything that belongs to photographer A,
-- through any table, and must still see their own data.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(46);

-- Fixtures (as the database owner) --------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@example.test');

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

insert into public.concept_items (id, project_id, workspace_id, category, title)
values ('a0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'WARDROBE', 'Black dress');

insert into public.shot_list_items (id, project_id, workspace_id, title)
values ('a0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'Close-up');

insert into public.photos (id, project_id, workspace_id, original_filename, preview_key, thumb_key)
values ('a0000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMG_0001.jpg', 'k/p', 'k/t');

insert into public.comments (project_id, workspace_id, concept_item_id, author_type, author_name, text)
values ('a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000d1', 'CLIENT', 'Model A', 'Can I bring a white shirt?');

insert into public.extra_retouch_orders (project_id, workspace_id, quantity, unit_price_cents)
values ('a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 2, 1500);

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
  (select visible_to_client from public.concept_items where id = 'a0000000-0000-0000-0000-0000000000d1'),
  true,
  'wardrobe cards are visible to the client by default'
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
select is((select count(*)::integer from public.concept_items), 0, 'B cannot read A''s concept items');
select is((select count(*)::integer from public.shot_list_items), 0, 'B cannot read A''s shot list');
select is((select count(*)::integer from public.photos), 0, 'B cannot read A''s photos');
select is((select count(*)::integer from public.comments), 0, 'B cannot read A''s comments');
select is((select count(*)::integer from public.extra_retouch_orders), 0, 'B cannot read A''s retouch orders');
select is((select count(*)::integer from public.activity_events), 0, 'B cannot read A''s activity');
select is((select count(*)::integer from public.notification_endpoints), 0, 'B cannot read A''s notification endpoints');
select is((select count(*)::integer from public.plans), 1, 'plans are readable reference data');

-- Writes against A's rows affect nothing.
update public.projects set title = 'hacked' where id = 'a0000000-0000-0000-0000-000000000001';
update public.workspaces set name = 'hacked' where id = '0000000a-0000-0000-0000-000000000000';
update public.profiles set name = 'hacked' where id = '00000000-0000-0000-0000-0000000000a1';
update public.project_clients set name = 'hacked' where id = 'a0000000-0000-0000-0000-0000000000c1';
update public.concept_items set title = 'hacked' where id = 'a0000000-0000-0000-0000-0000000000d1';
update public.shot_list_items set title = 'hacked' where id = 'a0000000-0000-0000-0000-0000000000e1';
update public.photos set original_filename = 'hacked' where id = 'a0000000-0000-0000-0000-0000000000f1';
update public.notification_endpoints set address = 'hacked' where workspace_id = '0000000a-0000-0000-0000-000000000000';
delete from public.projects where id = 'a0000000-0000-0000-0000-000000000001';
delete from public.concept_items where id = 'a0000000-0000-0000-0000-0000000000d1';
delete from public.photos where id = 'a0000000-0000-0000-0000-0000000000f1';
delete from public.comments where project_id = 'a0000000-0000-0000-0000-000000000001';

-- Inserts into A's workspace or project are rejected.
select throws_ok(
  $$ insert into public.projects (workspace_id, title) values ('0000000a-0000-0000-0000-000000000000', 'intruder') $$,
  '42501', null, 'B cannot create a project in A''s workspace'
);
select throws_ok(
  $$ insert into public.concept_items (project_id, workspace_id, category) values ('a0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'MOODBOARD') $$,
  '42501', null, 'B cannot add a card to A''s project, even claiming their own workspace'
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
  $$ insert into public.comments (project_id, workspace_id, concept_item_id, author_type, author_name, text) values ('a0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000d1', 'PHOTOGRAPHER', 'B', 'hi') $$,
  '42501', null, 'B cannot comment on A''s card'
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
  $$ insert into public.concept_items (project_id, workspace_id, category, title) values ('b0000000-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'EQUIPMENT', '85mm lens') $$,
  'B can add a card to their own project'
);
select is(
  (select visible_to_client from public.concept_items where title = '85mm lens'),
  false,
  'equipment is hidden from the client by default'
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
select is((select title from public.concept_items where id = 'a0000000-0000-0000-0000-0000000000d1'), 'Black dress', 'A''s card is unchanged');
select is((select title from public.shot_list_items where id = 'a0000000-0000-0000-0000-0000000000e1'), 'Close-up', 'A''s shot is unchanged');
select is((select original_filename from public.photos where id = 'a0000000-0000-0000-0000-0000000000f1'), 'IMG_0001.jpg', 'A''s photo is unchanged');
select is((select count(*)::integer from public.comments where project_id = 'a0000000-0000-0000-0000-000000000001'), 1, 'A''s comment still exists');
select is((select address from public.notification_endpoints where workspace_id = '0000000a-0000-0000-0000-000000000000'), '123456', 'A''s endpoint is unchanged');
select is((select count(*)::integer from public.workspace_members where workspace_id = '0000000a-0000-0000-0000-000000000000'), 1, 'A''s workspace has one member');
select is((select status from public.projects where id = 'b0000000-0000-0000-0000-000000000001'), 'DRAFT'::public.project_status, 'B''s status did not change');

-- And A sees their own data through RLS.
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::integer from public.concept_items), 1, 'A sees their own card');
select is((select count(*)::integer from public.comments), 1, 'A sees the client''s comment');

select * from finish();
rollback;
