-- Coordinates from Google Places are cleared after 30 days; everything else stays.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000c1', 'c@example.test', '{"provision":false}');
insert into public.workspaces (id, name, plan_id)
select '0000000c-0000-0000-0000-000000000000', 'Studio C', id from public.plans where code = 'free';

insert into public.projects (id, workspace_id, title, google_place_id, location_lat, location_lng, place_synced_at) values
  -- Synced 40 days ago: must be cleared.
  ('c1000000-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000000', 'Old sync', 'ChIJold', 35.77, -78.65, now() - interval '40 days'),
  -- Synced yesterday: stays.
  ('c1000000-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000000', 'Fresh sync', 'ChIJfresh', 35.77, -78.65, now() - interval '1 day'),
  -- Typed by hand, no place ID: never touched, however old.
  ('c1000000-0000-0000-0000-000000000003', '0000000c-0000-0000-0000-000000000000', 'Own coordinates', null, 57.15, 65.53, now() - interval '400 days');

-- Tests ------------------------------------------------------------------------

select is(private.purge_stale_place_coords(), 1, 'one project had stale Google coordinates');

select is(
  (select location_lat from public.projects where id = 'c1000000-0000-0000-0000-000000000001'),
  null,
  'stale latitude is cleared'
);
select is(
  (select location_lng from public.projects where id = 'c1000000-0000-0000-0000-000000000001'),
  null,
  'stale longitude is cleared'
);
select is(
  (select google_place_id from public.projects where id = 'c1000000-0000-0000-0000-000000000001'),
  'ChIJold',
  'the place ID is kept, so the app can fetch fresh coordinates'
);
select is(
  (select location_lat from public.projects where id = 'c1000000-0000-0000-0000-000000000002'),
  35.77::double precision,
  'fresh coordinates stay'
);
select is(
  (select location_lat from public.projects where id = 'c1000000-0000-0000-0000-000000000003'),
  57.15::double precision,
  'coordinates without a place ID stay'
);

select is(private.purge_stale_place_coords(), 0, 'a second run has nothing to do');

select is(
  (select schedule from cron.job where jobname = 'purge-stale-place-coords'),
  '17 3 * * *',
  'the nightly job is scheduled'
);

select * from finish();
rollback;