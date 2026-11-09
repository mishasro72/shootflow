-- The project board replaces the three card lists of the first schema (moodboard,
-- wardrobe, equipment). One table holds every card; the desktop canvas and the phone
-- feed are two views of the same rows.
--
--   GROUP     a "Look" (LOOK, approved by the client as a whole) or a "Section"
--             (SECTION, just a heading); other cards sit inside through parent_id.
--   IMAGE     a photo reference (bytes in R2 through media_files, purpose BOARD).
--   PALETTE   colours in payload.colors.
--   NOTE      title and body.
--   LINK      payload.url, payload.site; title; image_key holds a copy of the page image.
--   LOCATION  payload with name, address, coordinates or a map link.
--
-- Reviews: only a Look, or an image that is not inside a Look, has a status the client
-- can change. Everything else has status null; a trigger keeps it that way.
-- Visibility: EVERYONE (client and team), TEAM (not the client), PRIVATE (only the
-- studio). Hidden cards are filtered on the server in the portal (step 8).
-- Trash: deleted_at; a nightly job removes cards trashed more than 30 days ago.

-- The first schema's cards had no UI yet, so there is no data to carry over.
drop table public.concept_items cascade;
drop function private.concept_items_defaults();
drop type public.concept_category;
alter type public.concept_status rename to review_status;

create type public.board_item_kind as enum ('GROUP', 'IMAGE', 'PALETTE', 'NOTE', 'LINK', 'LOCATION');
create type public.board_group_role as enum ('LOOK', 'SECTION');
create type public.board_visibility as enum ('EVERYONE', 'TEAM', 'PRIVATE');

create table public.board_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.board_item_kind not null,
  group_role public.board_group_role,
  group_color text check (group_color ~ '^#[0-9a-f]{6}$'),
  parent_id uuid references public.board_items (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  body text check (char_length(body) <= 4000),
  -- Keys of BOARD files of the same project (checked by a trigger).
  image_key text references public.media_files (object_key),
  thumb_key text references public.media_files (object_key),
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  -- Canvas geometry (step 7b) and the feed order.
  x real not null default 0,
  y real not null default 0,
  width real check (width > 0),
  height real check (height > 0),
  z integer not null default 0,
  sort_order integer not null default 0,
  status public.review_status,
  status_changed_at timestamptz,
  visibility public.board_visibility not null default 'EVERYONE',
  in_shot_list boolean not null default true,
  -- Aperture, light setup, notes for the photographer only (never sent to the portal).
  technique_note text check (char_length(technique_note) <= 2000),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_items_group_role check ((kind = 'GROUP') = (group_role is not null)),
  constraint board_items_not_own_parent check (parent_id is distinct from id),
  constraint board_items_image_kinds check (image_key is null or kind in ('IMAGE', 'LINK'))
);

comment on table public.board_items is 'Project board cards: groups (Look/Section), images, palettes, notes, links, locations.';

create index board_items_project_idx on public.board_items (project_id, sort_order) where deleted_at is null;
create index board_items_parent_idx on public.board_items (parent_id) where parent_id is not null;
create index board_items_trash_idx on public.board_items (deleted_at) where deleted_at is not null;
create index board_items_image_key_idx on public.board_items (image_key) where image_key is not null;
create index board_items_thumb_key_idx on public.board_items (thumb_key) where thumb_key is not null;

-- RLS in the same migration as the table.
alter table public.board_items enable row level security;

create policy board_items_member_all on public.board_items
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));

-- Photographers edit everything but the review: status is the client's answer and is
-- written only by the portal on the server (step 8).
revoke all on public.board_items from authenticated;
grant select, delete on public.board_items to authenticated;
grant insert (
  id, project_id, workspace_id, kind, group_role, group_color, parent_id, title, body, image_key, thumb_key,
  payload, x, y, width, height, z, sort_order, visibility, in_shot_list, technique_note
) on public.board_items to authenticated;
grant update (
  group_role, group_color, parent_id, title, body, image_key, thumb_key, payload, x, y, width, height, z,
  sort_order, visibility, in_shot_list, technique_note, deleted_at
) on public.board_items to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers (fire in name order)
-- ---------------------------------------------------------------------------

create trigger board_items_a_workspace before insert or update of project_id, workspace_id on public.board_items
  for each row execute function private.set_workspace_from_project();

create trigger board_items_updated_at before update on public.board_items
  for each row execute function private.set_updated_at();

-- Structure, files and review status of one card.
create function private.board_items_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.board_items;
  v_reviewable boolean;
  v_key text;
  v_media public.media_files;
