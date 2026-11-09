-- transition_project_status: allowed path, preconditions, the one way back,
-- and collection of day-of references at SHOOT_DAY.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(33);

-- Fixtures ---------------------------------------------------------------------

-- provision=false: these fixtures create their own workspaces with fixed ids.
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000a1', 'a@example.test', '{"provision":false}');
insert into public.profiles (id, name) values ('00000000-0000-0000-0000-0000000000a1', 'Photographer A');
insert into public.workspaces (id, name, plan_id)
select '0000000a-0000-0000-0000-000000000000', 'Studio A', id from public.plans where code = 'free';
insert into public.workspace_members (workspace_id, user_id)
values ('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1');

insert into public.projects (id, workspace_id, title, retouch_limit)
values ('a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'Portrait session', 2);

-- Board cards: every answer a client can leave, plus cards that must stay out.
-- Two board images (bytes in R2) for the look's collage and a lens from the kit.
insert into public.media_files (id, project_id, workspace_id, file_name, content_type, size_bytes, purpose) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'dress.jpg', 'image/jpeg', 100, 'BOARD'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'dress-thumb.jpg', 'image/jpeg', 10, 'BOARD');
update public.media_files set status = 'READY' where project_id = 'a0000000-0000-0000-0000-000000000001';

insert into public.board_items (id, project_id, workspace_id, kind, group_role, title, status, sort_order, in_shot_list, visibility, technique_note) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'GROUP', 'LOOK', 'Window light',   'APPROVED',          1, true,  'EVERYONE', null),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMAGE', null,   'Unanswered ref', 'PENDING',           2, true,  'EVERYONE', null),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'GROUP', 'LOOK', 'Red coat',       'CHANGES_REQUESTED', 3, true,  'EVERYONE', null),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'GROUP', 'LOOK', 'Black dress',    'APPROVED',          4, true,  'EVERYONE', 'f/2, window on the left'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMAGE', null,   'Not for the day', 'APPROVED',         5, false, 'EVERYONE', null),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'NOTE',  null,   'Bring snacks',   null,                6, true,  'PRIVATE',  null),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMAGE', null,   'Studio test',    'APPROVED',          9, true,  'PRIVATE',  null);

-- An image inside the Black dress look (part of its collage) and a trashed image.
insert into public.board_items (id, project_id, workspace_id, kind, parent_id, title, image_key, thumb_key, sort_order) values
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMAGE', 'c0000000-0000-0000-0000-000000000004', 'Dress detail',
   (select object_key from public.media_files where id = 'e0000000-0000-0000-0000-000000000001'),
   (select object_key from public.media_files where id = 'e0000000-0000-0000-0000-000000000002'), 1);
insert into public.board_items (id, project_id, workspace_id, kind, title, status, sort_order, deleted_at) values
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMAGE', 'Trashed', 'APPROVED', 8, now());

insert into public.gear_items (id, workspace_id, kind, name)
values ('90000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'LENS', '85mm');
insert into public.board_item_gear (board_item_id, gear_id, project_id, workspace_id)
values ('c0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000');

-- The photographer's own shot that is not tied to a card, and one already added
-- from a card by hand before the shoot day.
insert into public.shot_list_items (project_id, workspace_id, board_item_id, title, sort_order) values
  ('a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', null, 'Hands close-up', 99),
  ('a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'Window light, my framing', 0);

-- Act as the photographer -------------------------------------------------------

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$ select public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'SHOOT_DAY') $$,
  '23514', 'transition DRAFT -> SHOOT_DAY is not allowed',
  'a status cannot be skipped'
);

select throws_ok(
  $$ select public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'PLANNING') $$,
  '23514', 'shoot date and location are required',
  'PLANNING needs a date and a location'
);

update public.projects
set shoot_start = '2026-11-14 15:00-05', shoot_end = '2026-11-14 18:00-05', location_name = 'Dix Park'
where id = 'a0000000-0000-0000-0000-000000000001';

select is(
  (select status from public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'PLANNING')),
  'PLANNING'::public.project_status,
  'DRAFT -> PLANNING once date and location are set'
);

-- The client answers after the shoot day starts; that must not change the list.
select is(
  (select status from public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'SHOOT_DAY')),
  'SHOOT_DAY'::public.project_status,
  'PLANNING -> SHOOT_DAY'
);

select set_eq(
  $$ select board_item_id from public.shot_list_items where project_id = 'a0000000-0000-0000-0000-000000000001' and board_item_id is not null $$,
  $$ values ('c0000000-0000-0000-0000-000000000001'::uuid), ('c0000000-0000-0000-0000-000000000002'::uuid),
            ('c0000000-0000-0000-0000-000000000004'::uuid), ('c0000000-0000-0000-0000-000000000009'::uuid) $$,
  'day-of shots are the approved and unanswered looks and images marked for the shot list'
);

select is(
  (select title from public.shot_list_items where board_item_id = 'c0000000-0000-0000-0000-000000000001'),
  'Window light, my framing',
  'a card already in the shot list is not duplicated or overwritten'
);

select ok(
  not exists (select 1 from public.shot_list_items where board_item_id = 'c0000000-0000-0000-0000-000000000003'),
  'a look marked CHANGES_REQUESTED is not collected'
);

select ok(
  not exists (select 1 from public.shot_list_items where board_item_id in (
    'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000008')),
  'cards off the shot list, notes, images inside a look and trashed cards are not collected'
);

select is(
  (select count(*)::integer from public.shot_list_items where project_id = 'a0000000-0000-0000-0000-000000000001' and board_item_id is null),
  1,
  'the photographer''s own shot is kept'
);

