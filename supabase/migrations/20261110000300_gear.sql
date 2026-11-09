-- The studio's gear and the project's packing list.
--
--   gear_items       "My kit": the studio's own base of lenses, cameras, lights and
--                    modifiers, filled once and used in every project.
--   board_item_gear  lenses (or any gear) chosen for a Look or an image on the board.
--   project_gear     the project's packing list: AUTO rows follow the gear chosen on the
--                    board, MANUAL rows are added by the photographer (from the kit or
--                    typed by hand). "Packed" is a tick per row.
--
-- Gear and technique are for the studio only: the client and the team never get them.

create type public.gear_kind as enum ('LENS', 'CAMERA', 'LIGHT', 'MODIFIER', 'OTHER');
create type public.gear_source as enum ('AUTO', 'MANUAL');

create table public.gear_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.gear_kind not null,
  name text not null check (char_length(name) between 1 and 120),
  notes text check (char_length(notes) <= 500),
  sort_order integer not null default 0,
  -- Hidden from pickers but kept in old projects.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index gear_items_name_idx on public.gear_items (workspace_id, kind, lower(name)) where archived_at is null;

create table public.board_item_gear (
  board_item_id uuid not null references public.board_items (id) on delete cascade,
  gear_id uuid not null references public.gear_items (id) on delete cascade,
  -- Copied from the card by a trigger.
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_item_id, gear_id)
);

create index board_item_gear_project_idx on public.board_item_gear (project_id, gear_id);
create index board_item_gear_gear_idx on public.board_item_gear (gear_id);

create table public.project_gear (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  gear_id uuid references public.gear_items (id) on delete cascade,
  custom_name text check (char_length(custom_name) between 1 and 120),
  custom_kind public.gear_kind,
  source public.gear_source not null default 'MANUAL',
  is_packed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_gear_one_target check ((gear_id is null) <> (custom_name is null)),
  constraint project_gear_custom_kind check ((custom_name is null) = (custom_kind is null)),
  constraint project_gear_auto_from_kit check (source = 'MANUAL' or gear_id is not null),
  constraint project_gear_once unique (project_id, gear_id)
);

create index project_gear_project_idx on public.project_gear (project_id, sort_order);

-- RLS in the same migration as the tables.
alter table public.gear_items enable row level security;
alter table public.board_item_gear enable row level security;
alter table public.project_gear enable row level security;

create policy gear_items_member_all on public.gear_items
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy board_item_gear_member_all on public.board_item_gear
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy project_gear_member_all on public.project_gear
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));

-- AUTO rows are written only by the trigger below.
revoke insert on public.project_gear from authenticated;
grant insert (id, project_id, workspace_id, gear_id, custom_name, custom_kind, is_packed, sort_order)
  on public.project_gear to authenticated;
revoke update on public.project_gear from authenticated;
grant update (custom_name, custom_kind, is_packed, sort_order) on public.project_gear to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger gear_items_updated_at before update on public.gear_items
  for each row execute function private.set_updated_at();
create trigger project_gear_updated_at before update on public.project_gear
  for each row execute function private.set_updated_at();
create trigger project_gear_a_workspace before insert or update of project_id, workspace_id on public.project_gear
  for each row execute function private.set_workspace_from_project();

-- Gear must come from the project's own studio.
create function private.check_gear_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.gear_id is not null and not exists (
    select 1 from public.gear_items g where g.id = new.gear_id and g.workspace_id = new.workspace_id
  ) then
    raise exception 'gear must belong to the same studio'
      using errcode = 'check_violation', hint = 'bad_gear';
  end if;
  return new;
end;
$$;

create trigger project_gear_b_check before insert or update of gear_id, workspace_id on public.project_gear
  for each row execute function private.check_gear_workspace();

-- A card's gear: project and studio come from the card; only a Look or an image takes gear.
create function private.board_item_gear_from_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.board_items;
begin
  select * into v_item from public.board_items where id = new.board_item_id;
  if not found then
    raise exception 'card % does not exist', new.board_item_id using errcode = 'foreign_key_violation';
  end if;
  if not ((v_item.kind = 'GROUP' and v_item.group_role = 'LOOK') or v_item.kind = 'IMAGE') then
    raise exception 'gear can be chosen only for a look or an image'
      using errcode = 'check_violation', hint = 'gear_not_allowed';
  end if;
  new.project_id := v_item.project_id;
  new.workspace_id := v_item.workspace_id;
  return new;
end;
$$;

create trigger board_item_gear_a_card before insert or update on public.board_item_gear
  for each row execute function private.board_item_gear_from_card();
create trigger board_item_gear_b_check before insert or update on public.board_item_gear
  for each row execute function private.check_gear_workspace();

-- Keeps the AUTO rows of a project's packing list equal to the gear on its live cards.
create function private.sync_project_gear(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_gear (project_id, workspace_id, gear_id, source)
  select distinct b.project_id, b.workspace_id, g.gear_id, 'AUTO'::public.gear_source
  from public.board_item_gear g
  join public.board_items b on b.id = g.board_item_id
  where b.project_id = p_project_id and b.deleted_at is null
  on conflict (project_id, gear_id) do nothing;

  delete from public.project_gear pg
  where pg.project_id = p_project_id
    and pg.source = 'AUTO'
    and not exists (
      select 1
      from public.board_item_gear g
      join public.board_items b on b.id = g.board_item_id
      where b.project_id = p_project_id and b.deleted_at is null and g.gear_id = pg.gear_id
    );
end;
$$;

revoke all on function private.sync_project_gear(uuid) from public;

create function private.board_item_gear_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_project_gear(coalesce(new.project_id, old.project_id));
  return null;
end;
$$;

create trigger board_item_gear_sync after insert or update or delete on public.board_item_gear
  for each row execute function private.board_item_gear_sync();

-- Trashing or restoring a card changes which gear is still in use.
create trigger board_items_gear_sync after update of deleted_at on public.board_items
  for each row when (new.deleted_at is distinct from old.deleted_at)
  execute function private.board_item_gear_sync();
