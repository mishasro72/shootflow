-- On sign-up every photographer gets a profile and their own studio (workspace) on the
-- free plan, with themselves as OWNER. Runs inside the auth.users insert, so a user can
-- never exist without a workspace.
--
-- Fixtures that need fixed ids (seed, tests) opt out with raw_app_meta_data.provision = false.
-- raw_app_meta_data is set by the server only; users cannot change it at sign-up.

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_locale text;
  v_workspace_id uuid;
begin
  if coalesce(new.raw_app_meta_data ->> 'provision', 'true') = 'false' then
    return new;
  end if;

  v_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Photographer'
    ),
    120
  );

  v_locale := case
    when new.raw_user_meta_data ->> 'locale' in ('ru', 'en') then new.raw_user_meta_data ->> 'locale'
    else 'en'
  end;

  insert into public.profiles (id, name, email, locale)
  values (new.id, v_name, new.email, v_locale)
  on conflict (id) do nothing;

  insert into public.workspaces (name, plan_id, default_locale)
  select v_name, p.id, v_locale
  from public.plans p
  where p.code = 'free'
  returning id into v_workspace_id;

  if v_workspace_id is null then
    raise exception 'the free plan is missing';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'OWNER');

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep the profile email in step with auth when the user changes it.
create function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

revoke all on function private.handle_user_email_change() from public;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();
