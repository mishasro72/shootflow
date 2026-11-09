-- The project board: reviews, nesting, images, trash, gear and pinned comments.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(39);

-- Fixtures: studio E with two projects, studio F with its own lens ----------------

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'e@example.test', '{"provision":false}'),
  ('00000000-0000-0000-0000-0000000000f1', 'f@example.test', '{"provision":false}');
insert into public.profiles (id, name) values
  ('00000000-0000-0000-0000-0000000000e1', 'Photographer E'),
  ('00000000-0000-0000-0000-0000000000f1', 'Photographer F');
insert into public.workspaces (id, name, plan_id)
select v.id, v.name, p.id
from (values ('0000000e-0000-0000-0000-000000000000'::uuid, 'Studio E'), ('0000000f-0000-0000-0000-000000000000'::uuid, 'Studio F')) as v (id, name)
cross join (select id from public.plans where code = 'free') as p;
insert into public.workspace_members (workspace_id, user_id) values
  ('0000000e-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000e1'),
  ('0000000f-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000f1');
insert into public.projects (id, workspace_id, title) values
  ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'Board shoot'),
  ('e1000000-0000-0000-0000-000000000002', '0000000e-0000-0000-0000-000000000000', 'Other shoot');

-- Uploads: a finished board image, a private file, an unfinished upload, an image of the
-- other project.
insert into public.media_files (id, project_id, workspace_id, file_name, content_type, size_bytes, purpose) values
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'ref.jpg',   'image/jpeg', 300, 'BOARD'),
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'brief.pdf', 'application/pdf', 50, 'FILE'),
  ('e2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'half.jpg',  'image/jpeg', 70, 'BOARD'),
  ('e2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000002', '0000000e-0000-0000-0000-000000000000', 'other.jpg', 'image/jpeg', 80, 'BOARD');
update public.media_files set status = 'READY', uploaded_at = now() where id <> 'e2000000-0000-0000-0000-000000000003';

create temporary table k as
select id, object_key from public.media_files where workspace_id = '0000000e-0000-0000-0000-000000000000';
grant select on k to authenticated;

insert into public.gear_items (id, workspace_id, kind, name) values
  ('e3000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'LENS', '85mm'),
  ('e3000000-0000-0000-0000-000000000002', '0000000e-0000-0000-0000-000000000000', 'LIGHT', 'Softbox'),
  ('f3000000-0000-0000-0000-000000000001', '0000000f-0000-0000-0000-000000000000', 'LENS', 'F''s 50mm');

-- As photographer E ------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
set local role authenticated;

insert into public.board_items (id, project_id, workspace_id, kind, group_role, title, sort_order) values
  ('e4000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'GROUP', 'LOOK', 'Look 1', 1),
  ('e4000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'GROUP', 'SECTION', 'Light', 2);
insert into public.board_items (id, project_id, workspace_id, kind, title, image_key, sort_order) values
  ('e4000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'IMAGE', 'Ref', (select object_key from k where id = 'e2000000-0000-0000-0000-000000000001'), 3);
insert into public.board_items (id, project_id, workspace_id, kind, title, sort_order) values
  ('e4000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'NOTE', 'Bring a fan', 4);

-- Reviews ----------------------------------------------------------------------------

select is((select status from public.board_items where id = 'e4000000-0000-0000-0000-000000000001'), 'PENDING'::public.review_status, 'a look waits for review');
select is((select status from public.board_items where id = 'e4000000-0000-0000-0000-000000000003'), 'PENDING'::public.review_status, 'an image on its own waits for review');
select is((select status from public.board_items where id = 'e4000000-0000-0000-0000-000000000004'), null, 'a note is not reviewed');
select is((select status from public.board_items where id = 'e4000000-0000-0000-0000-000000000002'), null, 'a section is not reviewed');

update public.board_items set parent_id = 'e4000000-0000-0000-0000-000000000001' where id = 'e4000000-0000-0000-0000-000000000003';
select is((select status from public.board_items where id = 'e4000000-0000-0000-0000-000000000003'), null, 'an image moved into a look is reviewed with the look');

update public.board_items set group_role = 'SECTION' where id = 'e4000000-0000-0000-0000-000000000001';
select is((select status from public.board_items where id = 'e4000000-0000-0000-0000-000000000003'), 'PENDING'::public.review_status, 'when a look becomes a section, its images get their own review');
select is((select status from public.board_items where id = 'e4000000-0000-0000-0000-000000000001'), null, 'a section has no review');
update public.board_items set group_role = 'LOOK' where id = 'e4000000-0000-0000-0000-000000000001';

select lives_ok(
  $$ update public.board_items set title = 'Look one', technique_note = 'f/2', visibility = 'TEAM', x = 10, y = 20 where id = 'e4000000-0000-0000-0000-000000000001' $$,
  'the photographer edits a card'
);

-- Structure --------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind, parent_id) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'NOTE', 'e4000000-0000-0000-0000-000000000004') $$,
  '23514', 'parent must be a group of the same project', 'only a group can hold cards'
);
select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind, parent_id) values ('e1000000-0000-0000-0000-000000000002', '0000000e-0000-0000-0000-000000000000', 'NOTE', 'e4000000-0000-0000-0000-000000000002') $$,
  '23514', 'parent must be a group of the same project', 'a card cannot sit in another project''s group'
);
select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind, group_role, parent_id) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'GROUP', 'SECTION', 'e4000000-0000-0000-0000-000000000001') $$,
  '23514', 'a group can only be placed in a top-level section', 'a look never holds a group'
);
select lives_ok(
  $$ insert into public.board_items (id, project_id, workspace_id, kind, group_role, parent_id, title) values ('e4000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'GROUP', 'LOOK', 'e4000000-0000-0000-0000-000000000002', 'Look in a section') $$,
  'a look can sit in a section'
);
select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind, group_role, parent_id) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'GROUP', 'SECTION', 'e4000000-0000-0000-0000-000000000005') $$,
  '23514', 'a group can only be placed in a top-level section', 'nesting stops at two levels'
);
select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'GROUP') $$,
  '23514', null, 'a group needs a role'
);