select is(
  (select title from public.shot_list_items where board_item_id = 'c0000000-0000-0000-0000-000000000004'),
  'Black dress',
  'collected shots copy the card title'
);

select is(
  (select collage_keys from public.shot_list_items where board_item_id = 'c0000000-0000-0000-0000-000000000004'),
  array[(select object_key from public.media_files where id = 'e0000000-0000-0000-0000-000000000002')],
  'a look becomes one shot with a collage of its image thumbnails'
);

select is(
  (select technique_note from public.shot_list_items where board_item_id = 'c0000000-0000-0000-0000-000000000004'),
  'f/2, window on the left',
  'the technique note comes along'
);

select is(
  (select g.gear_id from public.shot_list_item_gear g
   join public.shot_list_items s on s.id = g.shot_list_item_id
   where s.board_item_id = 'c0000000-0000-0000-0000-000000000004'),
  '90000000-0000-0000-0000-000000000001'::uuid,
  'the look''s lens comes along'
);

select is(
  (select visibility from public.shot_list_items where board_item_id = 'c0000000-0000-0000-0000-000000000009'),
  'PRIVATE'::public.board_visibility,
  'a private card stays private in the shot list'
);

select ok(
  (select bool_and(shot_status = 'PENDING') from public.shot_list_items where project_id = 'a0000000-0000-0000-0000-000000000001'),
  'every reference starts as PENDING'
);

select throws_ok(
  $$ select public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'PROOFING') $$,
  '23514', 'upload at least one preview first',
  'PROOFING needs at least one preview'
);

reset role;
insert into public.photos (id, project_id, workspace_id, original_filename, preview_key, thumb_key) values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMG_1.jpg', 'p1', 't1'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMG_2.jpg', 'p2', 't2'),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'IMG_3.jpg', 'p3', 't3');
set local role authenticated;

select is(
  (select status from public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'PROOFING')),
  'PROOFING'::public.project_status,
  'SHOOT_DAY -> PROOFING with previews uploaded'
);

-- The client portal acts through the service role ---------------------------------

reset role;
set local role service_role;

select throws_ok(
  $$ select public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'SELECTION_SUBMITTED', 'CLIENT') $$,
  '23514', 'select at least one photo',
  'an empty selection cannot be submitted'
);

update public.photos set is_selected = true, selection_type = 'INCLUDED', selected_at = now()
where project_id = 'a0000000-0000-0000-0000-000000000001';

select throws_ok(
  $$ select public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'SELECTION_SUBMITTED', 'CLIENT') $$,
  '23514', 'selection exceeds the retouch limit of 2',
  'a selection over the retouch limit cannot be submitted'
);

update public.photos set is_selected = false, selection_type = null, selected_at = null
where id = 'f0000000-0000-0000-0000-000000000003';

select is(
  (select status from public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'SELECTION_SUBMITTED', 'CLIENT')),
  'SELECTION_SUBMITTED'::public.project_status,
  'PROOFING -> SELECTION_SUBMITTED within the limit'
);

select isnt(
  (select selection_submitted_at from public.projects where id = 'a0000000-0000-0000-0000-000000000001'),
  null,
  'submission time is recorded'
);

select is(
  (select actor_type from public.activity_events where payload ->> 'to' = 'SELECTION_SUBMITTED'),
  'CLIENT'::public.actor_type,
  'the portal records the client as the actor'
);

-- Back to the photographer --------------------------------------------------------

reset role;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
set local role authenticated;

select is(
  (select status from public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'PROOFING')),
  'PROOFING'::public.project_status,
  'the photographer can unlock a submitted selection'
);

select is(
  (select selection_submitted_at from public.projects where id = 'a0000000-0000-0000-0000-000000000001'),
  null,
  'unlocking clears the submission time'
);

reset role;
set local role service_role;
select lives_ok(
  $$ select public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'SELECTION_SUBMITTED', 'CLIENT') $$,
  'the client can submit again after unlocking'
);
reset role;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
set local role authenticated;

select is(
  (select status from public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'RETOUCHING')),
  'RETOUCHING'::public.project_status,
  'SELECTION_SUBMITTED -> RETOUCHING'
);

select throws_ok(
  $$ select public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'PROOFING') $$,
  '23514', 'transition RETOUCHING -> PROOFING is not allowed',
  'a selection cannot be unlocked once retouching started'
);

select throws_ok(
  $$ select public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'DELIVERED') $$,
  '23514', '2 selected photos have no final file',
  'DELIVERED needs a final file for every selected photo'
);

reset role;
update public.photos set final_key = 'final/' || id, final_bytes = 1000 where is_selected;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
set local role authenticated;

select is(
  (select status from public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'DELIVERED')),
  'DELIVERED'::public.project_status,
  'RETOUCHING -> DELIVERED with all finals uploaded'
);

select is(
  (select status from public.transition_project_status('a0000000-0000-0000-0000-000000000001', 'COMPLETED')),
  'COMPLETED'::public.project_status,
  'DELIVERED -> COMPLETED'
);

select ok(
  (select delivered_at is not null and completed_at is not null from public.projects where id = 'a0000000-0000-0000-0000-000000000001'),
  'delivery and completion times are recorded'
);

select is(
  (select count(*)::integer from public.activity_events where type = 'project.status_changed'),
  9,
  'every successful transition is logged'
);

select is(
  (select actor_type from public.activity_events where payload ->> 'to' = 'COMPLETED'),
  'PHOTOGRAPHER'::public.actor_type,
  'members are recorded as the photographer regardless of p_actor'
);

select * from finish();
rollback;