begin
  -- Parent: a group of the same project. A group may sit only inside a top-level
  -- Section, so a Look never holds a group and nesting stays two levels deep.
  if new.parent_id is not null then
    select * into v_parent from public.board_items where id = new.parent_id;
    if not found or v_parent.project_id <> new.project_id or v_parent.kind <> 'GROUP' then
      raise exception 'parent must be a group of the same project'
        using errcode = 'check_violation', hint = 'bad_parent';
    end if;
    if new.kind = 'GROUP' and (v_parent.group_role <> 'SECTION' or v_parent.parent_id is not null) then
      raise exception 'a group can only be placed in a top-level section'
        using errcode = 'check_violation', hint = 'bad_parent';
    end if;
  end if;

  -- A group that holds groups cannot itself move into another group.
  if tg_op = 'UPDATE' and new.kind = 'GROUP' and new.parent_id is not null
     and exists (select 1 from public.board_items c where c.parent_id = new.id and c.kind = 'GROUP') then
    raise exception 'a section with groups inside cannot be nested'
      using errcode = 'check_violation', hint = 'bad_parent';
  end if;

  -- Files: only this project's BOARD uploads that finished.
  foreach v_key in array array_remove(array[new.image_key, new.thumb_key], null) loop
    select * into v_media from public.media_files where object_key = v_key;
    if not found or v_media.project_id <> new.project_id or v_media.purpose <> 'BOARD'
       or v_media.status <> 'READY' then
      raise exception 'image must be a finished board upload of this project'
        using errcode = 'check_violation', hint = 'bad_image';
    end if;
  end loop;

  -- Review: a Look, or an image outside a Look.
  v_reviewable := (new.kind = 'GROUP' and new.group_role = 'LOOK')
    or (new.kind = 'IMAGE' and (v_parent.id is null or v_parent.group_role <> 'LOOK'));

  if not v_reviewable then
    if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status is not null then
      raise exception 'only a look or an image outside a look can be reviewed'
        using errcode = 'check_violation', hint = 'not_reviewable';
    end if;
    new.status := null;
    new.status_changed_at := null;
  elsif new.status is null then
    new.status := 'PENDING';
  end if;

  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.status_changed_at := case when new.status is null then null else now() end;
  end if;

  return new;
end;
$$;

create trigger board_items_b_check
  before insert or update of kind, group_role, parent_id, image_key, thumb_key, status on public.board_items
  for each row execute function private.board_items_check();

-- When a group changes role or moves to the trash, its cards follow.
create function private.board_items_follow_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.group_role is distinct from old.group_role then
    -- Re-run the check on the children: images in a Look lose their own review.
    update public.board_items set parent_id = parent_id where parent_id = new.id;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    -- Trashed together, restored together: only children that shared the group's state.
    update public.board_items
    set deleted_at = new.deleted_at
    where parent_id = new.id and deleted_at is not distinct from old.deleted_at;
  end if;

  return null;
end;
$$;

create trigger board_items_follow_group after update of group_role, deleted_at on public.board_items
  for each row when (new.kind = 'GROUP') execute function private.board_items_follow_group();

-- ---------------------------------------------------------------------------
-- Comments now belong to board cards; photographers and clients can pin a comment
-- to a point of an image (pin_x, pin_y: 0..1 of the width and height).
-- ---------------------------------------------------------------------------

alter table public.comments
  drop constraint comments_single_target,
  drop column concept_item_id,
  add column board_item_id uuid references public.board_items (id) on delete cascade,
  add column pin_x real check (pin_x between 0 and 1),
  add column pin_y real check (pin_y between 0 and 1),
  add constraint comments_single_target check (num_nonnulls(board_item_id, photo_id) = 1),
  add constraint comments_pin_complete check ((pin_x is null) = (pin_y is null));

create index comments_board_item_idx on public.comments (board_item_id, created_at) where board_item_id is not null;

create function private.comments_check_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.board_items;
begin
  if new.board_item_id is not null then
    select * into v_item from public.board_items where id = new.board_item_id;
    if not found or v_item.project_id <> new.project_id then
      raise exception 'comment target must belong to the same project'
        using errcode = 'check_violation', hint = 'bad_target';
    end if;
    if new.pin_x is not null and v_item.kind <> 'IMAGE' then
      raise exception 'only images can carry pinned comments'
        using errcode = 'check_violation', hint = 'pin_not_image';
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_b_check_target before insert or update of project_id, board_item_id, pin_x, pin_y
  on public.comments
  for each row execute function private.comments_check_target();

-- ---------------------------------------------------------------------------
-- Trash: removed for good 30 days after deletion.
-- ---------------------------------------------------------------------------

create function private.purge_board_trash()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.board_items
    where deleted_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function private.purge_board_trash() from public;

select cron.schedule('purge-board-trash', '29 3 * * *', 'select private.purge_board_trash()');