-- Images -----------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind, image_key) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'IMAGE', (select object_key from k where id = 'e2000000-0000-0000-0000-000000000002')) $$,
  '23514', 'image must be a finished board upload of this project', 'a private file cannot be put on the board directly'
);
select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind, image_key) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'IMAGE', (select object_key from k where id = 'e2000000-0000-0000-0000-000000000003')) $$,
  '23514', 'image must be a finished board upload of this project', 'an unfinished upload cannot be used'
);
select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind, image_key) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'IMAGE', (select object_key from k where id = 'e2000000-0000-0000-0000-000000000004')) $$,
  '23514', 'image must be a finished board upload of this project', 'another project''s image cannot be used'
);
select throws_ok(
  $$ insert into public.board_items (project_id, workspace_id, kind, image_key) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'IMAGE', 'ws/0000000e-0000-0000-0000-000000000000/projects/x/files/made-up') $$,
  '23514', 'image must be a finished board upload of this project', 'a made-up key is rejected'
);

-- Gear -------------------------------------------------------------------------------

insert into public.board_item_gear (board_item_id, gear_id, project_id, workspace_id) values
  ('e4000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000'),
  ('e4000000-0000-0000-0000-000000000005', 'e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000');
insert into public.project_gear (project_id, workspace_id, gear_id) values
  ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'e3000000-0000-0000-0000-000000000002');
insert into public.project_gear (project_id, workspace_id, custom_name, custom_kind) values
  ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'Fan', 'OTHER');

select is(
  (select count(*)::integer from public.project_gear where project_id = 'e1000000-0000-0000-0000-000000000001' and source = 'AUTO'),
  1,
  'a lens chosen on two cards is packed once'
);

delete from public.board_item_gear where board_item_id = 'e4000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::integer from public.project_gear where gear_id = 'e3000000-0000-0000-0000-000000000001'),
  1,
  'the lens stays while another card still uses it'
);

update public.board_items set deleted_at = now() where id = 'e4000000-0000-0000-0000-000000000005';
select is(
  (select count(*)::integer from public.project_gear where gear_id = 'e3000000-0000-0000-0000-000000000001'),
  0,
  'the lens leaves the packing list when no live card uses it'
);
update public.board_items set deleted_at = null where id = 'e4000000-0000-0000-0000-000000000005';
select is(
  (select count(*)::integer from public.project_gear where gear_id = 'e3000000-0000-0000-0000-000000000001'),
  1,
  'restoring the card brings the lens back'
);
select is(
  (select count(*)::integer from public.project_gear where project_id = 'e1000000-0000-0000-0000-000000000001' and source = 'MANUAL'),
  2,
  'items added by hand stay whatever the cards say'
);

