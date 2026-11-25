-- Place cards keep a Google place like projects do (20261105000100): the place ID for as
-- long as we like, the coordinates for at most 30 days (Google Places terms). The board
-- page refreshes old coordinates by place ID when it is shown; this nightly job clears
-- the ones nobody refreshed in time. A place typed by hand has no coordinates at all.

create function private.purge_stale_board_place_coords()
returns integer
language sql
security definer
set search_path = ''
as $$
  with cleared as (
    update public.board_items
    set payload = payload - 'lat' - 'lng'
    where kind = 'LOCATION'
      and payload ? 'place_id'
      and (payload ? 'lat' or payload ? 'lng')
      and (
        not payload ? 'synced_at'
        or (payload ->> 'synced_at')::timestamptz < now() - interval '30 days'
      )
    returning 1
  )
  select count(*)::integer from cleared;
$$;

comment on function private.purge_stale_board_place_coords() is
  'Clears Google coordinates on place cards older than 30 days (Places terms). Nightly via pg_cron.';

revoke all on function private.purge_stale_board_place_coords() from public;

select cron.schedule('purge-stale-board-place-coords', '19 3 * * *', 'select private.purge_stale_board_place_coords()');
