-- The shot list is now collected from the board instead of the old card lists.
--
-- At SHOOT_DAY transition_project_status copies every live Look and every image outside
-- a Look that has "In shot list" on and a status of APPROVED or PENDING (the client
-- agreed or did not answer). A Look becomes one shot with a collage of its images. The
-- card's gear and technique come along; the visibility is copied so the client's
-- shoot screen (step 10) can hide the studio's private shots.

alter table public.shot_list_items
  drop constraint shot_list_items_one_per_concept,
  drop column concept_item_id,
  add column board_item_id uuid references public.board_items (id) on delete set null,
  add column technique_note text check (char_length(technique_note) <= 2000),
  add column collage_keys text[] not null default '{}' check (cardinality(collage_keys) <= 4),
  add column visibility public.board_visibility not null default 'EVERYONE',
  add constraint shot_list_items_one_per_card unique (project_id, board_item_id);

create table public.shot_list_item_gear (
  shot_list_item_id uuid not null references public.shot_list_items (id) on delete cascade,
  gear_id uuid not null references public.gear_items (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (shot_list_item_id, gear_id)
);

create index shot_list_item_gear_gear_idx on public.shot_list_item_gear (gear_id);

-- RLS in the same migration as the table.
alter table public.shot_list_item_gear enable row level security;

create policy shot_list_item_gear_member_all on public.shot_list_item_gear
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));

create function private.shot_list_item_gear_from_shot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select s.project_id, s.workspace_id into new.project_id, new.workspace_id
  from public.shot_list_items s
  where s.id = new.shot_list_item_id;
  if new.project_id is null then
    raise exception 'shot % does not exist', new.shot_list_item_id using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger shot_list_item_gear_a_shot before insert or update on public.shot_list_item_gear
  for each row execute function private.shot_list_item_gear_from_shot();
create trigger shot_list_item_gear_b_check before insert or update on public.shot_list_item_gear
  for each row execute function private.check_gear_workspace();

-- A card purged from the trash frees its files, unless another card or a shot still
-- uses them. The media_files delete gives the space back and queues the R2 object.
create function private.board_items_release_files()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.media_files m
  where m.object_key in (old.image_key, old.thumb_key)
    and m.purpose = 'BOARD'
    and not exists (
      select 1 from public.board_items b where b.image_key = m.object_key or b.thumb_key = m.object_key
    )
    and not exists (
      select 1 from public.shot_list_items s
      where s.reference_image_key = m.object_key or m.object_key = any (s.collage_keys)
    );
  return null;
end;
$$;

create trigger board_items_release_files after delete on public.board_items
  for each row execute function private.board_items_release_files();

-- ---------------------------------------------------------------------------
-- transition_project_status: same rules, SHOOT_DAY now collects from the board.
-- ---------------------------------------------------------------------------

create or replace function public.transition_project_status(
  p_project_id uuid,
  p_to public.project_status,
  p_actor public.actor_type default null
)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects;
  v_from public.project_status;
  v_count integer;