select throws_ok(
  $$ insert into public.board_item_gear (board_item_id, gear_id, project_id, workspace_id) values ('e4000000-0000-0000-0000-000000000004', 'e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000') $$,
  '23514', 'gear can be chosen only for a look or an image', 'a note takes no gear'
);
select throws_ok(
  $$ insert into public.board_item_gear (board_item_id, gear_id, project_id, workspace_id) values ('e4000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000') $$,
  '23514', 'gear must belong to the same studio', 'another studio''s lens cannot be chosen'
);

-- Comments ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into public.comments (project_id, workspace_id, board_item_id, author_type, author_name, text, pin_x, pin_y) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'e4000000-0000-0000-0000-000000000003', 'PHOTOGRAPHER', 'E', 'Light from here', 0.25, 0.4) $$,
  'a comment can be pinned to a point of an image'
);
select throws_ok(
  $$ insert into public.comments (project_id, workspace_id, board_item_id, author_type, author_name, text, pin_x, pin_y) values ('e1000000-0000-0000-0000-000000000001', '0000000e-0000-0000-0000-000000000000', 'e4000000-0000-0000-0000-000000000004', 'PHOTOGRAPHER', 'E', 'Here', 0.5, 0.5) $$,
  '23514', 'only images can carry pinned comments', 'a note cannot carry pins'
);
select throws_ok(
  $$ insert into public.comments (project_id, workspace_id, board_item_id, author_type, author_name, text) values ('e1000000-0000-0000-0000-000000000002', '0000000e-0000-0000-0000-000000000000', 'e4000000-0000-0000-0000-000000000003', 'PHOTOGRAPHER', 'E', 'Wrong project') $$,
  '23514', 'comment target must belong to the same project', 'a comment stays in the card''s project'
);

-- Trash ------------------------------------------------------------------------------

-- The image is trashed on its own; then the section with a look inside goes.
update public.board_items set deleted_at = now() - interval '1 hour' where id = 'e4000000-0000-0000-0000-000000000003';
update public.board_items set deleted_at = now() where id = 'e4000000-0000-0000-0000-000000000002';
select is(
  (select deleted_at is not null from public.board_items where id = 'e4000000-0000-0000-0000-000000000005'),
  true,
  'trashing a section trashes the cards inside'
);
update public.board_items set deleted_at = null where id = 'e4000000-0000-0000-0000-000000000002';
select is(
  (select deleted_at from public.board_items where id = 'e4000000-0000-0000-0000-000000000005'),
  null,
  'restoring the section restores what was trashed with it'
);

update public.board_items set parent_id = null where id = 'e4000000-0000-0000-0000-000000000003';

-- As the server: the client's review and the nightly jobs ------------------------------

reset role;
set local role service_role;

select lives_ok(
  $$ update public.board_items set status = 'APPROVED' where id = 'e4000000-0000-0000-0000-000000000001' $$,
  'the portal records the client''s answer on a look'
);
select isnt(
  (select status_changed_at from public.board_items where id = 'e4000000-0000-0000-0000-000000000001'),
  null,
  'the time of the answer is kept'
);
select throws_ok(
  $$ update public.board_items set status = 'APPROVED' where id = 'e4000000-0000-0000-0000-000000000004' $$,
  '23514', 'only a look or an image outside a look can be reviewed', 'a note cannot be approved'
);

reset role;
set local request.jwt.claims to '';

-- The image was trashed 31 days ago; it is purged with its file.
update public.board_items set deleted_at = now() - interval '31 days' where id = 'e4000000-0000-0000-0000-000000000003';
select is(
  (select storage_used_bytes from public.workspaces where id = '0000000e-0000-0000-0000-000000000000'),
  430::bigint,
  'before the purge: the board image, the brief and the other project''s image count'
);
select is(private.purge_board_trash(), 1, 'a card trashed more than 30 days ago is purged');
select is(
  (select count(*)::integer from public.media_files where id = 'e2000000-0000-0000-0000-000000000001'),
  0,
  'the purged card''s image file is released'
);
select is(
  (select storage_used_bytes from public.workspaces where id = '0000000e-0000-0000-0000-000000000000'),
  130::bigint,
  'its space is given back'
);
select ok(
  exists (select 1 from public.storage_deletions where object_key = (select object_key from k where id = 'e2000000-0000-0000-0000-000000000001')),
  'its R2 object is queued for deletion'
);
select is(
  (select schedule from cron.job where jobname = 'purge-board-trash'),
  '29 3 * * *',
  'the nightly trash purge is scheduled'
);

select * from finish();
rollback;
