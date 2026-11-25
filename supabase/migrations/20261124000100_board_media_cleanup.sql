-- Board photos are uploaded first and become a card afterwards. If the browser stops in
-- between (the tab is closed, the card is refused), finished BOARD files are left that
-- no card or shot uses. They still count in the studio's storage, so once a night the
-- ones older than a day are removed. Deleting the row gives the space back and queues
-- the R2 object for /api/cron/storage-cleanup (trigger media_files_queue_deletion).

create function private.purge_orphan_board_media()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.media_files m
    where m.purpose = 'BOARD'
      and m.status = 'READY'
      and m.created_at < now() - interval '1 day'
      and not exists (
        select 1 from public.board_items b where b.image_key = m.object_key or b.thumb_key = m.object_key
      )
      and not exists (
        select 1 from public.shot_list_items s
        where s.reference_image_key = m.object_key or m.object_key = any (s.collage_keys)
      )
    returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function private.purge_orphan_board_media() from public;

select cron.schedule('purge-orphan-board-media', '53 3 * * *', 'select private.purge_orphan_board_media()');