begin
  select * into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'project not found' using errcode = 'no_data_found';
  end if;

  if not private.is_privileged_caller()
     and not private.is_workspace_member(v_project.workspace_id) then
    -- Same answer as for a missing project: do not reveal that it exists.
    raise exception 'project not found' using errcode = 'no_data_found';
  end if;

  v_from := v_project.status;

  if not (
       (v_from = 'DRAFT'               and p_to = 'PLANNING')
    or (v_from = 'PLANNING'            and p_to = 'SHOOT_DAY')
    or (v_from = 'SHOOT_DAY'           and p_to = 'PROOFING')
    or (v_from = 'PROOFING'            and p_to = 'SELECTION_SUBMITTED')
    or (v_from = 'SELECTION_SUBMITTED' and p_to = 'PROOFING')
    or (v_from = 'SELECTION_SUBMITTED' and p_to = 'RETOUCHING')
    or (v_from = 'RETOUCHING'          and p_to = 'DELIVERED')
    or (v_from = 'DELIVERED'           and p_to = 'COMPLETED')
  ) then
    raise exception 'transition % -> % is not allowed', v_from, p_to
      using errcode = 'check_violation', hint = 'invalid_transition';
  end if;

  -- Preconditions -------------------------------------------------------------

  if p_to = 'PLANNING' then
    if v_project.shoot_start is null
       or coalesce(v_project.location_name, v_project.location_address) is null then
      raise exception 'shoot date and location are required'
        using errcode = 'check_violation', hint = 'missing_date_or_location';
    end if;
  end if;

  if p_to = 'PROOFING' and v_from = 'SHOOT_DAY' then
    select count(*) into v_count from public.photos where project_id = p_project_id;
    if v_count = 0 then
      raise exception 'upload at least one preview first'
        using errcode = 'check_violation', hint = 'no_previews';
    end if;
  end if;

  if p_to = 'SELECTION_SUBMITTED' then
    select count(*) into v_count
    from public.photos
    where project_id = p_project_id and is_selected and selection_type = 'INCLUDED';
    if v_count = 0 then
      raise exception 'select at least one photo'
        using errcode = 'check_violation', hint = 'empty_selection';
    end if;
    if v_count > v_project.retouch_limit then
      raise exception 'selection exceeds the retouch limit of %', v_project.retouch_limit
        using errcode = 'check_violation', hint = 'over_limit';
    end if;
  end if;

  if p_to = 'DELIVERED' then
    select count(*) into v_count
    from public.photos
    where project_id = p_project_id and is_selected and final_key is null;
    if v_count > 0 then
      raise exception '% selected photos have no final file', v_count
        using errcode = 'check_violation', hint = 'missing_finals';
    end if;
  end if;

  -- Side effects --------------------------------------------------------------

  if p_to = 'SHOOT_DAY' then
    -- Looks and images outside looks that the client approved or left unanswered and
    -- that are marked "In shot list". Cards already collected are not duplicated; the
    -- photographer's own shots are kept. Order: the board's feed order (a card inside
    -- a section follows the section).
    with picked as (
      select
        b.*,
        coalesce(parent.sort_order, b.sort_order) as group_order
      from public.board_items b
      left join public.board_items parent on parent.id = b.parent_id
      where b.project_id = p_project_id
        and b.deleted_at is null
        and b.in_shot_list
        and b.status in ('APPROVED', 'PENDING')
    ),
    inserted as (
      insert into public.shot_list_items (
        project_id, workspace_id, board_item_id, title, description, reference_image_key,
        collage_keys, technique_note, visibility, sort_order
      )
      select
        p.project_id,
        p.workspace_id,
        p.id,
        p.title,
        p.body,
        case when p.kind = 'IMAGE' then p.image_key end,
        case
          when p.kind = 'GROUP' then coalesce((
            select array_agg(coalesce(c.thumb_key, c.image_key) order by c.sort_order, c.created_at)
            from (
              select * from public.board_items c
              where c.parent_id = p.id and c.kind = 'IMAGE' and c.deleted_at is null and c.image_key is not null
              order by c.sort_order, c.created_at
              limit 4
            ) c
          ), '{}')
          else '{}'
        end,
        p.technique_note,
        p.visibility,
        row_number() over (order by p.group_order, p.sort_order, p.created_at)::integer
      from picked p
      on conflict (project_id, board_item_id) do nothing
      returning id, board_item_id
    )
    insert into public.shot_list_item_gear (shot_list_item_id, gear_id, project_id, workspace_id)
    select i.id, g.gear_id, g.project_id, g.workspace_id
    from inserted i
    join public.board_item_gear g on g.board_item_id = i.board_item_id;
  end if;

  update public.projects
  set
    status = p_to,
    selection_submitted_at = case
      when p_to = 'SELECTION_SUBMITTED' then now()
      when p_to = 'PROOFING' and v_from = 'SELECTION_SUBMITTED' then null
      else selection_submitted_at
    end,
    delivered_at = case when p_to = 'DELIVERED' then now() else delivered_at end,
    completed_at = case when p_to = 'COMPLETED' then now() else completed_at end
  where id = p_project_id
  returning * into v_project;

  insert into public.activity_events (project_id, workspace_id, type, actor_type, payload)
  values (
    p_project_id,
    v_project.workspace_id,
    'project.status_changed',
    case
      when private.is_privileged_caller() then coalesce(p_actor, 'SYSTEM')
      else 'PHOTOGRAPHER'
    end::public.actor_type,
    jsonb_build_object('from', v_from, 'to', p_to)
  );

  return v_project;
end;
$$;
