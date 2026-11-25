-- Google coordinates on place cards are cleared after 30 days; the place ID stays.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000c8', 'c8@example.test', '{"provision":false}');
insert into public.profiles (id, name) values ('00000000-0000-0000-0000-0000000000c8', 'Photographer C8');
insert into public.workspaces (id, name, plan_id)
select '0000000c-0000-0000-0000-000000000008', 'Studio C8', id from public.plans where code = 'free';
insert into public.projects (id, workspace_id, title) values
  ('c8000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000008', 'Places shoot');

-- 1: synced 40 days ago.  2: synced yesterday.  3: no sync time.  4: typed by hand.
insert into public.board_items (id, project_id, workspace_id, kind, title, payload) values
  ('c8100000-0000-0000-0000-000000000001', 'c8000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000008', 'LOCATION', 'Old',
   jsonb_build_object('place_id', 'ChIJ-old', 'lat', 35.7, 'lng', -78.6, 'timezone', 'America/New_York', 'synced_at', now() - interval '40 days')),
  ('c8100000-0000-0000-0000-000000000002', 'c8000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000008', 'LOCATION', 'Fresh',
   jsonb_build_object('place_id', 'ChIJ-fresh', 'lat', 35.7, 'lng', -78.6, 'synced_at', now() - interval '1 day')),
  ('c8100000-0000-0000-0000-000000000003', 'c8000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000008', 'LOCATION', 'Unknown age',
   jsonb_build_object('place_id', 'ChIJ-unknown', 'lat', 35.7, 'lng', -78.6)),
  ('c8100000-0000-0000-0000-000000000004', 'c8000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000008', 'LOCATION', 'By hand',
   '{}');

select is(private.purge_stale_board_place_coords(), 2, 'the old and the undated coordinates are cleared');
select is(
  (select payload from public.board_items where id = 'c8100000-0000-0000-0000-000000000001') - 'synced_at',
  '{"place_id": "ChIJ-old", "timezone": "America/New_York"}'::jsonb,
  'the place ID and time zone stay, the coordinates go'
);
select is(
  (select payload ->> 'lat' from public.board_items where id = 'c8100000-0000-0000-0000-000000000002'),
  '35.7',
  'coordinates synced yesterday stay'
);
select is(private.purge_stale_board_place_coords(), 0, 'a second run has nothing to clear');
select is(
  (select schedule from cron.job where jobname = 'purge-stale-board-place-coords'),
  '19 3 * * *',
  'the nightly clean-up is scheduled'
);

select * from finish();
rollback;
