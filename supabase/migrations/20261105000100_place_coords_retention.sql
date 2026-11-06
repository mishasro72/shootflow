-- Google Places terms: place IDs may be kept indefinitely, coordinates from Places
-- for at most 30 days. The app refreshes coordinates by place ID when it shows a
-- project (place_synced_at says how old they are); this nightly job clears the ones
-- nobody refreshed in time. Coordinates without a place ID are the photographer's own
-- and are never touched.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.purge_stale_place_coords()
returns integer
language sql
security definer
set search_path = ''
as $$
  with cleared as (
    update public.projects
    set location_lat = null,
        location_lng = null
    where google_place_id is not null
      and location_lat is not null
      and (place_synced_at is null or place_synced_at < now() - interval '30 days')
    returning 1
  )
  select count(*)::integer from cleared;
$$;

comment on function private.purge_stale_place_coords() is
  'Clears Google coordinates older than 30 days (Places terms). Runs nightly via pg_cron; returns how many projects changed.';

revoke all on function private.purge_stale_place_coords() from public;

-- 03:17 UTC every day; a name makes re-running this migration replace the job, not add one.
select cron.schedule('purge-stale-place-coords', '17 3 * * *', 'select private.purge_stale_place_coords()');