-- The only way to change public.projects.status.
--
-- DRAFT -> PLANNING -> SHOOT_DAY -> PROOFING -> SELECTION_SUBMITTED -> RETOUCHING
--       -> DELIVERED -> COMPLETED, plus one way back:
-- SELECTION_SUBMITTED -> PROOFING (the photographer unlocks the selection).
--
-- Callers:
--   * a signed-in member of the project's workspace (photographer UI);
--   * the service role (client portal handlers, cron jobs) or a direct database session.

create function private.is_privileged_caller()
returns boolean
language sql
stable
set search_path = ''
as $$
  -- current_setting('role') reflects SET ROLE as issued by PostgREST/Supabase and is not
  -- changed by SECURITY DEFINER. 'none' means a direct session (migrations, pg_cron).
  select coalesce(nullif(current_setting('role', true), ''), 'none') in ('service_role', 'none');
$$;

create function public.transition_project_status(
  p_project_id uuid,
  p_to public.project_status,
  -- Who acted, recorded in the activity log. Only privileged callers may set it
  -- (the portal passes CLIENT); members are always recorded as PHOTOGRAPHER.
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
    -- Collect the day-of references: moodboard and wardrobe cards the client approved
    -- or left unanswered. Cards marked CHANGES_REQUESTED stay out. Already collected
    -- cards are not duplicated; the photographer's own shot list items are kept.
    insert into public.shot_list_items (
      project_id, workspace_id, concept_item_id, title, description, reference_image_key, sort_order
    )
    select
      c.project_id,
      c.workspace_id,
      c.id,
      c.title,
      c.description,
      c.image_key,
      row_number() over (order by c.category, c.sort_order, c.created_at)::integer
    from public.concept_items c
    where c.project_id = p_project_id
      and c.category in ('MOODBOARD', 'WARDROBE')
      and c.visible_to_client
      and c.status in ('APPROVED', 'PENDING')
    on conflict (project_id, concept_item_id) do nothing;
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

comment on function public.transition_project_status(uuid, public.project_status, public.actor_type) is
  'Moves a project to the next status, checking allowed transitions and preconditions.';

revoke all on function public.transition_project_status(uuid, public.project_status, public.actor_type) from public, anon;
grant execute on function public.transition_project_status(uuid, public.project_status, public.actor_type)
  to authenticated, service_role;

revoke all on function private.is_privileged_caller() from public;
grant execute on function private.is_privileged_caller() to authenticated, service_role;
